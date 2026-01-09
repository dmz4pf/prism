/**
 * Unified Protocol Action Hook Factory
 *
 * A single hook that routes to the correct protocol-specific hook based on
 * the protocol name. Provides a consistent interface for all stablecoin protocols.
 *
 * Usage:
 * const { deposit, withdraw, isLoading, step, error } = useProtocolAction({
 *   protocol: 'morpho',
 *   poolAddress: '0x...',
 *   assetAddress: '0x...',
 *   assetSymbol: 'USDC',
 * });
 */

'use client';

import { useCallback, useMemo } from 'react';
import { type Address } from 'viem';
import { ProtocolName, StablecoinPool } from '@/types/stablecoin';

// Import all protocol hooks
import { useMorphoDeposit } from './use-morpho-deposit';
import { useMorphoWithdraw } from './use-morpho-withdraw';
import { useMoonwellDeposit } from './use-moonwell-deposit';
import { useMoonwellWithdraw } from './use-moonwell-withdraw';
import { useCompoundDeposit } from './use-compound-deposit';
import { useCompoundWithdraw } from './use-compound-withdraw';
import { useFluidDeposit } from './use-fluid-deposit';
import { useFluidWithdraw } from './use-fluid-withdraw';
import { useAaveDeposit } from './use-aave-deposit';
import { useAaveWithdraw } from './use-aave-withdraw';

// Re-export individual hooks for direct use
export { useMorphoDeposit } from './use-morpho-deposit';
export { useMorphoWithdraw } from './use-morpho-withdraw';
export { useMoonwellDeposit } from './use-moonwell-deposit';
export { useMoonwellWithdraw } from './use-moonwell-withdraw';
export { useCompoundDeposit } from './use-compound-deposit';
export { useCompoundWithdraw } from './use-compound-withdraw';
export { useFluidDeposit } from './use-fluid-deposit';
export { useFluidWithdraw } from './use-fluid-withdraw';

// =============================================================================
// TYPES
// =============================================================================

export interface UseProtocolActionParams {
  /** Protocol name */
  protocol: ProtocolName;
  /** Pool/vault address */
  poolAddress: Address;
  /** Underlying asset address */
  assetAddress: Address;
  /** Asset symbol */
  assetSymbol: string;
  /** Asset decimals */
  decimals?: number;
}

export type ProtocolActionStep =
  | 'idle'
  | 'checking'
  | 'approving'
  | 'depositing'
  | 'withdrawing'
  | 'success'
  | 'error';

export interface UseProtocolActionReturn {
  // State
  step: ProtocolActionStep;
  isLoading: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;

  // Deposit actions
  needsApproval: boolean;
  checkAllowance: (amount: string) => Promise<boolean>;
  approve: (amount: string) => Promise<void>;
  deposit: (amount: string) => Promise<void>;

  // Withdraw actions
  balance: bigint;
  maxWithdraw: bigint;
  withdraw: (amount: string) => Promise<void>;
  withdrawAll: () => Promise<void>;

