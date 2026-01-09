/**
 * Transaction Flow Manager
 * Manages multi-step transaction flows with visual progress tracking
 *
 * Flow Map Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    TRANSACTION FLOW MAP                          │
 * │   Step 1              Step 2              Step 3                │
 * │  ┌─────────┐        ┌─────────┐        ┌─────────┐              │
 * │  │ Approve │───────▶│  Swap   │───────▶│ Supply  │              │
 * │  │  WETH   │        │WETH→LST │        │to Aave  │              │
 * │  └─────────┘        └─────────┘        └─────────┘              │
 * │      ⬤                  ○                  ○                    │
 * │   Completed           Pending            Pending                │
 * └─────────────────────────────────────────────────────────────────┘
 */

import type {
  TransactionFlow,
  TransactionStep,
  TransactionStepStatus,
} from '@/types/staking';
import type { Address, Hex, TransactionReceipt } from 'viem';

// Flow storage key
const FLOW_STORAGE_KEY = 'prism_transaction_flows';

// Event types for flow updates
export type FlowEventType =
  | 'step_started'
  | 'step_signed'
  | 'step_confirmed'
  | 'step_failed'
  | 'flow_completed'
  | 'flow_failed';

export interface FlowEvent {
  type: FlowEventType;
  flowId: string;
  stepId?: string;
  txHash?: Hex;
  error?: string;
  timestamp: number;
}

type FlowListener = (event: FlowEvent) => void;

class TransactionFlowManager {
  private flows: Map<string, TransactionFlow> = new Map();
  private listeners: Set<FlowListener> = new Set();
  private pendingReceipts: Map<string, Promise<TransactionReceipt>> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load flows from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(FLOW_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as TransactionFlow[];
        // Only load incomplete flows from last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        data.forEach((flow) => {
          const startTime = flow.startedAt ? new Date(flow.startedAt).getTime() : 0;
          if (flow.status === 'in_progress' && startTime > cutoff) {
            this.flows.set(flow.id, flow);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load flows from storage:', error);
    }
  }

  /**
   * Save flows to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = Array.from(this.flows.values());
      localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save flows to storage:', error);
    }
  }

  /**
   * Subscribe to flow events
   */
  subscribe(listener: FlowListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit flow event
   */
  private emit(event: FlowEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Start a new transaction flow
   */
  startFlow(flow: TransactionFlow): TransactionFlow {
    const initializedFlow: TransactionFlow = {
      ...flow,
      status: 'in_progress',
      currentStep: 0,
      startedAt: new Date().toISOString(),
      steps: flow.steps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'ready' : 'pending',
      })),
    };

    this.flows.set(initializedFlow.id, initializedFlow);
    this.saveToStorage();

