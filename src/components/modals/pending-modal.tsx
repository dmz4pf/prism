'use client';

import { Check, Loader2, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type TransactionStep = {
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  txHash?: string;
};

interface PendingModalProps {
  open: boolean;
  title?: string;
  description?: string;
  steps: TransactionStep[];
}

export function PendingModal({
  open,
  title = 'Transaction Pending',
  description = 'Please wait while your transaction is being processed...',
  steps,
}: PendingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                step.status === 'in_progress' && 'bg-blue-500/10 border border-blue-500/20',
                step.status === 'completed' && 'bg-green-500/10',
                step.status === 'error' && 'bg-red-500/10',
                step.status === 'pending' && 'bg-surface/30 border border-border'
              )}
            >
              <div className="flex-shrink-0">
                {step.status === 'completed' ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : step.status === 'in_progress' ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                  </div>
                ) : step.status === 'error' ? (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-xs text-white">!</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-secondary-600 flex items-center justify-center">
                    <Circle className="h-3 w-3 text-secondary-500" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'completed' && 'text-green-400',
                    step.status === 'in_progress' && 'text-white',
                    step.status === 'error' && 'text-red-400',
                    step.status === 'pending' && 'text-secondary-500'
                  )}
                >
                  {step.label}
                </p>
                {step.txHash && (
                  <p className="text-xs text-secondary-500 font-mono mt-0.5">
                    {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                  </p>
                )}
              </div>

              {step.status === 'completed' && (
                <Check className="h-4 w-4 text-green-400" />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-secondary-500 text-center">
          Do not close this window until all steps are complete.
        </p>
      </DialogContent>
    </Dialog>
  );
}
