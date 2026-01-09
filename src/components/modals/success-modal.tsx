'use client';

import { CheckCircle2, ExternalLink, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  txHash?: string;
  amount?: string;
  token?: string;
  apy?: number;
  showDashboardButton?: boolean;
  onDashboard?: () => void;
  customActions?: React.ReactNode;
}

const BASE_SCAN_URL = 'https://basescan.org/tx';

export function SuccessModal({
  open,
  onClose,
  title = 'Transaction Complete!',
  description,
  txHash,
  amount,
  token,
  apy,
  showDashboardButton = true,
  onDashboard,
  customActions,
}: SuccessModalProps) {
  const handleDashboard = () => {
    if (onDashboard) {
      onDashboard();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center">
        <div className="flex flex-col items-center pt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
          >
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </motion.div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-center">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-center">{description}</DialogDescription>
            )}
          </DialogHeader>

          {/* Amount Display */}
          {amount && token && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="my-6 prism-info-box-default w-full"
            >
              <p className="text-sm text-secondary-400 mb-1">You received</p>
              <p className="text-2xl font-bold font-mono text-white">
                {amount} {token}
              </p>
              {apy && (
                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    Now earning <span className="font-bold">{apy.toFixed(1)}% APY</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="w-full p-3 bg-surface/50 border border-border rounded-lg mb-4">
              <p className="text-xs text-secondary-400 mb-1">Transaction Hash</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-sm text-secondary-300 font-mono">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </code>
                <a
                  href={`${BASE_SCAN_URL}/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {customActions}

          {txHash && (
            <Button variant="outline" className="w-full" asChild>
              <a
                href={`${BASE_SCAN_URL}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on BaseScan
              </a>
            </Button>
          )}

          {showDashboardButton && (
            <Link href="/dashboard" className="w-full" onClick={handleDashboard}>
              <Button className="w-full">
                Back to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
