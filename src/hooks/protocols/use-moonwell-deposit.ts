/**
 * Moonwell Deposit Hook
 *
 * Handles deposits to Moonwell markets (Compound V2 fork).
 * Features:
 * - Token approval handling
 * - Exchange rate calculation
 * - mToken preview
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
import { MOONWELL_MTOKEN_ABI, ERC20_ABI } from '@/contracts/abis/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface UseMoonwellDepositParams {
  /** mToken market address */
  mTokenAddress: Address;
  /** Underlying asset address */
  assetAddress: Address;
  /** Asset symbol for display */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type MoonwellDepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

export interface UseMoonwellDepositReturn {
  /** Current step */
  step: MoonwellDepositStep;
  /** Whether approval is needed */
  needsApproval: boolean;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Deposit transaction hash */
  txHash: `0x${string}` | undefined;
  /** Current exchange rate (mantissa) */
  exchangeRate: bigint;
  /** Preview mTokens to receive */
  previewMTokens: bigint;
  /** Check if amount needs approval */
  checkAllowance: (amount: string) => Promise<boolean>;
  /** Approve tokens */
  approve: (amount: string) => Promise<void>;
  /** Execute deposit (mint) */
  deposit: (amount: string) => Promise<void>;
  /** Reset state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMoonwellDeposit({
  mTokenAddress,
  assetAddress,
  assetSymbol,
  decimals = 6,
}: UseMoonwellDepositParams): UseMoonwellDepositReturn {
  const { address: userAddress } = useAccount();

  // Local state
  const [step, setStep] = useState<MoonwellDepositStep>('idle');
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
    args: userAddress ? [userAddress, mTokenAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // Exchange rate (stored, doesn't require tx)
  const { data: exchangeRate } = useReadContract({
    address: mTokenAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'exchangeRateStored',
    args: [],
  });

  // ==========================================================================
  // COMPUTED
  // ==========================================================================

  // Calculate mTokens to receive: amount * 1e18 / exchangeRate
  const previewMTokens =
    depositAmount > 0n && exchangeRate
      ? (depositAmount * BigInt(1e18)) / (exchangeRate as bigint)
      : 0n;

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

  // Mint (deposit)
  const {
    writeContract: writeMint,
    data: mintHash,
    isPending: isMintPending,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } =
    useWaitForTransactionReceipt({ hash: mintHash });

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (isApprovePending || isApproveConfirming) {
      setStep('approving');
    } else if (isMintPending || isMintConfirming) {
      setStep('depositing');
    } else if (isMintSuccess) {
      setStep('success');
    } else if (approveError || mintError) {
      setStep('error');
      setError((approveError || mintError) as Error);
    }
  }, [
    isApprovePending,
    isApproveConfirming,
    isMintPending,
    isMintConfirming,
    isMintSuccess,
    approveError,
    mintError,
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
        args: [mTokenAddress, parsedAmount],
      });
    },
    [assetAddress, mTokenAddress, userAddress, decimals, writeApprove]
  );

  const deposit = useCallback(
    async (amount: string) => {
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }

      const parsedAmount = parseUnits(amount, decimals);
      setStep('depositing');
      setError(null);

      // Moonwell uses mint(uint256 mintAmount) -> returns error code
      writeMint({
        address: mTokenAddress,
        abi: MOONWELL_MTOKEN_ABI,
        functionName: 'mint',
        args: [parsedAmount],
      });
    },
    [mTokenAddress, userAddress, decimals, writeMint]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setNeedsApproval(true);
    setDepositAmount(0n);
    resetApprove();
    resetMint();
  }, [resetApprove, resetMint]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    step,
    needsApproval,
    isLoading:
      isApprovePending ||
      isApproveConfirming ||
      isMintPending ||
      isMintConfirming,
    error,
    txHash: mintHash,
    exchangeRate: (exchangeRate as bigint) ?? BigInt(1e18),
    previewMTokens,
    checkAllowance,
    approve,
    deposit,
    reset,
  };
}

export default useMoonwellDeposit;