  // Utils
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useProtocolAction({
  protocol,
  poolAddress,
  assetAddress,
  assetSymbol,
  decimals = 6,
}: UseProtocolActionParams): UseProtocolActionReturn {
  // ==========================================================================
  // Protocol-specific hooks
  // ==========================================================================

  // Aave
  const aaveDeposit = useAaveDeposit({
    tokenAddress: assetAddress,
    tokenSymbol: assetSymbol,
  });
  const aaveWithdraw = useAaveWithdraw({
    tokenAddress: assetAddress,
    tokenSymbol: assetSymbol,
  });

  // Morpho
  const morphoDeposit = useMorphoDeposit({
    vaultAddress: poolAddress,
    assetAddress,
    assetSymbol,
    decimals,
  });
  const morphoWithdraw = useMorphoWithdraw({
    vaultAddress: poolAddress,
    assetSymbol,
    decimals,
  });

  // Moonwell
  const moonwellDeposit = useMoonwellDeposit({
    mTokenAddress: poolAddress,
    assetAddress,
    assetSymbol,
    decimals,
  });
  const moonwellWithdraw = useMoonwellWithdraw({
    mTokenAddress: poolAddress,
    assetSymbol,
    decimals,
  });

  // Compound
  const compoundDeposit = useCompoundDeposit({
    cometAddress: poolAddress,
    assetAddress,
    assetSymbol,
    decimals,
  });
  const compoundWithdraw = useCompoundWithdraw({
    cometAddress: poolAddress,
    assetAddress,
    assetSymbol,
    decimals,
  });

  // Fluid
  const fluidDeposit = useFluidDeposit({
    fTokenAddress: poolAddress,
    assetAddress,
    assetSymbol,
    decimals,
  });
  const fluidWithdraw = useFluidWithdraw({
    fTokenAddress: poolAddress,
    assetSymbol,
    decimals,
  });

  // ==========================================================================
  // Select active hooks based on protocol
  // ==========================================================================

  const activeDeposit = useMemo(() => {
    switch (protocol) {
      case 'aave':
        return aaveDeposit;
      case 'morpho':
        return morphoDeposit;
      case 'moonwell':
        return moonwellDeposit;
      case 'compound':
        return compoundDeposit;
      case 'fluid':
        return fluidDeposit;
      default:
        return morphoDeposit; // Fallback
    }
  }, [protocol, aaveDeposit, morphoDeposit, moonwellDeposit, compoundDeposit, fluidDeposit]);

  const activeWithdraw = useMemo(() => {
    switch (protocol) {
      case 'aave':
        return aaveWithdraw;
      case 'morpho':
        return morphoWithdraw;
      case 'moonwell':
        return moonwellWithdraw;
      case 'compound':
        return compoundWithdraw;
      case 'fluid':
        return fluidWithdraw;
      default:
        return morphoWithdraw; // Fallback
    }
  }, [protocol, aaveWithdraw, morphoWithdraw, moonwellWithdraw, compoundWithdraw, fluidWithdraw]);

  // ==========================================================================
  // Unified interface
  // ==========================================================================

  // Normalize step names
  const step: ProtocolActionStep = useMemo(() => {
    const depositStep = activeDeposit.step;
    const withdrawStep = activeWithdraw.step;

    if (depositStep !== 'idle') {
      return depositStep as ProtocolActionStep;
    }
    if (withdrawStep !== 'idle') {
      if (withdrawStep === 'withdrawing') return 'withdrawing';
      return withdrawStep as ProtocolActionStep;
    }
    return 'idle';
  }, [activeDeposit.step, activeWithdraw.step]);

  const isLoading = activeDeposit.isLoading || activeWithdraw.isLoading;
  const error = activeDeposit.error || activeWithdraw.error;
  const txHash = activeDeposit.txHash || activeWithdraw.txHash;

  // Get balance from withdraw hook
  const balance = useMemo(() => {
    switch (protocol) {
      case 'aave':
        return 0n; // Aave withdraw hook may have different structure
      case 'morpho':
        return morphoWithdraw.assetBalance;
      case 'moonwell':
        return moonwellWithdraw.underlyingBalance;
      case 'compound':
        return compoundWithdraw.balance;
      case 'fluid':
        return fluidWithdraw.assetBalance;
      default:
        return 0n;
    }
  }, [protocol, morphoWithdraw, moonwellWithdraw, compoundWithdraw, fluidWithdraw]);

  const maxWithdraw = useMemo(() => {
    switch (protocol) {
      case 'morpho':
        return morphoWithdraw.maxWithdraw;
      case 'moonwell':
        return moonwellWithdraw.underlyingBalance;
      case 'compound':
        return compoundWithdraw.balance;
      case 'fluid':
        return fluidWithdraw.maxWithdraw;
      default:
        return balance;
    }
  }, [protocol, balance, morphoWithdraw, moonwellWithdraw, compoundWithdraw, fluidWithdraw]);

  // Reset all hooks
  const reset = useCallback(() => {
    activeDeposit.reset();
    activeWithdraw.reset();
  }, [activeDeposit, activeWithdraw]);

  // ==========================================================================
  // Return unified interface
  // ==========================================================================

  return {
    // State
    step,
    isLoading,
    error,
    txHash,

    // Deposit
    needsApproval: activeDeposit.needsApproval,
    checkAllowance: activeDeposit.checkAllowance,
    approve: activeDeposit.approve,
    deposit: activeDeposit.deposit,

    // Withdraw
    balance,
    maxWithdraw,
    withdraw: activeWithdraw.withdraw,
    withdrawAll: 'withdrawAll' in activeWithdraw
      ? (activeWithdraw as any).withdrawAll
      : async () => activeWithdraw.withdraw(maxWithdraw.toString()),

    // Utils
    reset,
  };
}

// =============================================================================
// CONVENIENCE: Use with StablecoinPool
// =============================================================================

export interface UsePoolActionParams {
  pool: StablecoinPool;
}

export function usePoolAction({ pool }: UsePoolActionParams): UseProtocolActionReturn {
  return useProtocolAction({
    protocol: pool.protocol,
    poolAddress: pool.poolAddress,
    assetAddress: pool.asset.address,
    assetSymbol: pool.asset.symbol,
    decimals: pool.asset.decimals,
  });
}

export default useProtocolAction;
