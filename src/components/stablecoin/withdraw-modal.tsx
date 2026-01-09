'use client';

/**
 * WithdrawModal - Withdraw from Stable Yield positions
 *
 * Handles:
 * - Amount input with MAX button
 * - Preview of received amount
 * - Multi-step transaction flow
 * - Protocol-specific withdraw calls
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownToLine, Loader2, Check, AlertCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TokenLogo } from '@/components/ui/token-logo';
import type { UserStablecoinPosition } from '@/types/stablecoin';
import { formatUnits, parseUnits } from 'viem';
import { useProtocolAction } from '@/hooks/protocols/use-protocol-action';
import { getTxExplorerUrl } from '@/contracts/addresses/network-config';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: UserStablecoinPosition | null;
  onSuccess?: () => void;
}

type WithdrawStep = 'input' | 'withdrawing' | 'success' | 'error';

export function WithdrawModal({ isOpen, onClose, position, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<WithdrawStep>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTxHash, setLocalTxHash] = useState<string | null>(null);

  // Get protocol action hook for withdraw
  const protocolAction = useProtocolAction({
    protocol: position?.pool.protocol || 'aave',
    poolAddress: position?.pool.poolAddress || '0x0000000000000000000000000000000000000000',
    assetAddress: position?.pool.asset.address || '0x0000000000000000000000000000000000000000',
    assetSymbol: position?.pool.asset.symbol || 'USDC',
    decimals: position?.pool.asset.decimals || 6,
  });

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setAmount('');
        setStep('input');
        setErrorMessage(null);
        setLocalTxHash(null);
        protocolAction.reset();
      }, 200);
    }
  }, [isOpen]);

  // Watch for transaction completion
  useEffect(() => {
    if (step === 'withdrawing') {
      if (protocolAction.step === 'success' && protocolAction.txHash) {
        setLocalTxHash(protocolAction.txHash);
        setStep('success');
        onSuccess?.();
      } else if (protocolAction.step === 'error' && protocolAction.error) {
        setStep('error');
        setErrorMessage(protocolAction.error.message || 'Withdrawal failed');
      }
    }
  }, [step, protocolAction.step, protocolAction.txHash, protocolAction.error, onSuccess]);

  // Calculated values
  const decimals = position?.pool.asset.decimals || 6;
  const maxBalance = position ? Number(formatUnits(position.supplied.native, decimals)) : 0;
  const parsedAmount = amount ? parseFloat(amount) : 0;
  const isMax = parsedAmount >= maxBalance * 0.999; // Within 0.1% of max
  const hasInsufficientBalance = parsedAmount > maxBalance;

  // Preview output (1:1 for stablecoins, slight fee possible)
  const estimatedOutput = useMemo(() => {
    if (!parsedAmount || hasInsufficientBalance) return 0;
    // Most protocols have ~0 withdrawal fee for stablecoins
    return parsedAmount * 0.9999; // 0.01% slippage buffer
  }, [parsedAmount, hasInsufficientBalance]);

  const handleSetMax = () => {
    setAmount(maxBalance.toFixed(decimals > 6 ? 6 : decimals));
  };

  const handleWithdraw = async () => {
    if (!position || !amount) return;

    setErrorMessage(null);
    setStep('withdrawing');

    try {
      if (isMax) {
        await protocolAction.withdrawAll();
      } else {
        await protocolAction.withdraw(amount);
      }
    } catch (err) {
      setStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'Withdrawal failed');
    }
  };

  if (!position) return null;

  const symbol = position.pool.asset.symbol;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowDownToLine className="h-5 w-5 text-blue-400" />
            Withdraw from {position.pool.protocol.charAt(0).toUpperCase() + position.pool.protocol.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Position Info */}
              <div className="p-4 bg-surface/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Your Position</span>
                  <Badge variant="outline" className="text-green-400 border-green-400/50">
                    {position.currentApy.toFixed(2)}% APY
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={symbol} size="md" />
                  <div>
                    <p className="text-lg font-medium text-white">
                      {maxBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
                    </p>
                    <p className="text-sm text-gray-400">
                      ${position.supplied.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Withdraw Amount</label>
                  <button
                    onClick={handleSetMax}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    MAX
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="pr-20 text-lg font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {symbol}
                  </span>
                </div>
                {hasInsufficientBalance && (
                  <p className="text-xs text-red-400">Exceeds available balance</p>
                )}
              </div>

              {/* Preview */}
              {parsedAmount > 0 && !hasInsufficientBalance && (
                <div className="p-3 bg-surface/30 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">You will receive</span>
                    <span className="text-white font-medium">
                      ~{estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remaining position</span>
                    <span className="text-white">
                      {(maxBalance - parsedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                  Withdrawals are processed immediately. Your {symbol} will be sent to your wallet.
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleWithdraw}
                disabled={!amount || parsedAmount <= 0 || hasInsufficientBalance}
                className="w-full"
              >
                {hasInsufficientBalance ? 'Insufficient Balance' : `Withdraw ${amount || '0'} ${symbol}`}
              </Button>
            </motion.div>
          )}

          {step === 'withdrawing' && (
            <motion.div
              key="withdrawing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Processing Withdrawal</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Please wait while your withdrawal is being processed...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Withdrawal Successful!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Successfully withdrew {amount} {symbol}
                </p>
              </div>
              {localTxHash && (
                <a
                  href={getTxExplorerUrl(localTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  View Transaction
                </a>
              )}
              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Withdrawal Failed</h3>
                <p className="text-sm text-red-400 mt-1">
                  {errorMessage || 'Something went wrong'}
                </p>
              </div>
              <Button onClick={() => setStep('input')} variant="outline" className="w-full">
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
