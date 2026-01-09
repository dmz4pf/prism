/**
 * useLendingActions Hook
 *
 * Provides actions for supply, withdraw, borrow, and repay operations.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { Address, Hex } from 'viem';
import { createLendingService } from '@/services/lending';
import { useSmartWallet } from '@/hooks/wallet/use-smart-wallet';
import {
  LendingProtocol,
  TransactionCall,
  ValidationResult,
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  EnableCollateralParams,
} from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export type LendingActionType = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'enableCollateral';

export interface LendingActionState {
  /** Current action being executed */
  action: LendingActionType | null;
  /** Protocol being used */
  protocol: LendingProtocol | null;
  /** Transaction calls to execute */
  calls: TransactionCall[];
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Transaction hash of current step */
  txHash: Hex | null;
  /** Whether action is in progress */
  isPending: boolean;
  /** Whether action was successful */
  isSuccess: boolean;
  /** Error if action failed */
  error: Error | null;
  /** Validation result */
  validation: ValidationResult | null;
}

export interface UseLendingActionsReturn {
  /** Current action state */
  state: LendingActionState;

  /** Supply tokens to a market */
  supply: (
    protocol: LendingProtocol,
    params: Omit<SupplyParams, 'userAddress'>
  ) => Promise<void>;

  /** Withdraw tokens from a market */
  withdraw: (
    protocol: LendingProtocol,
    params: Omit<WithdrawParams, 'userAddress'>
  ) => Promise<void>;

  /** Borrow tokens from a market */
  borrow: (
    protocol: LendingProtocol,
    params: Omit<BorrowParams, 'userAddress'>
  ) => Promise<void>;

  /** Repay borrowed tokens */
  repay: (
    protocol: LendingProtocol,
    params: Omit<RepayParams, 'userAddress'>
  ) => Promise<void>;

  /** Enable/disable collateral */
  enableCollateral: (
    protocol: LendingProtocol,
    params: Omit<EnableCollateralParams, 'userAddress'>
  ) => Promise<void>;

  /** Validate an action before executing */
  validate: (
    action: LendingActionType,
    protocol: LendingProtocol,
    params: Record<string, unknown>
  ) => Promise<ValidationResult>;

  /** Reset state */
  reset: () => void;

  /** Execute next step in multi-step transaction */
  executeNextStep: () => Promise<void>;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: LendingActionState = {
  action: null,
  protocol: null,
  calls: [],
  currentStep: 0,
  totalSteps: 0,
  txHash: null,
  isPending: false,
  isSuccess: false,
  error: null,
  validation: null,
};

// =============================================================================
// HOOK
// =============================================================================

export function useLendingActions(): UseLendingActionsReturn {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress } = useAccount();
  const { sendTransaction, sendBatchedTransactions, isConnected: isSmartWalletReady } = useSmartWallet();
  const queryClient = useQueryClient();

  const [state, setState] = useState<LendingActionState>(initialState);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Execute a single transaction
  const executeTransaction = useCallback(
    async (call: TransactionCall): Promise<Hex> => {
      if (!userAddress) throw new Error('Not connected');

      // Use smart wallet if available, otherwise fall back to regular transaction
      if (isSmartWalletReady && sendTransaction) {
        const hash = await sendTransaction({
          to: call.to,
          data: call.data as Hex,
          value: call.value || 0n,
        });
        return hash as Hex;
      }

      // For EOA, we'd use regular transaction here
      // This should integrate with wagmi's sendTransaction
      throw new Error('Smart wallet required for lending operations');
    },
    [userAddress, isSmartWalletReady, sendTransaction]
  );

  // Execute batched transactions
  const executeBatchedTransactions = useCallback(
    async (calls: TransactionCall[]): Promise<Hex> => {
      if (!userAddress) throw new Error('Not connected');

      if (isSmartWalletReady && sendBatchedTransactions) {
        const hash = await sendBatchedTransactions(
          calls.map((c) => ({
            to: c.to,
            data: c.data as Hex,
            value: c.value || 0n,
          }))
        );
        return hash as Hex;
      }

      throw new Error('Smart wallet required for batched operations');
    },
    [userAddress, isSmartWalletReady, sendBatchedTransactions]
  );

