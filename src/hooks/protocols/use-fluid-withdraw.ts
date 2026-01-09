/**
 * Fluid Protocol Withdraw Hook
 *
 * Handles withdrawals from Fluid fTokens (ERC-4626 compliant).
 * Features:
 * - Max withdraw check
 * - Withdrawal preview
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
import { ERC4626_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFluidWithdrawParams {
  /** fToken address (ERC-4626) */
  fTokenAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type FluidWithdrawStep = 'idle' | 'withdrawing' | 'success' | 'error';

export interface UseFluidWithdrawReturn {
  /** Current step */
  step: FluidWithdrawStep;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Withdraw transaction hash */
  txHash: `0x${string}` | undefined;
  /** User's share balance */
  shareBalance: bigint;
  /** User's asset balance (converted) */
  assetBalance: bigint;
  /** Maximum withdrawable amount */
  maxWithdraw: bigint;
  /** Execute withdrawal by asset amount */
  withdraw: (amount: string) => Promise<void>;
  /** Execute withdrawal of all */
  withdrawAll: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useFluidWithdraw({
  fTokenAddress,
  assetSymbol,
  decimals = 6,
}: UseFluidWithdrawParams): UseFluidWithdrawReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<FluidWithdrawStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // User's share balance
  const { data: shareBalance, refetch: refetchBalance } = useReadContract({
    address: fTokenAddress,
    abi: ERC4626_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Max withdrawable
  const { data: maxWithdraw } = useReadContract({
    address: fTokenAddress,
    abi: ERC4626_ABI,
    functionName: 'maxWithdraw',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Convert shares to assets
  const { data: assetBalance } = useReadContract({
    address: fTokenAddress,
    abi: ERC4626_ABI,
    functionName: 'convertToAssets',
    args: shareBalance ? [shareBalance as bigint] : undefined,
    query: { enabled: !!shareBalance && (shareBalance as bigint) > 0n },
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
      const max = (maxWithdraw as bigint) ?? 0n;

      if (parsedAmount > max) {
        setError(new Error('Amount exceeds maximum withdrawable'));
        setStep('error');
        return;
      }

      setStep('withdrawing');
      setError(null);

      writeWithdraw({
        address: fTokenAddress,
        abi: ERC4626_ABI,
        functionName: 'withdraw',
        args: [parsedAmount, userAddress, userAddress],
      });
    },
    [fTokenAddress, userAddress, decimals, maxWithdraw, writeWithdraw]
  );

  const withdrawAll = useCallback(async () => {
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }

    const shares = shareBalance as bigint;
    if (!shares || shares === 0n) {
      setError(new Error('No balance to withdraw'));
      setStep('error');
      return;
    }

    setStep('withdrawing');
    setError(null);

    // Use redeem to withdraw all shares
    writeWithdraw({
      address: fTokenAddress,
      abi: ERC4626_ABI,
      functionName: 'redeem',
      args: [shares, userAddress, userAddress],
    });
  }, [fTokenAddress, userAddress, shareBalance, writeWithdraw]);

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
    shareBalance: (shareBalance as bigint) ?? 0n,
    assetBalance: (assetBalance as bigint) ?? 0n,
    maxWithdraw: (maxWithdraw as bigint) ?? 0n,
    withdraw,
    withdrawAll,
    reset,
  };
}

export default useFluidWithdraw;
