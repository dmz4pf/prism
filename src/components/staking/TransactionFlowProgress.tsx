/**
 * TransactionFlowProgress Component
 * Visual flow map showing transaction progress with arrows between steps
 *
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

'use client';

import React from 'react';
import type { TransactionFlow, TransactionStep, TransactionStepStatus } from '@/types/staking';
import { cn } from '@/lib/utils';

interface TransactionFlowProgressProps {
  flow: TransactionFlow;
  onExecuteStep?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
}

const STATUS_CONFIG: Record<
  TransactionStepStatus,
  { color: string; icon: string; label: string }
> = {
  pending: {
    color: 'text-muted-foreground border-muted',
    icon: '○',
    label: 'Pending',
  },
  ready: {
    color: 'text-primary border-primary',
    icon: '◎',
    label: 'Ready',
  },
  signing: {
    color: 'text-yellow-500 border-yellow-500 animate-pulse',
    icon: '◉',
    label: 'Sign in wallet',
  },
  confirming: {
    color: 'text-blue-500 border-blue-500 animate-pulse',
    icon: '◉',
    label: 'Confirming...',
  },
  completed: {
    color: 'text-green-500 border-green-500',
    icon: '●',
    label: 'Completed',
  },
  failed: {
    color: 'text-red-500 border-red-500',
    icon: '✕',
    label: 'Failed',
  },
};

function StepCard({
  step,
  index,
  isLast,
}: {
  step: TransactionStep;
  index: number;
  isLast: boolean;
}) {
  const config = STATUS_CONFIG[step.status];

  return (
    <div className="flex items-center">
      {/* Step card */}
      <div
        className={cn(
          'relative flex flex-col items-center p-4 rounded-lg border-2 min-w-[120px]',
          config.color
        )}
      >
        {/* Step number */}
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-background border-2 flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>

        {/* Step name */}
        <div className="font-medium text-sm text-center">{step.name}</div>

        {/* Step description */}
        <div className="text-xs text-muted-foreground mt-1 text-center line-clamp-2">
          {step.description}
        </div>

        {/* Status indicator */}
        <div className="mt-3 flex flex-col items-center">
          <span className="text-2xl">{config.icon}</span>
          <span className="text-xs mt-1">{config.label}</span>
        </div>

        {/* Transaction hash link */}
        {step.txHash && (
          <a
            href={`https://basescan.org/tx/${step.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2"
          >
            View tx
          </a>
        )}

        {/* Error message */}
        {step.error && (
          <div className="text-xs text-red-500 mt-2 text-center">
            {step.error}
          </div>
        )}
      </div>

      {/* Arrow to next step */}
      {!isLast && (
        <div className="flex items-center px-2">
          <div className="w-8 h-0.5 bg-muted-foreground/30" />
          <div className="text-muted-foreground">▶</div>
          <div className="w-8 h-0.5 bg-muted-foreground/30" />
        </div>
      )}
    </div>
  );
}

export function TransactionFlowProgress({
  flow,
  onExecuteStep,
  onRetry,
  onCancel,
}: TransactionFlowProgressProps) {
  const currentStep = flow.steps[flow.currentStep];
  const progress = (flow.steps.filter((s) => s.status === 'completed').length / flow.steps.length) * 100;

  return (
    <div className="w-full p-6 bg-card rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Transaction Flow</h3>
          <p className="text-sm text-muted-foreground">
            {flow.protocol} • {flow.type}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {flow.inputAmount} {flow.inputToken.symbol}
          </div>
          {flow.expectedOutput && (
            <div className="text-xs text-muted-foreground">
              → {flow.expectedOutput} {flow.outputToken?.symbol}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flow map */}
      <div className="flex items-center justify-center overflow-x-auto py-4">
        {flow.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isLast={index === flow.steps.length - 1}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4 mt-6">
        {currentStep?.status === 'ready' && onExecuteStep && (
          <button
            onClick={onExecuteStep}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Sign Transaction
          </button>
        )}

        {currentStep?.status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        )}

        {flow.status === 'in_progress' && onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
        )}

        {flow.status === 'completed' && (
          <div className="flex items-center gap-2 text-green-500">
            <span className="text-xl">✓</span>
            <span className="font-medium">Transaction Complete!</span>
          </div>
        )}
      </div>

      {/* Status messages */}
      {currentStep?.status === 'signing' && (
        <div className="text-center mt-4 text-yellow-500 animate-pulse">
          Please sign the transaction in your wallet...
        </div>
      )}

      {currentStep?.status === 'confirming' && (
        <div className="text-center mt-4 text-blue-500 animate-pulse">
          Waiting for transaction confirmation...
        </div>
      )}
    </div>
  );
}

export default TransactionFlowProgress;
