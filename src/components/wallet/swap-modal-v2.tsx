'use client';

/**
 * SwapModalV2 - Swap tokens within the Smart Wallet
 *
 * Handles:
 * - Token selection (sell/buy)
 * - Quote fetching via 0x API
 * - Swap execution with atomic approve + swap
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Loader2, Check, AlertCircle, RefreshCw, ChevronDown, ExternalLink, AlertTriangle } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
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
import type { Address } from 'viem';
import { useSmartWallet, useWalletBalances, useSwap, formatPriceImpact, getPriceImpactSeverity } from '@/hooks/wallet';
import { useLiveEthPrice } from '@/hooks/useLivePrice';
import { formatUsd, formatTokenAmount, parseTokenAmount, TOKEN_LIST, NATIVE_TOKEN_ADDRESS } from '@/lib/tokens';
import { getExplorerTxUrl, IS_TESTNET } from '@/lib/smart-wallet';
import type { TokenBalance } from '@/types/wallet';
import type { TokenInfo } from '@/lib/tokens';

interface SwapModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

type SwapStep = 'input' | 'review' | 'confirming' | 'success' | 'error';

export function SwapModalV2({ isOpen, onClose }: SwapModalV2Props) {
  const { smartWallet } = useSmartWallet();
  const { switchChain } = useSwitchChain();
  const { balances, refetch: refetchBalances } = useWalletBalances();
  const { quote, isLoadingQuote, isExecuting, error: swapError, getQuote, executeSwap } = useSwap();
  const { ethPrice } = useLiveEthPrice(); // Live ETH price from Chainlink/CoinGecko

  const [sellToken, setSellToken] = useState<TokenInfo>(TOKEN_LIST[0]); // ETH
  const [buyToken, setBuyToken] = useState<TokenInfo>(TOKEN_LIST[2]); // USDC
  const [sellAmount, setSellAmount] = useState('');
  const [step, setStep] = useState<SwapStep>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSellTokenList, setShowSellTokenList] = useState(false);
  const [showBuyTokenList, setShowBuyTokenList] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Get sell token balance from smart wallet
  const sellTokenBalance = balances.find((b) =>
    sellToken.address === NATIVE_TOKEN_ADDRESS
      ? b.address === null
      : b.address?.toLowerCase() === sellToken.address.toLowerCase()
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSellAmount('');
        setStep('input');
        setErrorMessage(null);
        setTxHash(undefined);
      }, 200);
    }
  }, [isOpen]);

  // Debounced quote fetching
  useEffect(() => {
    if (!sellAmount || !smartWallet?.address) return;

    const parsedAmount = parseTokenAmount(sellAmount, sellToken.decimals);
    if (parsedAmount <= 0n) return;

    const timeoutId = setTimeout(() => {
      getQuote({
        sellToken: sellToken.address,
        buyToken: buyToken.address,
        sellAmount: parsedAmount,
      }).catch((err) => {
        console.error('Quote error:', err);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [sellAmount, sellToken, buyToken, smartWallet?.address, getQuote]);

  const parsedSellAmount = sellAmount
    ? parseTokenAmount(sellAmount, sellToken.decimals)
    : 0n;

  const hasInsufficientBalance = sellTokenBalance
    ? parsedSellAmount > sellTokenBalance.balanceRaw
    : true;

  const handleSwapTokens = () => {
    const temp = sellToken;
    setSellToken(buyToken);
    setBuyToken(temp);
    setSellAmount('');
  };

  const handleReview = () => {
    if (quote && !hasInsufficientBalance) {
      setStep('review');
    }
  };

  const handleExecuteSwap = async () => {
    if (!quote) return;

    setErrorMessage(null);
    setStep('confirming');

    try {
      const hash = await executeSwap(quote);
      setTxHash(hash);
      setStep('success');
      // Refetch balances after successful swap
      setTimeout(() => {
        refetchBalances();
      }, 2000);
    } catch (err) {
      setStep('error');
      // Extract user-friendly error message
      const message = err instanceof Error ? err.message : 'Swap failed';
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
    if (sellTokenBalance) {
      // For ETH, leave some for gas
      if (sellToken.address === NATIVE_TOKEN_ADDRESS) {
        const gasBuffer = 0.002; // ~0.002 ETH for gas
        const balanceNum = Number(sellTokenBalance.balanceRaw) / 1e18;
        const maxAmount = Math.max(0, balanceNum - gasBuffer);
        setSellAmount(maxAmount.toString());
      } else {
        setSellAmount(formatTokenAmount(sellTokenBalance.balanceRaw, sellToken.decimals));
      }
    }
  };

  const priceImpactSeverity = quote ? getPriceImpactSeverity(quote.priceImpact) : 'low';

  // Testnet swaps are now enabled via MockAerodromeRouter
  // Show a small indicator that we're on testnet but allow swaps
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowDownUp className="h-5 w-5 text-blue-400" />
            Swap Tokens
            {IS_TESTNET && (
              <Badge variant="outline" className="ml-2 text-xs text-yellow-400 border-yellow-400/50">
                Testnet
              </Badge>
            )}
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
              {/* Sell Token */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">You Pay</label>
                  <button
                    onClick={handleSetMax}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Balance: {sellTokenBalance
                      ? formatTokenAmount(sellTokenBalance.balanceRaw, sellToken.decimals)
                      : '0'
                    }
                  </button>
                </div>
                <div className="relative p-4 bg-surface/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowSellTokenList(!showSellTokenList)}
                      className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                    >
                      <TokenLogo symbol={sellToken.symbol} size="sm" />
                      <span className="text-sm font-medium text-white">{sellToken.symbol}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="flex-1 text-right text-xl font-mono border-0 bg-transparent focus:ring-0"
                    />
                  </div>
                  {sellAmount && sellTokenBalance && (
                    <p className="text-xs text-gray-500 text-right mt-2">
                      ~{formatUsd(parseFloat(sellAmount) * sellTokenBalance.priceUsd)}
                    </p>
                  )}

                  {/* Sell Token Dropdown */}
                  {showSellTokenList && (
                    <div className="absolute left-0 right-0 top-full mt-2 p-2 bg-surface rounded-lg border border-border z-10 max-h-48 overflow-y-auto">
                      {TOKEN_LIST.filter(t => t.address !== buyToken.address).map((token) => (
                        <button
                          key={token.address}
                          onClick={() => {
                            setSellToken(token);
                            setShowSellTokenList(false);
                            setSellAmount('');
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-surface/80"
                        >
                          <TokenLogo symbol={token.symbol} size="sm" />
                          <span className="text-sm text-white">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {hasInsufficientBalance && sellAmount && (
                  <p className="text-xs text-red-400">Insufficient balance</p>
                )}
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  onClick={handleSwapTokens}
                  className="p-2 bg-surface rounded-full border border-border hover:bg-surface/80 hover:border-slate-600 transition-colors"
                >
                  <ArrowDownUp className="h-4 w-4 text-blue-400" />
                </button>
              </div>

              {/* Buy Token */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">You Receive</label>
                <div className="relative p-4 bg-surface/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowBuyTokenList(!showBuyTokenList)}
                      className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                    >
                      <TokenLogo symbol={buyToken.symbol} size="sm" />
                      <span className="text-sm font-medium text-white">{buyToken.symbol}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    <div className="flex-1 text-right">
                      {isLoadingQuote ? (
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin ml-auto" />
                      ) : (
                        <span className="text-xl font-mono text-white">
                          {quote ? formatTokenAmount(quote.buyAmount, buyToken.decimals) : '0.00'}
                        </span>
                      )}
                    </div>
                  </div>
                  {quote && (
                    <p className="text-xs text-gray-500 text-right mt-2">
                      ~{formatUsd(Number(quote.buyAmount) / Math.pow(10, buyToken.decimals) * (buyToken.symbol === 'USDC' || buyToken.symbol === 'DAI' ? 1 : (ethPrice || 2500)))}
                    </p>
                  )}

                  {/* Buy Token Dropdown */}
                  {showBuyTokenList && (
                    <div className="absolute left-0 right-0 top-full mt-2 p-2 bg-surface rounded-lg border border-border z-10 max-h-48 overflow-y-auto">
                      {TOKEN_LIST.filter(t => t.address !== sellToken.address).map((token) => (
                        <button
                          key={token.address}
                          onClick={() => {
                            setBuyToken(token);
                            setShowBuyTokenList(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-surface/80"
                        >
                          <TokenLogo symbol={token.symbol} size="sm" />
                          <span className="text-sm text-white">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Details */}
              {quote && (
                <div className="p-3 bg-surface/30 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate</span>
                    <span className="text-white">
                      1 {sellToken.symbol} = {parseFloat(quote.price).toFixed(4)} {buyToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price Impact</span>
                    <span className={
                      priceImpactSeverity === 'high' ? 'text-red-400' :
                      priceImpactSeverity === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }>
                      {formatPriceImpact(quote.priceImpact)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Gas</span>
                    <span className="text-white">{formatUsd(quote.gasEstimateUsd)}</span>
                  </div>
                </div>
              )}

              {/* Review Button */}
              <Button
                onClick={handleReview}
                disabled={!quote || hasInsufficientBalance || isLoadingQuote}
                className="w-full"
              >
                {isLoadingQuote ? 'Getting Quote...' : 'Review Swap'}
              </Button>
            </motion.div>
          )}

          {step === 'review' && quote && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-surface/50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenLogo symbol={sellToken.symbol} size="md" />
                    <div>
                      <p className="text-lg font-medium text-white">
                        -{formatTokenAmount(quote.sellAmount, sellToken.decimals)}
                      </p>
                      <p className="text-sm text-gray-400">{sellToken.symbol}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowDownUp className="h-5 w-5 text-blue-400" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenLogo symbol={buyToken.symbol} size="md" />
                    <div>
                      <p className="text-lg font-medium text-green-400">
                        +{formatTokenAmount(quote.buyAmount, buyToken.decimals)}
                      </p>
                      <p className="text-sm text-gray-400">{buyToken.symbol}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Details */}
              <div className="p-3 bg-surface/30 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rate</span>
                  <span className="text-white">
                    1 {sellToken.symbol} = {parseFloat(quote.price).toFixed(4)} {buyToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Impact</span>
                  <span className={
                    priceImpactSeverity === 'high' ? 'text-red-400' :
                    priceImpactSeverity === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }>
                    {formatPriceImpact(quote.priceImpact)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="text-white">{formatUsd(quote.gasEstimateUsd)}</span>
                </div>
                {quote.sources.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Route</span>
                    <span className="text-white">
                      {quote.sources.map(s => s.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {priceImpactSeverity === 'high' && (
                <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/50">
                  <p className="text-sm text-red-400">
                    High price impact! You may receive significantly less than expected.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setStep('input')}>
                  Back
                </Button>
                <Button onClick={handleExecuteSwap}>
                  Confirm Swap
                </Button>
              </div>
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
                <h3 className="text-lg font-semibold text-white">Swap Successful!</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Swapped {sellAmount} {sellToken.symbol} for {buyToken.symbol}
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
                <h3 className="text-lg font-semibold text-white">Swap Failed</h3>
                <p className="text-sm text-red-400 mt-1">
                  {errorMessage || swapError?.message || 'Something went wrong'}
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
