/**
 * Fluid Protocol Deposit Hook
 *
 * Handles deposits to Fluid fTokens (ERC-4626 compliant).
 * Features:
 * - Token approval handling
 * - Deposit preview
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
import { ERC4626_ABI, ERC20_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseFluidDepositParams {
  /** fToken address (ERC-4626) */
  fTokenAddress: Address;
  /** Underlying asset address */
  assetAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type FluidDepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

export interface UseFluidDepositReturn {
  /** Current step */
  step: FluidDepositStep;
  /** Whether approval is needed */
  needsApproval: boolean;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Deposit transaction hash */
  txHash: `0x${string}` | undefined;
  /** Preview shares to receive */
  previewShares: bigint;
  /** Max deposit allowed */
  maxDeposit: bigint;
  /** Check if amount needs approval */
  checkAllowance: (amount: string) => Promise<boolean>;
  /** Approve tokens */
  approve: (amount: string) => Promise<void>;
  /** Execute deposit */
  deposit: (amount: string) => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useFluidDeposit({
  fTokenAddress,
  assetAddress,
  assetSymbol,
  decimals = 6,
}: UseFluidDepositParams): UseFluidDepositReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<FluidDepositStep>('idle');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [depositAmount, setDepositAmount] = useState<bigint>(0n);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // Current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, fTokenAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Preview deposit
  const { data: previewShares } = useReadContract({
    address: fTokenAddress,
    abi: ERC4626_ABI,
    functionName: 'previewDeposit',
    args: depositAmount > 0n ? [depositAmount] : undefined,
    query: { enabled: depositAmount > 0n },
  });

  // Max deposit
  const { data: maxDeposit } = useReadContract({
    address: fTokenAddress,
    abi: ERC4626_ABI,
    functionName: 'maxDeposit',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // ==========================================================================
  // WRITE CONTRACTS
  // ==========================================================================

  // Approve
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

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

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setNeedsApproval(false);
    }
  }, [isApproveSuccess, refetchAllowance]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const checkAllowance = useCallback(
    async (amount: string): Promise<boolean> => {
      if (!amount || parseFloat(amount) <= 0) return false;

      const parsedAmount = parseUnits(amount, decimals);
      setDepositAmount(parsedAmount);

      const currentAllowance = (allowance as bigint) ?? 0n;
      const hasAllowance = currentAllowance >= parsedAmount;
      setNeedsApproval(!hasAllowance);

      return hasAllowance;
    },
    [allowance, decimals]
  );

  const approve = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);
      setStep('approving');
      setError(null);

      writeApprove({
        address: assetAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [fTokenAddress, parsedAmount],
      });
    },
    [assetAddress, fTokenAddress, userAddress, decimals, writeApprove]
  );

  const deposit = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);

      // Check max deposit
      const max = (maxDeposit as bigint) ?? BigInt(2 ** 256 - 1);
      if (parsedAmount > max) {
        setError(new Error('Amount exceeds maximum deposit'));
        setStep('error');
        return;
      }

      setStep('depositing');
      setError(null);

      writeDeposit({
        address: fTokenAddress,
        abi: ERC4626_ABI,
        functionName: 'deposit',
        args: [parsedAmount, userAddress],
      });
    },
    [fTokenAddress, userAddress, decimals, maxDeposit, writeDeposit]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setNeedsApproval(true);
    setDepositAmount(0n);
    resetApprove();
    resetDeposit();
  }, [resetApprove, resetDeposit]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

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
    previewShares: (previewShares as bigint) ?? 0n,
    maxDeposit: (maxDeposit as bigint) ?? BigInt(2 ** 256 - 1),
    checkAllowance,
    approve,
    deposit,
    reset,
  };
}

export default useFluidDeposit;