    return initializedFlow;
  }

  /**
   * Get flow by ID
   */
  getFlow(flowId: string): TransactionFlow | null {
    return this.flows.get(flowId) || null;
  }

  /**
   * Get all active flows
   */
  getActiveFlows(): TransactionFlow[] {
    return Array.from(this.flows.values()).filter(
      (flow) => flow.status === 'in_progress'
    );
  }

  /**
   * Get current step of a flow
   */
  getCurrentStep(flowId: string): TransactionStep | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;
    return flow.steps[flow.currentStep] || null;
  }

  /**
   * Mark current step as signing
   */
  markStepSigning(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (!flow) return;

    const currentStep = flow.steps[flow.currentStep];
    if (currentStep) {
      currentStep.status = 'signing';
      this.flows.set(flowId, flow);
      this.saveToStorage();

      this.emit({
        type: 'step_started',
        flowId,
        stepId: currentStep.id,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Mark current step as confirming (transaction sent)
   */
  markStepConfirming(flowId: string, txHash: Hex): void {
    const flow = this.flows.get(flowId);
    if (!flow) return;

    const currentStep = flow.steps[flow.currentStep];
    if (currentStep) {
      currentStep.status = 'confirming';
      currentStep.txHash = txHash;
      this.flows.set(flowId, flow);
      this.saveToStorage();

      this.emit({
        type: 'step_signed',
        flowId,
        stepId: currentStep.id,
        txHash,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Complete current step and advance to next
   */
  completeStep(flowId: string, receipt?: TransactionReceipt): void {
    const flow = this.flows.get(flowId);
    if (!flow) return;

    const currentStep = flow.steps[flow.currentStep];
    if (currentStep) {
      currentStep.status = 'completed';

      this.emit({
        type: 'step_confirmed',
        flowId,
        stepId: currentStep.id,
        txHash: currentStep.txHash,
        timestamp: Date.now(),
      });

      // Advance to next step or complete flow
      if (flow.currentStep < flow.steps.length - 1) {
        flow.currentStep++;
        flow.steps[flow.currentStep].status = 'ready';
      } else {
        // All steps completed
        flow.status = 'completed';
        flow.completedAt = new Date().toISOString();

        this.emit({
          type: 'flow_completed',
          flowId,
          timestamp: Date.now(),
        });
      }

      this.flows.set(flowId, flow);
      this.saveToStorage();
    }
  }

  /**
   * Mark step as failed
   */
  failStep(flowId: string, error: string): void {
    const flow = this.flows.get(flowId);
    if (!flow) return;

    const currentStep = flow.steps[flow.currentStep];
    if (currentStep) {
      currentStep.status = 'failed';
      currentStep.error = error;
      flow.status = 'failed';

      this.flows.set(flowId, flow);
      this.saveToStorage();

      this.emit({
        type: 'step_failed',
        flowId,
        stepId: currentStep.id,
        error,
        timestamp: Date.now(),
      });

      this.emit({
        type: 'flow_failed',
        flowId,
        error,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Retry failed step
   */
  retryStep(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (!flow || flow.status !== 'failed') return;

    const currentStep = flow.steps[flow.currentStep];
    if (currentStep && currentStep.status === 'failed') {
      currentStep.status = 'ready';
      currentStep.error = undefined;
      flow.status = 'in_progress';

      this.flows.set(flowId, flow);
      this.saveToStorage();
    }
  }

  /**
   * Cancel a flow
   */
  cancelFlow(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (!flow || flow.status !== 'in_progress') return;

    flow.status = 'failed';
    const currentStep = flow.steps[flow.currentStep];
    if (currentStep && currentStep.status !== 'completed') {
      currentStep.status = 'failed';
      currentStep.error = 'Cancelled by user';
    }

    this.flows.set(flowId, flow);
    this.saveToStorage();
  }

  /**
   * Clear completed flows
   */
  clearCompletedFlows(): void {
    const activeFlows = Array.from(this.flows.values()).filter(
      (flow) => flow.status === 'in_progress'
    );
    this.flows.clear();
    activeFlows.forEach((flow) => this.flows.set(flow.id, flow));
    this.saveToStorage();
  }

  /**
   * Get flow progress percentage
   */
  getFlowProgress(flowId: string): number {
    const flow = this.flows.get(flowId);
    if (!flow) return 0;

    const completedSteps = flow.steps.filter(
      (step) => step.status === 'completed'
    ).length;
    return (completedSteps / flow.steps.length) * 100;
  }

  /**
   * Get estimated time remaining for flow
   */
  getEstimatedTimeRemaining(flowId: string): number {
    const flow = this.flows.get(flowId);
    if (!flow) return 0;

    const remainingSteps = flow.steps.length - flow.currentStep;
    // Estimate ~15 seconds per step (signing + confirmation)
    return remainingSteps * 15;
  }

  /**
   * Simulate a transaction step before executing
   * Helps prevent failed transactions by testing beforehand
   */
  async simulateStep(
    step: TransactionStep,
    userAddress: Address,
    publicClient: any
  ): Promise<{
    success: boolean;
    error?: string;
    gasEstimate?: bigint;
  }> {
    try {
      // Only simulate contract calls, not simple transfers
      if (!step.data || step.data === '0x') {
        return { success: true };
      }

      // Attempt to estimate gas for the transaction
      const gasEstimate = await publicClient.estimateGas({
        to: step.to,
        data: step.data,
        account: userAddress,
        value: step.value || 0n,
      });

      return {
        success: true,
        gasEstimate,
      };
    } catch (error: any) {
      console.error('Transaction simulation failed:', error);

      // Parse error message for user-friendly feedback
      let errorMessage = 'Simulation failed';

      if (error.message) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance for gas';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction would fail - check amount and slippage';
        } else if (error.message.includes('allowance')) {
          errorMessage = 'Token approval required';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Slippage tolerance too low';
        } else {
          errorMessage = error.shortMessage || error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if flow has pending transactions
   */
  hasPendingTransaction(flowId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;

    return flow.steps.some(
      (step) => step.status === 'signing' || step.status === 'confirming'
    );
  }
}

// Export singleton
export const transactionFlowManager = new TransactionFlowManager();

// Export class for testing
export { TransactionFlowManager };
