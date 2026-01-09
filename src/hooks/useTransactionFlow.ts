/**
 * useTransactionFlow Hook
 * Manages transaction flow state and execution
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import {
  transactionFlowManager,
  type FlowEvent,
} from '@/services/transaction-flow';
import type {
  TransactionFlow,
  TransactionStep,
  TransactionStepStatus,
} from '@/types/staking';
import type { Address, Hex } from 'viem';
import { useSmartWallet } from './wallet/use-smart-wallet';

interface UseTransactionFlowResult {
  // Flow state
  flow: TransactionFlow | null;
  currentStep: TransactionStep | null;
  progress: number;
  isActive: boolean;
  isPending: boolean;

  // Flow control
  startFlow: (flow: TransactionFlow) => void;
  executeCurrentStep: () => Promise<void>;
  retryStep: () => void;
  cancelFlow: () => void;

  // Status
  error: string | null;
  txHash: Hex | null;
}

export function useTransactionFlow(flowId?: string): UseTransactionFlowResult {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { smartWallet, sendTransaction: smartWalletSendTransaction, isConnected: isSmartWalletConnected } = useSmartWallet();

  const [flow, setFlow] = useState<TransactionFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);

  // Load flow from manager
  useEffect(() => {
    if (flowId) {
      const existingFlow = transactionFlowManager.getFlow(flowId);
      if (existingFlow) {
        setFlow(existingFlow);
      }
    }
  }, [flowId]);

  // Subscribe to flow events
  useEffect(() => {
    const unsubscribe = transactionFlowManager.subscribe((event: FlowEvent) => {
      if (event.flowId !== flow?.id) return;

      // Refresh flow state on events
      const updatedFlow = transactionFlowManager.getFlow(event.flowId);
      if (updatedFlow) {
        setFlow({ ...updatedFlow });
      }

      // Update txHash on signed events
      if (event.type === 'step_signed' && event.txHash) {
        setTxHash(event.txHash);
      }

      // Set error on failure
      if (event.type === 'step_failed' || event.type === 'flow_failed') {
        setError(event.error || 'Transaction failed');
      }
    });

    return unsubscribe;
  }, [flow?.id]);

  const startFlow = useCallback((newFlow: TransactionFlow) => {
    setError(null);
    setTxHash(null);
    const initializedFlow = transactionFlowManager.startFlow(newFlow);
    setFlow(initializedFlow);
  }, []);

  const executeCurrentStep = useCallback(async () => {
    if (!flow || !publicClient || !address) {
      setError('Wallet not connected');
      return;
    }

    // Check if we have either smart wallet or EOA wallet
    if (!isSmartWalletConnected && !walletClient) {
      setError('No wallet available');
      return;
    }

    const currentStep = transactionFlowManager.getCurrentStep(flow.id);
    if (!currentStep || currentStep.status !== 'ready') {
      setError('No step ready for execution');
      return;
    }

    if (!currentStep.to || !currentStep.data) {
      setError('Invalid transaction data');
      return;
    }

    try {
      setError(null);
      transactionFlowManager.markStepSigning(flow.id);

      let hash: Hex;

      // Use smart wallet if available, otherwise fall back to EOA wallet
      if (isSmartWalletConnected && smartWalletSendTransaction) {
        // Execute via smart wallet (ERC-4337 UserOperation)
        hash = await smartWalletSendTransaction({
          to: currentStep.to,
          data: currentStep.data,
          value: currentStep.value || 0n,
        });
      } else if (walletClient) {
        // Fall back to EOA wallet
        hash = await walletClient.sendTransaction({
          to: currentStep.to,
          data: currentStep.data,
          value: currentStep.value || 0n,
          account: address,
          chain: walletClient.chain,
        });
      } else {
        throw new Error('No wallet available for transaction');
      }

      setTxHash(hash);
      transactionFlowManager.markStepConfirming(flow.id, hash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === 'success') {
        transactionFlowManager.completeStep(flow.id, receipt);
      } else {
        transactionFlowManager.failStep(flow.id, 'Transaction reverted');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      transactionFlowManager.failStep(flow.id, message);
      setError(message);
    }
  }, [flow, walletClient, publicClient, address, isSmartWalletConnected, smartWalletSendTransaction]);

  const retryStep = useCallback(() => {
    if (flow) {
      setError(null);
      setTxHash(null);
      transactionFlowManager.retryStep(flow.id);
      // Refresh flow state
      const updatedFlow = transactionFlowManager.getFlow(flow.id);
      if (updatedFlow) {
        setFlow({ ...updatedFlow });
      }
    }
  }, [flow]);

  const cancelFlow = useCallback(() => {
    if (flow) {
      transactionFlowManager.cancelFlow(flow.id);
      const updatedFlow = transactionFlowManager.getFlow(flow.id);
      if (updatedFlow) {
        setFlow({ ...updatedFlow });
      }
    }
  }, [flow]);

  // Computed values
  const currentStep = flow
    ? transactionFlowManager.getCurrentStep(flow.id)
    : null;
  const progress = flow ? transactionFlowManager.getFlowProgress(flow.id) : 0;
  const isActive = flow?.status === 'in_progress';
  const isPending = flow
    ? transactionFlowManager.hasPendingTransaction(flow.id)
    : false;

  return {
    flow,
    currentStep,
    progress,
    isActive,
    isPending,
    startFlow,
    executeCurrentStep,
    retryStep,
    cancelFlow,
    error,
    txHash,
  };
}
