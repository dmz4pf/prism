'use client';

import { AlertTriangle, Info, Loader2, Fuel, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatUSD } from '@/lib/utils';

interface ConfirmationStep {
  label: string;
  description?: string;
}

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  steps?: ConfirmationStep[];
  gasEstimate?: string;
  totalValue?: number;
  warning?: string;
  isLoading?: boolean;
  confirmLabel?: string;
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  steps,
  gasEstimate,
  totalValue,
  warning,
  isLoading = false,
  confirmLabel = 'Confirm',
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Steps */}
          {steps && steps.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-secondary-300">Transaction steps:</p>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="prism-feature-item"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-blue-400">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      {step.description && (
                        <p className="text-xs text-secondary-400 mt-0.5">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gas & Value Summary */}
          <div className="prism-info-box-default space-y-3">
            {totalValue !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-400">Total Value</span>
                <span className="font-medium font-mono text-white">{formatUSD(totalValue)}</span>
              </div>
            )}
            {gasEstimate && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-secondary-400">
                  <Fuel className="h-3.5 w-3.5" />
                  <span>Estimated Gas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono text-white">~{gasEstimate}</span>
                  <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Low on Base</span>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          {warning && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">{warning}</p>
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 text-xs text-secondary-400">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>You will be asked to sign this transaction in your wallet.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
