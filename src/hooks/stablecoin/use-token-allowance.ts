/**
 * Unified Token Allowance Hook
 *
 * Reusable hook for managing ERC-20 token allowances across all stablecoin protocols.
 * Handles:
 * - Checking current allowance
 * - Approving exact amounts
 * - Approving infinite amounts (MaxUint256)
 * - Auto-refreshing after approval
 * - Error handling for rejections
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from 'wagmi';
import { type Address, maxUint256 } from 'viem';
import { ERC20_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseTokenAllowanceParams {
  /** Token contract address */
  tokenAddress: Address;
  /** Spender contract address (protocol pool/vault) */
  spenderAddress: Address;
  /** Token decimals for parsing amounts */
  decimals?: number;
  /** Whether to enable the hook */
  enabled?: boolean;
}

export type AllowanceStep = 'idle' | 'checking' | 'approving' | 'success' | 'error';

export interface UseTokenAllowanceReturn {
  /** Current allowance amount */
  currentAllowance: bigint;
  /** Whether the current allowance is sufficient for the amount */
  hasAllowance: (amount: bigint) => boolean;
  /** Whether the spender has infinite approval */
  hasInfiniteAllowance: boolean;
  /** Current step in the approval flow */
  step: AllowanceStep;
  /** Whether any operation is in progress */
  isLoading: boolean;
  /** Whether currently checking allowance */
  isChecking: boolean;
  /** Whether approval transaction is pending */
  isApproving: boolean;
  /** Whether approval was successful */
  isApproved: boolean;
  /** Error if any */
  error: Error | null;
  /** Approval transaction hash */
  approvalTxHash: `0x${string}` | undefined;
  /** Approve exact amount */
  approve: (amount: bigint) => Promise<void>;
  /** Approve infinite amount (MaxUint256) */
  approveInfinite: () => Promise<void>;
  /** Refresh allowance from chain */
  refetch: () => void;
  /** Reset state */
  reset: () => void;
}

// Threshold for "infinite" approval (anything > 1e30)
const INFINITE_THRESHOLD = BigInt('1000000000000000000000000000000'); // 1e30

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTokenAllowance({
  tokenAddress,
  spenderAddress,
  decimals = 18,
  enabled = true,
}: UseTokenAllowanceParams): UseTokenAllowanceReturn {
  const { address: userAddress, isConnected } = useAccount();

  // Local state
  const [step, setStep] = useState<AllowanceStep>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Read current allowance
  const {
    data: allowance,
    isLoading: isChecking,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: enabled && isConnected && !!userAddress && !!spenderAddress,
    },
  });

  // Write approval
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();

  // Wait for approval transaction
  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveConfirmError,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const currentAllowance = (allowance as bigint) ?? 0n;

  const hasInfiniteAllowance = currentAllowance >= INFINITE_THRESHOLD;

  const hasAllowance = useCallback(
    (amount: bigint): boolean => {
      return currentAllowance >= amount;
    },
    [currentAllowance]
  );

  const isLoading = isChecking || isApprovePending || isApproveConfirming;
  const isApproving = isApprovePending || isApproveConfirming;

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Update step based on state
  useEffect(() => {
    if (isChecking) {
      setStep('checking');
    } else if (isApprovePending || isApproveConfirming) {
      setStep('approving');
    } else if (isApproveSuccess) {
      setStep('success');
      setIsApproved(true);
    } else if (approveWriteError || approveConfirmError) {
      setStep('error');
      setError((approveWriteError || approveConfirmError) as Error);
    } else {
      setStep('idle');
    }
  }, [isChecking, isApprovePending, isApproveConfirming, isApproveSuccess, approveWriteError, approveConfirmError]);

  // Refetch allowance after successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      // Small delay to ensure blockchain state is updated
      const timer = setTimeout(() => {
        refetchAllowance();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isApproveSuccess, refetchAllowance]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  /**
   * Approve exact amount
   */
  const approve = useCallback(
    async (amount: bigint) => {
      if (!userAddress || !spenderAddress) {
        throw new Error('Wallet not connected');
      }

      if (amount <= 0n) {
        throw new Error('Amount must be greater than zero');
      }

      setError(null);
      setIsApproved(false);
      setStep('approving');

      try {
        writeApprove({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, amount],
        });
      } catch (err) {
        setError(err as Error);
        setStep('error');
        throw err;
      }
    },
    [tokenAddress, spenderAddress, userAddress, writeApprove]
  );

  /**
   * Approve infinite amount (MaxUint256)
   * Use this to avoid multiple approval transactions
   */
  const approveInfinite = useCallback(async () => {
    if (!userAddress || !spenderAddress) {
      throw new Error('Wallet not connected');
    }

    setError(null);
    setIsApproved(false);
    setStep('approving');

    try {
      writeApprove({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, maxUint256],
      });
    } catch (err) {
      setError(err as Error);
      setStep('error');
      throw err;
    }
  }, [tokenAddress, spenderAddress, userAddress, writeApprove]);

  /**
   * Refresh allowance from chain
   */
  const refetch = useCallback(() => {
    refetchAllowance();
  }, [refetchAllowance]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setIsApproved(false);
    resetApprove();
  }, [resetApprove]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    currentAllowance,
    hasAllowance,
    hasInfiniteAllowance,
    step,
    isLoading,
    isChecking,
    isApproving,
    isApproved,
    error,
    approvalTxHash: approveHash,
    approve,
    approveInfinite,
    refetch,
    reset,
  };
}

// =============================================================================
// HELPER HOOK: Check if approval needed before action
// =============================================================================

export interface UseNeedsApprovalParams {
  tokenAddress: Address;
  spenderAddress: Address;
  amount: bigint;
  enabled?: boolean;
}

export interface UseNeedsApprovalReturn {
  needsApproval: boolean;
  currentAllowance: bigint;
  isChecking: boolean;
}

/**
 * Simple hook to check if approval is needed for a specific amount
 */
export function useNeedsApproval({
  tokenAddress,
  spenderAddress,
  amount,
  enabled = true,
}: UseNeedsApprovalParams): UseNeedsApprovalReturn {
  const { address: userAddress, isConnected } = useAccount();

  const { data: allowance, isLoading: isChecking } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: enabled && isConnected && !!userAddress && !!spenderAddress && amount > 0n,
    },
  });

  const currentAllowance = (allowance as bigint) ?? 0n;
  const needsApproval = amount > 0n && currentAllowance < amount;

  return {
    needsApproval,
    currentAllowance,
    isChecking,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useTokenAllowance;
