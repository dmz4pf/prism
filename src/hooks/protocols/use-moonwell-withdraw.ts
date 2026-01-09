/**
 * Moonwell Withdraw Hook
 *
 * Handles withdrawals from Moonwell markets (Compound V2 fork).
 * Features:
 * - Redeem mTokens for underlying
 * - Exchange rate calculation
 * - Transaction state management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { MOONWELL_MTOKEN_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseMoonwellWithdrawParams {
  /** mToken market address */
  mTokenAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type MoonwellWithdrawStep = 'idle' | 'withdrawing' | 'success' | 'error';

export interface UseMoonwellWithdrawReturn {
  /** Current step */
  step: MoonwellWithdrawStep;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Withdraw transaction hash */
  txHash: `0x${string}` | undefined;
  /** User's mToken balance */
  mTokenBalance: bigint;
  /** User's underlying balance (calculated) */
  underlyingBalance: bigint;
  /** Current exchange rate */
  exchangeRate: bigint;
  /** Execute withdrawal by underlying amount */
  withdraw: (amount: string) => Promise<void>;
  /** Execute withdrawal of all mTokens */
  withdrawAll: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMoonwellWithdraw({
  mTokenAddress,
  assetSymbol,
  decimals = 6,
}: UseMoonwellWithdrawParams): UseMoonwellWithdrawReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<MoonwellWithdrawStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // User's mToken balance
  const { data: mTokenBalance, refetch: refetchBalance } = useReadContract({
    address: mTokenAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Exchange rate
  const { data: exchangeRate } = useReadContract({
    address: mTokenAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'exchangeRateStored',
    args: [],
  });

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  // Calculate underlying balance: mTokenBalance * exchangeRate / 1e18
  const underlyingBalance =
    mTokenBalance && exchangeRate
      ? ((mTokenBalance as bigint) * (exchangeRate as bigint)) / BigInt(1e18)
      : 0n;

  // ==========================================================================
  // WRITE CONTRACT
  // ==========================================================================

  const {
    writeContract: writeRedeem,
    data: redeemHash,
    isPending: isRedeemPending,
    error: redeemError,
    reset: resetRedeem,
  } = useWriteContract();

  const { isLoading: isRedeemConfirming, isSuccess: isRedeemSuccess } =
    useWaitForTransactionReceipt({ hash: redeemHash });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (isRedeemPending || isRedeemConfirming) {
      setStep('withdrawing');
    } else if (isRedeemSuccess) {
      setStep('success');
      refetchBalance();
    } else if (redeemError) {
      setStep('error');
      setError(redeemError as Error);
    }
  }, [isRedeemPending, isRedeemConfirming, isRedeemSuccess, redeemError, refetchBalance]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const withdraw = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);

      if (parsedAmount > underlyingBalance) {
        setError(new Error('Amount exceeds balance'));
        setStep('error');
        return;
      }

      setStep('withdrawing');
      setError(null);

      // Use redeemUnderlying to withdraw exact underlying amount
      writeRedeem({
        address: mTokenAddress,
        abi: MOONWELL_MTOKEN_ABI,
        functionName: 'redeemUnderlying',
        args: [parsedAmount],
      });
    },
    [mTokenAddress, userAddress, decimals, underlyingBalance, writeRedeem]
  );

  const withdrawAll = useCallback(async () => {
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }

    const balance = mTokenBalance as bigint;
    if (!balance || balance === 0n) {
      setError(new Error('No balance to withdraw'));
      setStep('error');
      return;
    }

    setStep('withdrawing');
    setError(null);

    // Use redeem to withdraw all mTokens
    writeRedeem({
      address: mTokenAddress,
      abi: MOONWELL_MTOKEN_ABI,
      functionName: 'redeem',
      args: [balance],
    });
  }, [mTokenAddress, userAddress, mTokenBalance, writeRedeem]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    resetRedeem();
  }, [resetRedeem]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    step,
    isLoading: isRedeemPending || isRedeemConfirming,
    error,
    txHash: redeemHash,
    mTokenBalance: (mTokenBalance as bigint) ?? 0n,
    underlyingBalance,
    exchangeRate: (exchangeRate as bigint) ?? BigInt(1e18),
    withdraw,
    withdrawAll,
    reset,
  };
}

export default useMoonwellWithdraw;
