'use client';

/**
 * DepositWithdrawModal - Phase 1 Implementation
 *
 * This modal allows users to deposit to and withdraw from DeFi protocols.
 * In Phase 1, we interact directly with protocols (e.g., Aave) rather than
 * through a smart wallet intermediary.
 *
 * Supported operations:
 * - Deposit ETH to Aave (via WETH Gateway)
 * - Deposit tokens to Aave (ERC20 approve + supply)
 * - Withdraw from Aave
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, ArrowUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrismWallet } from '@/hooks/wallet';
import { useAaveSupplyETH } from '@/hooks/protocols';
import { useAaveDeposit } from '@/hooks/protocols';
import { BASE_TOKENS } from '@/contracts/addresses';
import { TransactionSteps, createSupplyETHSteps } from './transaction-steps';
import type { TransactionStep } from '@/types';

type Mode = 'deposit' | 'withdraw';
type TokenType = 'ETH' | 'USDC';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

const SUPPORTED_TOKENS: { symbol: TokenType; name: string; address: string; decimals: number }[] = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: BASE_TOKENS.USDC, decimals: 6 },
];

export function DepositWithdrawModal({ isOpen, onClose, initialMode = 'deposit' }: DepositWithdrawModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [selectedToken, setSelectedToken] = useState<TokenType>('ETH');
  const [amount, setAmount] = useState('');
  const [txSteps, setTxSteps] = useState<TransactionStep[]>([]);

  const { ethBalance, isCorrectNetwork } = usePrismWallet();

  // Aave supply ETH hook
  const {
    step: supplyETHStep,
    isLoading: isSupplyingETH,
    error: supplyETHError,
    txHash: supplyETHTxHash,
    supply: supplyETH,
    reset: resetSupplyETH,
  } = useAaveSupplyETH();

  // Aave deposit (for ERC20 tokens)
  const aaveDeposit = useAaveDeposit({
    tokenAddress: BASE_TOKENS.USDC,
    tokenSymbol: 'USDC',
  });

  // Update transaction steps based on ETH supply progress
  useEffect(() => {
    if (selectedToken === 'ETH' && mode === 'deposit') {
      const steps = createSupplyETHSteps('Aave');

      if (supplyETHStep === 'idle') {
        steps[0].status = 'pending';
      } else if (supplyETHStep === 'supplying') {
        steps[0].status = 'active';
      } else if (supplyETHStep === 'success') {
        steps[0].status = 'success';
        steps[0].txHash = supplyETHTxHash;
      } else if (supplyETHStep === 'error') {
        steps[0].status = 'error';
        steps[0].error = supplyETHError?.message || 'Transaction failed';
      }

      setTxSteps(steps);
    }
  }, [selectedToken, mode, supplyETHStep, supplyETHTxHash, supplyETHError]);

  // Handle mode change
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    if (mode === 'deposit') {
      if (selectedToken === 'ETH') {
        await supplyETH(amount);
      } else if (selectedToken === 'USDC') {
        // Check allowance and approve if needed
        const hasAllowance = await aaveDeposit.checkAllowance(amount);
        if (!hasAllowance) {
          aaveDeposit.approve(amount);
        } else {
          aaveDeposit.deposit(amount);
        }
      }
    } else {
      // Withdraw logic would go here
      console.log('Withdraw not yet implemented');
    }
  };

  const handleClose = () => {
    setAmount('');
    setTxSteps([]);
    resetSupplyETH();
    aaveDeposit.reset();
    onClose();
  };

  const isLoading = isSupplyingETH || aaveDeposit.isLoading;
  const isSuccess = supplyETHStep === 'success' || aaveDeposit.step === 'success';
  const hasError = supplyETHStep === 'error' || aaveDeposit.step === 'error';

  const getAvailableBalance = () => {
    if (selectedToken === 'ETH') {
      return ethBalance;
    }
    return '—'; // Would need to fetch USDC balance
  };

  const setMaxAmount = () => {
    const balance = getAvailableBalance();
    if (balance !== '—') {
      // Reserve some ETH for gas
      if (selectedToken === 'ETH') {
        const maxEth = Math.max(0, parseFloat(balance) - 0.005);
        setAmount(maxEth.toString());
      } else {
        setAmount(balance);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="bg-background-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white">
                {mode === 'deposit' ? 'Deposit to Aave' : 'Withdraw from Aave'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Wrong Network Warning */}
              {!isCorrectNetwork && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-400">
                    Please switch to Base network to continue.
                  </p>
                </div>
              )}

              {/* Success State */}
              {isSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Transaction Successful!</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your {selectedToken} has been supplied to Aave.
                  </p>
                  <Button onClick={handleClose} className="mt-4">
                    Done
                  </Button>
                </div>
              )}

              {/* Main Form - Hide when success */}
              {!isSuccess && (
                <>
                  {/* Mode Toggle */}
                  <div className="flex rounded-lg bg-surface p-1">
                    <button
                      onClick={() => setMode('deposit')}
                      disabled={isLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        mode === 'deposit'
                          ? 'bg-primary text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <ArrowDown className="h-4 w-4" />
                      Deposit
                    </button>
                    <button
                      onClick={() => setMode('withdraw')}
                      disabled={isLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        mode === 'withdraw'
                          ? 'bg-primary text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Withdraw
                    </button>
                  </div>

                  {/* Token Selection */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Token</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUPPORTED_TOKENS.map(t => (
                        <button
                          key={t.symbol}
                          onClick={() => setSelectedToken(t.symbol)}
                          disabled={isLoading}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            selectedToken === t.symbol
                              ? 'border-blue-500 bg-blue-500/10 text-white'
                              : 'border-border bg-surface text-gray-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="w-8 h-8 mx-auto rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold mb-1">
                            {t.symbol.slice(0, 2)}
                          </div>
                          <span className="text-xs">{t.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-400">Amount</label>
                      <button
                        onClick={setMaxAmount}
                        disabled={isLoading}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Balance: {getAvailableBalance()} {selectedToken}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={isLoading}
                        className="bg-surface border-border text-white text-lg pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {selectedToken}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Steps - Show when processing */}
                  {txSteps.length > 0 && isLoading && (
                    <div className="p-3 bg-surface/50 rounded-lg">
                      <TransactionSteps steps={txSteps} />
                    </div>
                  )}

                  {/* Error Display */}
                  {hasError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">
                        {supplyETHError?.message || aaveDeposit.error?.message || 'Transaction failed'}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="prism-info-box-default space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Protocol</span>
                      <span className="text-white">Aave V3</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Network</span>
                      <span className="text-white">Base</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Est. Gas</span>
                      <span className="text-white">~$0.05</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!amount || parseFloat(amount) <= 0 || isLoading || !isCorrectNetwork}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'deposit' ? 'Supply' : 'Withdraw'} {selectedToken}
                      </>
                    )}
                  </Button>

                  {/* Security Note */}
                  <p className="text-xs text-gray-500 text-center">
                    {mode === 'deposit'
                      ? 'Your funds are supplied directly to Aave. You earn interest and can withdraw anytime.'
                      : 'Funds will be withdrawn from Aave to your wallet.'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
