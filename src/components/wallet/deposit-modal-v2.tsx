'use client';

/**
 * DepositModalV2 - Deposit tokens from EOA to Smart Wallet
 *
 * Deposits are simple on-chain transfers:
 * - ETH: Direct transfer from EOA to smart wallet address
 * - ERC20: Token transfer from EOA to smart wallet address
 *
 * The smart wallet doesn't need to be "deployed" to receive funds.
 * Any Ethereum address can receive tokens.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TokenLogo } from '@/components/ui/token-logo';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import { useSmartWallet, useWalletBalances } from '@/hooks/wallet';
import { formatAddress, getExplorerTxUrl } from '@/lib/smart-wallet';
import { formatTokenAmount, parseTokenAmount, NATIVE_TOKEN_ADDRESS, TOKEN_LIST } from '@/lib/tokens';
import type { TokenInfo } from '@/lib/tokens';

interface DepositModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

type DepositStep = 'input' | 'confirming' | 'waiting' | 'success' | 'error';

export function DepositModalV2({ isOpen, onClose }: DepositModalV2Props) {
  const { address: eoaAddress } = useAccount();
  const { smartWallet } = useSmartWallet();
  const { refetch: refetchBalances } = useWalletBalances();

  const [selectedToken, setSelectedToken] = useState<TokenInfo>(TOKEN_LIST[0]); // ETH by default
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<DepositStep>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get EOA balance for selected token
  const { data: eoaBalance, refetch: refetchEoaBalance } = useBalance({
    address: eoaAddress,
    token: selectedToken.address === NATIVE_TOKEN_ADDRESS ? undefined : selectedToken.address,
    query: {
      enabled: !!eoaAddress,
    },
  });

  // Send transaction hook
  const {
    sendTransaction,
    data: txHash,
    isPending,
    isError: isSendError,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isConfirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle transaction lifecycle
  useEffect(() => {
    if (isPending) {
      setStep('confirming');
    }
  }, [isPending]);

  useEffect(() => {
    if (txHash && !isSuccess && !isConfirmError) {
      setStep('waiting');
    }
  }, [txHash, isSuccess, isConfirmError]);

  useEffect(() => {
    if (isSuccess) {
      setStep('success');
      // Refetch balances after successful deposit
      setTimeout(() => {
        refetchBalances();
        refetchEoaBalance();
      }, 2000); // Wait 2s for chain to update
    }
  }, [isSuccess, refetchBalances, refetchEoaBalance]);

  useEffect(() => {
    if (isSendError && sendError) {
      setStep('error');
      // Extract user-friendly error message
      const message = sendError.message || 'Transaction failed';
      if (message.includes('User rejected') || message.includes('user rejected')) {
        setErrorMessage('Transaction was rejected in wallet');
      } else if (message.includes('insufficient funds')) {
        setErrorMessage('Insufficient funds for gas');
      } else {
        setErrorMessage(message.slice(0, 100));
      }
    }
  }, [isSendError, sendError]);

  useEffect(() => {
    if (isConfirmError) {
      setStep('error');
      setErrorMessage('Transaction failed on-chain');
    }
  }, [isConfirmError]);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      // Reset after a short delay to allow close animation
      setTimeout(() => {
        setAmount('');
        setStep('input');
        setErrorMessage(null);
        resetSend();
      }, 200);
    }
  }, [isOpen, resetSend]);

  const parsedAmount = amount ? parseTokenAmount(amount, selectedToken.decimals) : 0n;

  const hasInsufficientBalance = eoaBalance ? parsedAmount > eoaBalance.value : false;

  const canDeposit =
    !!smartWallet?.address &&
    !!eoaAddress &&
    parsedAmount > 0n &&
    !hasInsufficientBalance &&
    step === 'input';

  const handleDeposit = async () => {
    if (!canDeposit) return;

    setErrorMessage(null);

    try {
      if (selectedToken.address === NATIVE_TOKEN_ADDRESS) {
        // Native ETH transfer - simple send to smart wallet address
        console.log('Depositing ETH to:', smartWallet!.address);
        sendTransaction({
          to: smartWallet!.address,
          value: parsedAmount,
        });
      } else {
        // ERC20 transfer
        const transferData = encodeFunctionData({
          abi: [{
            name: 'transfer',
            type: 'function',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ type: 'bool' }],
          }],
          functionName: 'transfer',
          args: [smartWallet!.address, parsedAmount],
        });

        sendTransaction({
          to: selectedToken.address,
          data: transferData,
        });
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initiate deposit');
    }
  };

  const handleSetMax = () => {
    if (eoaBalance) {
      if (selectedToken.address === NATIVE_TOKEN_ADDRESS) {
        // For ETH, leave some for gas (~0.001 ETH)
        const gasBuffer = parseEther('0.001');
        const maxAmount = eoaBalance.value > gasBuffer ? eoaBalance.value - gasBuffer : 0n;
        setAmount(formatTokenAmount(maxAmount, selectedToken.decimals));
      } else {
        setAmount(formatTokenAmount(eoaBalance.value, selectedToken.decimals));
      }
    }
  };

  const handleRetry = () => {
    setStep('input');
    setErrorMessage(null);
    resetSend();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowDown className="h-5 w-5 text-blue-400" />
            Deposit to Smart Wallet
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
              {/* From/To Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg">
                  <span className="text-sm text-gray-400">From (Your Wallet)</span>
                  <span className="font-mono text-sm text-white">
                    {eoaAddress ? formatAddress(eoaAddress) : '—'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <ArrowDown className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <span className="text-sm text-gray-400">To (Smart Wallet)</span>
                  <span className="font-mono text-sm text-blue-400">
                    {smartWallet ? formatAddress(smartWallet.address) : '—'}
                  </span>
                </div>
              </div>

              {/* Token Selection - Only ETH for now on testnet */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Token</label>
                <div className="grid grid-cols-3 gap-2">
                  {TOKEN_LIST.slice(0, 3).map((token) => (
                    <button
                      key={token.address}
                      onClick={() => setSelectedToken(token)}
                      className={`
                        p-2 rounded-lg border transition-colors flex items-center gap-2
                        ${selectedToken.address === token.address
                          ? 'bg-blue-500/20 border-blue-500'
                          : 'bg-surface/30 border-border hover:border-slate-600'
                        }
                      `}
                    >
                      <TokenLogo symbol={token.symbol} size="sm" />
                      <span className="text-sm text-white">{token.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Amount</label>
                  <button
                    onClick={handleSetMax}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Max: {eoaBalance ? formatTokenAmount(eoaBalance.value, selectedToken.decimals) : '0'}
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

              {/* Info Box */}
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-xs text-blue-300">
                  This sends {selectedToken.symbol} from your wallet to your smart wallet address.
                  It's a standard on-chain transfer.
                </p>
              </div>

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={!canDeposit}
                className="w-full"
              >
                Deposit {selectedToken.symbol}
              </Button>
            </motion.div>
          )}

          {(step === 'confirming' || step === 'waiting') && (
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
                  {step === 'confirming' ? 'Confirm in Wallet' : 'Transaction Pending'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {step === 'confirming'
                    ? 'Please confirm the transaction in your wallet'
                    : 'Waiting for blockchain confirmation...'}
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
                <h3 className="text-lg font-semibold text-white">Deposit Successful!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {amount} {selectedToken.symbol} has been deposited to your smart wallet
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
                <h3 className="text-lg font-semibold text-white">Deposit Failed</h3>
                <p className="text-sm text-red-400 mt-1">
                  {errorMessage || 'Something went wrong'}
                </p>
              </div>
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
