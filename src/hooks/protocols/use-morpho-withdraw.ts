/**
 * Morpho Blue Withdraw Hook
 *
 * Handles withdrawals from Morpho Blue curated vaults (ERC-4626 compliant).
 * Features:
 * - Max withdraw check (liquidity constraints)
 * - Withdrawal preview
 * - Redeem by shares or withdraw by assets
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

export interface UseMorphoWithdrawParams {
  /** Vault address (ERC-4626) */
  vaultAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type MorphoWithdrawStep = 'idle' | 'withdrawing' | 'success' | 'error';

export interface UseMorphoWithdrawReturn {
  /** Current step */
  step: MorphoWithdrawStep;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Withdraw transaction hash */
  txHash: `0x${string}` | undefined;
  /** User's share balance */
  shareBalance: bigint;
  /** User's asset balance (converted from shares) */
  assetBalance: bigint;
  /** Maximum withdrawable amount */
  maxWithdraw: bigint;
  /** Preview shares to burn for withdrawal */
  previewWithdraw: (amount: bigint) => bigint;
  /** Execute withdrawal by asset amount */
  withdraw: (amount: string) => Promise<void>;
  /** Execute withdrawal of all (redeem all shares) */
  withdrawAll: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMorphoWithdraw({
  vaultAddress,
  assetSymbol,
  decimals = 6,
}: UseMorphoWithdrawParams): UseMorphoWithdrawReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<MorphoWithdrawStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // User's share balance
  const { data: shareBalance, refetch: refetchBalance } = useReadContract({
    address: vaultAddress,
    abi: ERC4626_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Max withdrawable (considers liquidity)
  const { data: maxWithdraw } = useReadContract({
    address: vaultAddress,
    abi: ERC4626_ABI,
    functionName: 'maxWithdraw',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Convert shares to assets
  const { data: assetBalance } = useReadContract({
    address: vaultAddress,
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

  // Update step based on state
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

  // Preview how many shares will be burned
  const previewWithdrawFn = useCallback(
    (amount: bigint): bigint => {
      // Approximate: shares = amount * totalShares / totalAssets
      // For ERC-4626, use previewWithdraw contract call instead for accuracy
      const shares = shareBalance as bigint;
      const assets = assetBalance as bigint;
      if (!shares || !assets || assets === 0n) return 0n;
      return (amount * shares) / assets;
    },
    [shareBalance, assetBalance]
  );

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
        address: vaultAddress,
        abi: ERC4626_ABI,
        functionName: 'withdraw',
        args: [parsedAmount, userAddress, userAddress],
      });
    },
    [vaultAddress, userAddress, decimals, maxWithdraw, writeWithdraw]
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
      address: vaultAddress,
      abi: ERC4626_ABI,
      functionName: 'redeem',
      args: [shares, userAddress, userAddress],
    });
  }, [vaultAddress, userAddress, shareBalance, writeWithdraw]);

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
    previewWithdraw: previewWithdrawFn,
    withdraw,
    withdrawAll,
    reset,
  };
}

export default useMorphoWithdraw;
