'use client';

/**
 * TransactionSteps - Multi-step transaction progress indicator
 *
 * Shows the progress of multi-step DeFi transactions (e.g., approve + deposit).
 * Follows the Jupiter/1inch pattern of clear transaction status.
 */

import { Check, Loader2, XCircle, Circle, ExternalLink } from 'lucide-react';
import type { TransactionStep, TransactionStepStatus } from '@/types';

interface TransactionStepsProps {
  steps: TransactionStep[];
  className?: string;
}

function StepIcon({ status }: { status: TransactionStepStatus }) {
  switch (status) {
    case 'success':
      return (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </div>
      );
    case 'active':
      return (
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </div>
      );
    case 'error':
      return (
        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <XCircle className="h-4 w-4 text-white" />
        </div>
      );
    case 'skipped':
      return (
        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
          <Circle className="h-3 w-3 text-gray-400" />
        </div>
      );
    default: // pending
      return (
        <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
          <Circle className="h-3 w-3 text-gray-500" />
        </div>
      );
  }
}

function StepConnector({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`w-0.5 h-6 mx-3 ${
        isActive ? 'bg-blue-500' : 'bg-gray-600'
      }`}
    />
  );
}

export function TransactionSteps({ steps, className = '' }: TransactionStepsProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {steps.map((step, index) => (
        <div key={step.id}>
          <div className="flex items-start gap-3">
            <StepIcon status={step.status} />
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p
                  className={`text-sm font-medium ${
                    step.status === 'active'
                      ? 'text-blue-400'
                      : step.status === 'success'
                      ? 'text-green-400'
                      : step.status === 'error'
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                {step.txHash && step.status === 'success' && (
                  <a
                    href={`https://basescan.org/tx/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              )}
              {step.error && (
                <p className="text-xs text-red-400 mt-0.5">{step.error}</p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <StepConnector
              isActive={step.status === 'success' || step.status === 'active'}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper to create initial steps for common operations
export function createApproveDepositSteps(
  tokenSymbol: string,
  protocol: string
): TransactionStep[] {
  return [
    {
      id: 'approve',
      label: `Approve ${tokenSymbol}`,
      description: `Allow ${protocol} to use your ${tokenSymbol}`,
      status: 'pending',
    },
    {
      id: 'deposit',
      label: `Deposit to ${protocol}`,
      description: `Supply ${tokenSymbol} to earn yield`,
      status: 'pending',
    },
  ];
}

export function createSupplyETHSteps(protocol: string): TransactionStep[] {
  return [
    {
      id: 'supply',
      label: `Supply ETH to ${protocol}`,
      description: 'ETH will be wrapped and supplied in one transaction',
      status: 'pending',
    },
  ];
}

export function createWithdrawSteps(
  tokenSymbol: string,
  protocol: string
): TransactionStep[] {
  return [
    {
      id: 'withdraw',
      label: `Withdraw from ${protocol}`,
      description: `Withdraw your ${tokenSymbol} back to your wallet`,
      status: 'pending',
    },
  ];
}
