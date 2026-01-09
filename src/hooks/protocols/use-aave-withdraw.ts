'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from 'wagmi';
import { parseUnits, formatUnits, maxUint256, type Address } from 'viem';
import { AAVE_POOL_ABI } from '@/contracts/abis';
import { AAVE_POOL_ADDRESS, getTokenDecimals } from '@/contracts/addresses';

interface UseAaveWithdrawParams {
  tokenAddress: Address;
  tokenSymbol: string;
}

interface HealthFactorCheck {
  currentHealthFactor: number;
  projectedHealthFactor: number;
  isRisky: boolean;
  willLiquidate: boolean;
}

type WithdrawStep = 'idle' | 'withdrawing' | 'success' | 'error';

export function useAaveWithdraw({
  tokenAddress,
  tokenSymbol,
}: UseAaveWithdrawParams) {
  const { address: userAddress, chainId } = useAccount();
  const [step, setStep] = useState<WithdrawStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  const decimals = getTokenDecimals(tokenSymbol);
  const poolAddress = chainId ? AAVE_POOL_ADDRESS[chainId] : undefined;

  // Read user's current Aave position for health factor
  const { data: accountData } = useReadContract({
    address: poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: 'getUserAccountData',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!poolAddress },
  });

  // Parse health factor (returned in 1e18 format)
  const healthFactor = useMemo(() => {
    if (!accountData) return Infinity;
    const hf = accountData[5]; // healthFactor is 6th return value
    return Number(formatUnits(hf, 18));
  }, [accountData]);

  const hasDebt = useMemo(() => {
    if (!accountData) return false;
    return accountData[1] > 0n; // totalDebtBase > 0
  }, [accountData]);

  // Check if withdrawal would cause liquidation risk
  const checkWithdrawalRisk = (withdrawAmount: string): HealthFactorCheck => {
    if (!hasDebt || !accountData) {
      return {
        currentHealthFactor: Infinity,
        projectedHealthFactor: Infinity,
        isRisky: false,
        willLiquidate: false,
      };
    }

    const totalCollateral = Number(formatUnits(accountData[0], 8));
    const totalDebt = Number(formatUnits(accountData[1], 8));
    const withdrawValue = parseFloat(withdrawAmount);

    const projectedCollateral = totalCollateral - withdrawValue;
    const projectedHF = totalDebt > 0 ? (projectedCollateral * 0.8) / totalDebt : Infinity;

    return {
      currentHealthFactor: healthFactor,
      projectedHealthFactor: projectedHF,
      isRisky: projectedHF < 1.5,
      willLiquidate: projectedHF < 1.0,
    };
  };

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isPending || isConfirming) {
      setStep('withdrawing');
    } else if (isSuccess) {
      setStep('success');
    } else if (writeError) {
      setStep('error');
      setError(writeError as Error);
    }
  }, [isPending, isConfirming, isSuccess, writeError]);

  const withdraw = async (amount: string, withdrawAll = false) => {
    if (!poolAddress || !userAddress) {
      throw new Error('Wallet not connected');
    }

    // Pre-flight health factor check
    if (hasDebt) {
      const risk = checkWithdrawalRisk(amount);
      if (risk.willLiquidate) {
        setError(
          new Error(
            `Withdrawal would cause liquidation. Health factor would drop to ${risk.projectedHealthFactor.toFixed(2)}`
          )
        );
        setStep('error');
        return;
      }
    }

    const parsedAmount = withdrawAll
      ? maxUint256
      : parseUnits(amount, decimals);

    setStep('withdrawing');
    setError(null);

    writeContract({
      address: poolAddress,
      abi: AAVE_POOL_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, parsedAmount, userAddress],
    });
  };

  const reset = () => {
    setStep('idle');
    setError(null);
    resetWrite();
  };

  return {
    step,
    isLoading: isPending || isConfirming,
    error,
    txHash,
    healthFactor,
    hasDebt,
    checkWithdrawalRisk,
    withdraw,
    reset,
  };
}
