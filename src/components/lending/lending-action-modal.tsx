'use client';

/**
 * LendingActionModal Component
 *
 * Modal for confirming and executing lending actions with step-by-step flow.
 */

import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { LendingProtocol, LendingMarket, LendingPosition, TransactionCall } from '@/types/lending';
import { useLendingActions, LendingActionType } from '@/hooks/lending';
import { formatNumber } from '@/lib/utils';
import {
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LendingForm, LendingFormAction } from './lending-form';

// =============================================================================
// TYPES
// =============================================================================

export interface LendingActionModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal */
  onClose: () => void;
  /** Action type */
  action: LendingFormAction;
  /** Asset symbol */
  assetSymbol: string;
  /** Asset address */
  assetAddress: Address;
  /** Asset decimals */
  assetDecimals: number;
  /** Pre-selected protocol */
  protocol?: LendingProtocol;
  /** Pre-selected market ID */
  marketId?: string;
  /** Existing position (for withdraw/repay) */
  position?: LendingPosition;
  /** On success callback */
  onSuccess?: () => void;
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: {
  steps: string[];
  currentStep: number;
  completedSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const isCompleted = index < completedSteps;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-prism text-white' : ''}
                ${!isCompleted && !isCurrent ? 'bg-surface text-gray-400' : ''}
              `}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            <span
              className={`text-sm ${isCurrent ? 'text-white' : 'text-gray-400'}`}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-600 mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LendingActionModal({
  isOpen,
  onClose,
  action,
  assetSymbol,
  assetAddress,
  assetDecimals,
  protocol,
  marketId,
  position,
  onSuccess,
}: LendingActionModalProps) {
  const { address: userAddress } = useAccount();
  const {
    state,
    supply,
    withdraw,
    borrow,
    repay,
    reset,
  } = useLendingActions();

  // Modal states
  const [formData, setFormData] = useState<{
    protocol: LendingProtocol;
    marketId: string;
    amount: bigint;
    isMax: boolean;
  } | null>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      reset();
      setFormData(null);
    }
  }, [isOpen, reset]);

  // Handle form submit
  const handleFormSubmit = async (data: {
    protocol: LendingProtocol;
    marketId: string;
    amount: bigint;
    isMax: boolean;
  }) => {
    setFormData(data);

    try {
      const params = {
        marketId: data.marketId,
        asset: assetAddress,
        amount: data.amount,
        maxWithdraw: data.isMax && action === 'withdraw',
        maxRepay: data.isMax && action === 'repay',
      };

      switch (action) {
        case 'supply':
          await supply(data.protocol, params);
          break;
        case 'withdraw':
          await withdraw(data.protocol, params);
          break;
        case 'borrow':
          await borrow(data.protocol, params);
          break;
        case 'repay':
          await repay(data.protocol, params);
          break;
      }

      onSuccess?.();
    } catch (error) {
      console.error('Lending action failed:', error);
    }
  };

  // Get action label
  const actionLabel = {
    supply: 'Supply',
    withdraw: 'Withdraw',
    borrow: 'Borrow',
    repay: 'Repay',
  }[action];

  // Determine step labels
  const steps = state.calls.length > 1
    ? state.calls.map((c) => c.description?.split(' ')[0] || 'Step')
    : [actionLabel];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {actionLabel} {assetSymbol}
          </DialogTitle>
          <DialogDescription>
            {action === 'supply' && 'Supply assets to earn interest'}
            {action === 'withdraw' && 'Withdraw your supplied assets'}
            {action === 'borrow' && 'Borrow assets against your collateral'}
            {action === 'repay' && 'Repay your borrowed assets'}
          </DialogDescription>
        </DialogHeader>

        {/* Form State - Not yet submitted */}
        {!state.isPending && !state.isSuccess && !state.error && (
          <LendingForm
            action={action}
            assetSymbol={assetSymbol}
            assetAddress={assetAddress}
            assetDecimals={assetDecimals}
            protocol={protocol}
            marketId={marketId}
            position={position}
            onSubmit={handleFormSubmit}
            isSubmitting={false}
            onCancel={onClose}
          />
        )}

        {/* Pending State */}
        {state.isPending && (
          <div className="py-8 text-center">
            {/* Step Indicator */}
            {state.totalSteps > 1 && (
              <StepIndicator
                steps={steps}
                currentStep={state.currentStep}
                completedSteps={state.currentStep}
              />
            )}

            {/* Loading Animation */}
            <div className="mb-4">
              <Loader2 className="w-16 h-16 mx-auto text-prism animate-spin" />
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {state.calls[state.currentStep]?.description || 'Processing...'}
            </h3>

            <p className="text-sm text-gray-400 mb-4">
              Please confirm the transaction in your wallet
            </p>

            {/* Transaction Hash */}
            {state.txHash && (
              <a
                href={`https://basescan.org/tx/${state.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-prism hover:underline"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Success State */}
        {state.isSuccess && (
          <div className="py-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">Transaction Successful!</h3>

            <p className="text-sm text-gray-400 mb-4">
              Your {actionLabel.toLowerCase()} of{' '}
              {formData && formatNumber(Number(formData.amount) / 10 ** assetDecimals)}{' '}
              {assetSymbol} was successful.
            </p>

            {state.txHash && (
              <a
                href={`https://basescan.org/tx/${state.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-prism hover:underline mb-6"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="py-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">Transaction Failed</h3>

            <p className="text-sm text-red-400 mb-4">
              {state.error.message || 'Something went wrong'}
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => formData && handleFormSubmit(formData)}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LendingActionModal;