  // Build and execute an action
  const executeAction = useCallback(
    async (
      actionType: LendingActionType,
      protocol: LendingProtocol,
      buildCalls: () => Promise<TransactionCall[]>
    ) => {
      if (!publicClient || !userAddress) {
        throw new Error('Not connected');
      }

      setState((prev) => ({
        ...prev,
        action: actionType,
        protocol,
        isPending: true,
        isSuccess: false,
        error: null,
      }));

      try {
        // Build transaction calls
        const calls = await buildCalls();

        setState((prev) => ({
          ...prev,
          calls,
          totalSteps: calls.length,
          currentStep: 0,
        }));

        // If smart wallet is ready, batch all calls
        if (isSmartWalletReady && calls.length > 1) {
          const txHash = await executeBatchedTransactions(calls);

          setState((prev) => ({
            ...prev,
            txHash,
            currentStep: calls.length,
            isPending: false,
            isSuccess: true,
          }));
        } else {
          // Execute calls sequentially (flow map style)
          for (let i = 0; i < calls.length; i++) {
            setState((prev) => ({
              ...prev,
              currentStep: i,
            }));

            const txHash = await executeTransaction(calls[i]);

            setState((prev) => ({
              ...prev,
              txHash,
            }));

            // Wait for confirmation before next step
            // In production, would use waitForTransactionReceipt
          }

          setState((prev) => ({
            ...prev,
            currentStep: calls.length,
            isPending: false,
            isSuccess: true,
          }));
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['lending-positions'] });
        queryClient.invalidateQueries({ queryKey: ['lending-markets'] });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isPending: false,
          error: error instanceof Error ? error : new Error('Action failed'),
        }));
        throw error;
      }
    },
    [
      publicClient,
      userAddress,
      isSmartWalletReady,
      executeTransaction,
      executeBatchedTransactions,
      queryClient,
    ]
  );

  // Supply
  const supply = useCallback(
    async (
      protocol: LendingProtocol,
      params: Omit<SupplyParams, 'userAddress'>
    ) => {
      if (!publicClient || !userAddress) return;

      const service = createLendingService(publicClient, chainId);

      // Validate first
      const validation = await service.validateSupply(protocol, {
        ...params,
        userAddress,
      });

      setState((prev) => ({ ...prev, validation }));

      if (!validation.valid) {
        throw new Error(validation.errors[0]?.message || 'Validation failed');
      }

      await executeAction('supply', protocol, () =>
        service.buildSupply(protocol, { ...params, userAddress })
      );
    },
    [publicClient, userAddress, executeAction]
  );

  // Withdraw
  const withdraw = useCallback(
    async (
      protocol: LendingProtocol,
      params: Omit<WithdrawParams, 'userAddress'>
    ) => {
      if (!publicClient || !userAddress) return;

      const service = createLendingService(publicClient, chainId);

      const validation = await service.validateWithdraw(protocol, {
        ...params,
        userAddress,
      });

      setState((prev) => ({ ...prev, validation }));

      if (!validation.valid) {
        throw new Error(validation.errors[0]?.message || 'Validation failed');
      }

      await executeAction('withdraw', protocol, () =>
        service.buildWithdraw(protocol, { ...params, userAddress })
      );
    },
    [publicClient, userAddress, executeAction]
  );

  // Borrow
  const borrow = useCallback(
    async (
      protocol: LendingProtocol,
      params: Omit<BorrowParams, 'userAddress'>
    ) => {
      if (!publicClient || !userAddress) return;

      const service = createLendingService(publicClient, chainId);

      const validation = await service.validateBorrow(protocol, {
        ...params,
        userAddress,
      });

      setState((prev) => ({ ...prev, validation }));

      if (!validation.valid) {
        throw new Error(validation.errors[0]?.message || 'Validation failed');
      }

      await executeAction('borrow', protocol, () =>
        service.buildBorrow(protocol, { ...params, userAddress })
      );
    },
    [publicClient, userAddress, executeAction]
  );

  // Repay
  const repay = useCallback(
    async (
      protocol: LendingProtocol,
      params: Omit<RepayParams, 'userAddress'>
    ) => {
      if (!publicClient || !userAddress) return;

      const service = createLendingService(publicClient, chainId);

      const validation = await service.validateRepay(protocol, {
        ...params,
        userAddress,
      });

      setState((prev) => ({ ...prev, validation }));

      if (!validation.valid) {
        throw new Error(validation.errors[0]?.message || 'Validation failed');
      }

      await executeAction('repay', protocol, () =>
        service.buildRepay(protocol, { ...params, userAddress })
      );
    },
    [publicClient, userAddress, executeAction]
  );

  // Enable/Disable Collateral
  const enableCollateral = useCallback(
    async (
      protocol: LendingProtocol,
      params: Omit<EnableCollateralParams, 'userAddress'>
    ) => {
      if (!publicClient || !userAddress) return;

      const service = createLendingService(publicClient, chainId);

      await executeAction('enableCollateral', protocol, () =>
        service.buildEnableCollateral(protocol, { ...params, userAddress })
      );
    },
    [publicClient, userAddress, executeAction]
  );

  // Validate action
  const validate = useCallback(
    async (
      action: LendingActionType,
      protocol: LendingProtocol,
      params: Record<string, unknown>
    ): Promise<ValidationResult> => {
      if (!publicClient || !userAddress) {
        return {
          valid: false,
          errors: [{ code: 'NOT_CONNECTED', message: 'Wallet not connected' }],
          warnings: [],
        };
      }

      const service = createLendingService(publicClient, chainId);
      const fullParams = { ...params, userAddress } as any;

      switch (action) {
        case 'supply':
          return service.validateSupply(protocol, fullParams);
        case 'withdraw':
          return service.validateWithdraw(protocol, fullParams);
        case 'borrow':
          return service.validateBorrow(protocol, fullParams);
        case 'repay':
          return service.validateRepay(protocol, fullParams);
        default:
          return { valid: true, errors: [], warnings: [] };
      }
    },
    [publicClient, userAddress]
  );

  // Execute next step (for manual flow progression)
  const executeNextStep = useCallback(async () => {
    if (state.currentStep >= state.calls.length) return;

    const call = state.calls[state.currentStep];
    const txHash = await executeTransaction(call);

    setState((prev) => ({
      ...prev,
      txHash,
      currentStep: prev.currentStep + 1,
      isSuccess: prev.currentStep + 1 >= prev.totalSteps,
      isPending: prev.currentStep + 1 < prev.totalSteps,
    }));
  }, [state.currentStep, state.calls, executeTransaction]);

  return {
    state,
    supply,
    withdraw,
    borrow,
    repay,
    enableCollateral,
    validate,
    reset,
    executeNextStep,
  };
}
