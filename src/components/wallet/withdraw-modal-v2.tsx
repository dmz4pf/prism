'use client';

/**
 * WithdrawModalV2 - Withdraw tokens from Smart Wallet to EOA
 *
 * Handles:
 * - Native ETH withdrawals
 * - ERC20 token withdrawals
 * - Shows smart wallet balance and allows amount input
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenLogo } from '@/components/ui/token-logo';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { useSmartWallet, useWalletBalances } from '@/hooks/wallet';
import { encodeTransfer } from '@/services/swap-api';
import { formatAddress, getExplorerTxUrl } from '@/lib/smart-wallet';
import { formatUsd, formatTokenAmount, parseTokenAmount, NATIVE_TOKEN_ADDRESS } from '@/lib/tokens';
import type { TokenBalance } from '@/types/wallet';
import { TokenRow } from './token-list-v2';

interface WithdrawModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawStep = 'select' | 'amount' | 'confirming' | 'success' | 'error';

export function WithdrawModalV2({ isOpen, onClose }: WithdrawModalV2Props) {
  const { address: eoaAddress } = useAccount();
  const { smartWallet, sendTransaction } = useSmartWallet();
  const { balances, refetch: refetchBalances } = useWalletBalances();

  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<WithdrawStep>('select');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isConfirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && step === 'confirming') {
      setStep('success');
      // Refetch balances after successful withdrawal
      setTimeout(() => {
        refetchBalances();
      }, 2000);
    }
  }, [isSuccess, step, refetchBalances]);

  // Handle transaction error
  useEffect(() => {
    if (isConfirmError && step === 'confirming') {
      setStep('error');
      setErrorMessage('Transaction failed on-chain');
    }
  }, [isConfirmError, step]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedToken(null);
        setAmount('');
        setStep('select');
        setErrorMessage(null);
        setTxHash(undefined);
      }, 200);
    }
  }, [isOpen]);

  const parsedAmount = selectedToken && amount
    ? parseTokenAmount(amount, selectedToken.decimals)
    : 0n;

  const hasInsufficientBalance = selectedToken
    ? parsedAmount > selectedToken.balanceRaw
    : false;

  const handleSelectToken = (token: TokenBalance) => {
    setSelectedToken(token);
    setStep('amount');
  };

  const handleWithdraw = async () => {
    if (!smartWallet?.address || !eoaAddress || !selectedToken || parsedAmount <= 0n) return;

    setErrorMessage(null);
    setStep('confirming');

    try {
      let hash: `0x${string}`;

      if (selectedToken.address === null) {
        // Native ETH withdrawal
        hash = await sendTransaction({
          to: eoaAddress,
          value: parsedAmount,
        });
      } else {
        // ERC20 transfer
        const data = encodeTransfer(eoaAddress, parsedAmount);
        hash = await sendTransaction({
          to: selectedToken.address,
          data,
        });
      }

      setTxHash(hash);
      // useWaitForTransactionReceipt will handle success/error states
    } catch (err) {
      setStep('error');
      // Extract user-friendly error message
      const message = err instanceof Error ? err.message : 'Withdrawal failed';
      if (message.includes('User rejected') || message.includes('user rejected')) {
        setErrorMessage('Transaction was rejected');
      } else if (message.includes('insufficient funds')) {
        setErrorMessage('Insufficient funds for gas');
      } else {
        setErrorMessage(message.slice(0, 100));
      }
    }
  };

  const handleSetMax = () => {
    if (selectedToken) {
      setAmount(formatTokenAmount(selectedToken.balanceRaw, selectedToken.decimals));
    }
  };

  const handleBack = () => {
    if (step === 'amount') {
      setStep('select');
      setSelectedToken(null);
      setAmount('');
    }
  };

  // Filter tokens with balance
  const tokensWithBalance = balances.filter((b) => b.balanceRaw > 0n);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowUp className="h-5 w-5 text-blue-400" />
            Withdraw to EOA
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-400">
                Select a token to withdraw from your smart wallet
              </p>

              {tokensWithBalance.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No tokens available to withdraw</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tokensWithBalance.map((token) => (
                    <TokenRow
                      key={token.address || 'native-eth'}
                      token={token}
                      onClick={() => handleSelectToken(token)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 'amount' && selectedToken && (
            <motion.div
              key="amount"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* From/To Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <span className="text-sm text-gray-400">From (Smart Wallet)</span>
                  <span className="font-mono text-sm text-blue-400">
                    {smartWallet ? formatAddress(smartWallet.address) : '—'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <ArrowUp className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                  <span className="text-sm text-gray-400">To (EOA)</span>
                  <span className="font-mono text-sm text-white">
                    {eoaAddress ? formatAddress(eoaAddress) : '—'}
                  </span>
                </div>
              </div>

              {/* Selected Token Display */}
              <div className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <TokenLogo symbol={selectedToken.symbol} size="md" />
                  <div>
                    <p className="text-sm font-medium text-white">{selectedToken.symbol}</p>
                    <p className="text-xs text-gray-500">{selectedToken.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Change
                </Button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Amount</label>
                  <button
                    onClick={handleSetMax}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Max: {formatTokenAmount(selectedToken.balanceRaw, selectedToken.decimals)}
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <TokenLogo symbol={selectedToken.symbol} size="sm" />
                    <span className="text-sm text-gray-400">{selectedToken.symbol}</span>
                  </div>
                </div>
                {hasInsufficientBalance && (
                  <p className="text-xs text-red-400">Insufficient balance</p>
                )}
              </div>

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdraw}
                disabled={!amount || parsedAmount <= 0n || hasInsufficientBalance}
                className="w-full"
              >
                Withdraw {selectedToken.symbol}
              </Button>
            </motion.div>
          )}

          {step === 'confirming' && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {txHash ? 'Transaction Pending' : 'Confirm in Wallet'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {txHash
                    ? 'Waiting for blockchain confirmation...'
                    : 'Please confirm the transaction in your wallet'}
                </p>
              </div>
              {txHash && (
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
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
                  {amount} {selectedToken?.symbol} has been sent to your EOA
                </p>
              </div>
              {txHash && (
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                >
                  View Transaction
                  <ExternalLink className="h-3 w-3" />
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
              <Button onClick={() => setStep('amount')} variant="outline" className="w-full">
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
