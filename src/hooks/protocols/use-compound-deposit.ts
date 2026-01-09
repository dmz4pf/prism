/**
 * Compound V3 (Comet) Deposit Hook
 *
 * Handles deposits to Compound V3 markets.
 * Features:
 * - Token approval handling
 * - Supply to Comet
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
import { COMPOUND_COMET_ABI, ERC20_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCompoundDepositParams {
  /** Comet (cToken) address */
  cometAddress: Address;
  /** Underlying asset address */
  assetAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type CompoundDepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

export interface UseCompoundDepositReturn {
  /** Current step */
  step: CompoundDepositStep;
  /** Whether approval is needed */
  needsApproval: boolean;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Deposit transaction hash */
  txHash: `0x${string}` | undefined;
  /** Check if amount needs approval */
  checkAllowance: (amount: string) => Promise<boolean>;
  /** Approve tokens */
  approve: (amount: string) => Promise<void>;
  /** Execute deposit (supply) */
  deposit: (amount: string) => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useCompoundDeposit({
  cometAddress,
  assetAddress,
  assetSymbol,
  decimals = 6,
}: UseCompoundDepositParams): UseCompoundDepositReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<CompoundDepositStep>('idle');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // READ CONTRACTS
  // ==========================================================================

  // Current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, cometAddress] : undefined,
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

  // Supply
  const {
    writeContract: writeSupply,
    data: supplyHash,
    isPending: isSupplyPending,
    error: supplyError,
    reset: resetSupply,
  } = useWriteContract();

  const { isLoading: isSupplyConfirming, isSuccess: isSupplySuccess } =
    useWaitForTransactionReceipt({ hash: supplyHash });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (isApprovePending || isApproveConfirming) {
      setStep('approving');
    } else if (isSupplyPending || isSupplyConfirming) {
      setStep('depositing');
    } else if (isSupplySuccess) {
      setStep('success');
    } else if (approveError || supplyError) {
      setStep('error');
      setError((approveError || supplyError) as Error);
    }
  }, [
    isApprovePending,
    isApproveConfirming,
    isSupplyPending,
    isSupplyConfirming,
    isSupplySuccess,
    approveError,
    supplyError,
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
        args: [cometAddress, parsedAmount],
      });
    },
    [assetAddress, cometAddress, userAddress, decimals, writeApprove]
  );

  const deposit = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);
      setStep('depositing');
      setError(null);

      // Compound V3 uses supply(asset, amount)
      writeSupply({
        address: cometAddress,
        abi: COMPOUND_COMET_ABI,
        functionName: 'supply',
        args: [assetAddress, parsedAmount],
      });
    },
    [cometAddress, assetAddress, userAddress, decimals, writeSupply]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setNeedsApproval(true);
    resetApprove();
    resetSupply();
  }, [resetApprove, resetSupply]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    step,
    needsApproval,
    isLoading:
      isApprovePending ||
      isApproveConfirming ||
      isSupplyPending ||
      isSupplyConfirming,
    error,
    txHash: supplyHash,
    checkAllowance,
    approve,
    deposit,
    reset,
  };
}

export default useCompoundDeposit;
