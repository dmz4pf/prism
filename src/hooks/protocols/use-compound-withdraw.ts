/**
 * Compound V3 (Comet) Withdraw Hook
 *
 * Handles withdrawals from Compound V3 markets.
 * Features:
 * - Withdraw from Comet
 * - Balance tracking
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
import { parseUnits, type Address, maxUint256 } from 'viem';
import { COMPOUND_COMET_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCompoundWithdrawParams {
  /** Comet (cToken) address */
  cometAddress: Address;
  /** Underlying asset address */
  assetAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type CompoundWithdrawStep = 'idle' | 'withdrawing' | 'success' | 'error';

export interface UseCompoundWithdrawReturn {
  /** Current step */
  step: CompoundWithdrawStep;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Withdraw transaction hash */
  txHash: `0x${string}` | undefined;
  /** User's balance in Comet */
  balance: bigint;
  /** Execute withdrawal */
  withdraw: (amount: string) => Promise<void>;
  /** Execute withdrawal of all */
  withdrawAll: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useCompoundWithdraw({
  cometAddress,
  assetAddress,
  assetSymbol,
  decimals = 6,
}: UseCompoundWithdrawParams): UseCompoundWithdrawReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<CompoundWithdrawStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // User's balance in Comet
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: cometAddress,
    abi: COMPOUND_COMET_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // ==========================================================================
  // WRITE CONTRACT
  // ==========================================================================

  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: isWithdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (isWithdrawPending || isWithdrawConfirming) {
      setStep('withdrawing');
    } else if (isWithdrawSuccess) {
      setStep('success');
      refetchBalance();
    } else if (withdrawError) {
      setStep('error');
      setError(withdrawError as Error);
    }
  }, [isWithdrawPending, isWithdrawConfirming, isWithdrawSuccess, withdrawError, refetchBalance]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const withdraw = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);
      const currentBalance = (balance as bigint) ?? 0n;

      if (parsedAmount > currentBalance) {
        setError(new Error('Amount exceeds balance'));
        setStep('error');
        return;
      }

      setStep('withdrawing');
      setError(null);

      // Compound V3 uses withdraw(asset, amount)
      writeWithdraw({
        address: cometAddress,
        abi: COMPOUND_COMET_ABI,
        functionName: 'withdraw',
        args: [assetAddress, parsedAmount],
      });
    },
    [cometAddress, assetAddress, userAddress, decimals, balance, writeWithdraw]
  );

  const withdrawAll = useCallback(async () => {
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }

    const currentBalance = (balance as bigint) ?? 0n;
    if (currentBalance === 0n) {
      setError(new Error('No balance to withdraw'));
      setStep('error');
      return;
    }

    setStep('withdrawing');
    setError(null);

    // Use max uint to withdraw all
    writeWithdraw({
      address: cometAddress,
      abi: COMPOUND_COMET_ABI,
      functionName: 'withdraw',
      args: [assetAddress, maxUint256],
    });
  }, [cometAddress, assetAddress, userAddress, balance, writeWithdraw]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    resetWithdraw();
  }, [resetWithdraw]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    step,
    isLoading: isWithdrawPending || isWithdrawConfirming,
    error,
    txHash: withdrawHash,
    balance: (balance as bigint) ?? 0n,
    withdraw,
    withdrawAll,
    reset,
  };
}

export default useCompoundWithdraw;
