'use client';

import { useState, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { AAVE_POOL_ABI } from '@/contracts/abis';
import { ERC20_ABI } from '@/contracts/abis';
import { AAVE_POOL_ADDRESS, getTokenDecimals } from '@/contracts/addresses';

interface UseAaveDepositParams {
  tokenAddress: Address;
  tokenSymbol: string;
}

type DepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

interface UseAaveDepositReturn {
  step: DepositStep;
  needsApproval: boolean;
  isLoading: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  checkAllowance: (amount: string) => Promise<boolean>;
  approve: (amount: string) => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  reset: () => void;
}

export function useAaveDeposit({
  tokenAddress,
  tokenSymbol,
}: UseAaveDepositParams): UseAaveDepositReturn {
  const { address: userAddress, chainId } = useAccount();
  const [step, setStep] = useState<DepositStep>('idle');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const decimals = getTokenDecimals(tokenSymbol);
  const poolAddress = chainId ? AAVE_POOL_ADDRESS[chainId] : undefined;

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && poolAddress ? [userAddress, poolAddress] : undefined,
    query: { enabled: !!userAddress && !!chainId && !!poolAddress },
  });

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  // Update step based on transaction states
  useEffect(() => {
    if (isApprovePending || isApproveConfirming) {
      setStep('approving');
    } else if (isDepositPending || isDepositConfirming) {
      setStep('depositing');
    } else if (isDepositSuccess) {
      setStep('success');
    } else if (approveError || depositError) {
      setStep('error');
      setError((approveError || depositError) as Error);
    }
  }, [
    isApprovePending,
    isApproveConfirming,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    approveError,
    depositError,
  ]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setNeedsApproval(false);
    }
  }, [isApproveSuccess, refetchAllowance]);

  const checkAllowance = async (amount: string): Promise<boolean> => {
    if (!amount || parseFloat(amount) <= 0) return false;
    const parsedAmount = parseUnits(amount, decimals);
    const hasAllowance = (allowance ?? 0n) >= parsedAmount;
    setNeedsApproval(!hasAllowance);
    return hasAllowance;
  };

  const approve = async (amount: string) => {
    if (!poolAddress || !userAddress) {
      throw new Error('Wallet not connected');
    }

    const parsedAmount = parseUnits(amount, decimals);
    setStep('approving');
    setError(null);

    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [poolAddress, parsedAmount],
    });
  };

  const deposit = async (amount: string) => {
    if (!poolAddress || !userAddress) {
      throw new Error('Wallet not connected');
    }

    const parsedAmount = parseUnits(amount, decimals);
    setStep('depositing');
    setError(null);

    writeDeposit({
      address: poolAddress,
      abi: AAVE_POOL_ABI,
      functionName: 'supply',
      args: [tokenAddress, parsedAmount, userAddress, 0],
    });
  };

  const reset = () => {
    setStep('idle');
    setError(null);
    setNeedsApproval(true);
    resetApprove();
    resetDeposit();
  };

  return {
    step,
    needsApproval,
    isLoading:
      isApprovePending ||
      isApproveConfirming ||
      isDepositPending ||
      isDepositConfirming,
    error,
    txHash: depositHash,
    checkAllowance,
    approve,
    deposit,
    reset,
  };
}
