/**
 * StakingForm Component
 * Form for entering staking amount and initiating transactions
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import type { StakingOption, StakeQuote } from '@/types/staking';
import { usePrices } from '@/hooks/usePrices';
import { cn } from '@/lib/utils';

interface StakingFormProps {
  option: StakingOption;
  quote: StakeQuote | null;
  isQuoting: boolean;
  onGetQuote: (amount: string, slippage: number) => void;
  onStake: (amount: string, slippage: number) => void;
  disabled?: boolean;
}

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0];

export function StakingForm({
  option,
  quote,
  isQuoting,
  onGetQuote,
  onStake,
  disabled = false,
}: StakingFormProps) {
  const { address, isConnected } = useAccount();
  const { toUSD } = usePrices();

  // Get ETH/WETH balance
  const { data: balance } = useBalance({
    address,
    // For WETH, you'd need to check the token balance
    // This checks native ETH balance
  });

  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);

  // Calculate USD value
  const amountUsd = amount ? toUSD(amount, 'ETH') : 0;

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        onGetQuote(amount, slippage);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, slippage, onGetQuote]);

  // Set max amount
  const handleMax = useCallback(() => {
    if (balance) {
      // Leave some for gas
      const maxAmount = parseFloat(formatEther(balance.value)) - 0.01;
      setAmount(Math.max(0, maxAmount).toFixed(6));
    }
  }, [balance]);

  // Handle stake
  const handleStake = useCallback(() => {
    if (amount && parseFloat(amount) > 0) {
      onStake(amount, slippage);
    }
  }, [amount, slippage, onStake]);

  // Validation
  const hasBalance = balance && balance.value > 0n;
  const hasEnoughBalance = balance && amount
    ? parseEther(amount || '0') <= balance.value
    : true;
  const isValidAmount = amount && parseFloat(amount) > 0;

  return (
    <div className="p-6 bg-card rounded-xl border space-y-6">
      {/* Amount input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Amount</label>
          {balance && (
            <span className="text-sm text-muted-foreground">
              Balance: {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
            </span>
          )}
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={disabled}
            className={cn(
              'w-full p-4 pr-24 text-2xl font-medium bg-muted rounded-lg',
              'border-2 border-transparent focus:border-primary focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={handleMax}
              disabled={disabled || !hasBalance}
              className="px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
            >
              MAX
            </button>
            <span className="px-3 py-1.5 bg-background rounded-md font-medium">
              {option.inputToken.symbol}
            </span>
          </div>
        </div>

        {/* USD value */}
        {amountUsd > 0 && (
          <div className="mt-1 text-sm text-muted-foreground">
            ≈ ${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        )}

        {/* Validation errors */}
        {!hasEnoughBalance && (
          <div className="mt-2 text-sm text-red-500">Insufficient balance</div>
        )}
      </div>

      {/* Quote display */}
      {(quote || isQuoting) && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">You receive</span>
            {isQuoting ? (
              <span className="animate-pulse">Calculating...</span>
            ) : quote ? (
              <span className="font-medium">
                {(Number(quote.expectedOutput) / 1e18).toFixed(6)}{' '}
                {option.outputToken.symbol}
              </span>
            ) : null}
          </div>

          {quote && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price impact</span>
                <span
                  className={cn(
                    quote.priceImpact > 1
                      ? 'text-red-500'
                      : quote.priceImpact > 0.5
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  )}
                >
                  {quote.priceImpact.toFixed(3)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated gas</span>
                <span>~${quote.estimatedGasUsd.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min. received</span>
                <span>
                  {(Number(quote.minOutput) / 1e18).toFixed(6)}{' '}
                  {option.outputToken.symbol}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Slippage settings */}
      <div>
        <button
          onClick={() => setShowSlippage(!showSlippage)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>Slippage tolerance: {slippage}%</span>
          <span>{showSlippage ? '▲' : '▼'}</span>
        </button>

        {showSlippage && (
          <div className="flex gap-2 mt-3">
            {SLIPPAGE_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  slippage === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
              className="w-20 px-3 py-1.5 rounded-lg text-sm bg-muted border border-transparent focus:border-primary focus:outline-none"
              step="0.1"
              min="0.1"
              max="5"
            />
          </div>
        )}
      </div>

      {/* Stake button */}
      <button
        onClick={handleStake}
        disabled={
          disabled ||
          !isConnected ||
          !isValidAmount ||
          !hasEnoughBalance ||
          isQuoting
        }
        className={cn(
          'w-full py-4 rounded-lg font-semibold text-lg transition-all',
          'bg-primary text-primary-foreground hover:opacity-90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {!isConnected
          ? 'Connect Wallet'
          : !isValidAmount
            ? 'Enter Amount'
            : !hasEnoughBalance
              ? 'Insufficient Balance'
              : isQuoting
                ? 'Getting Quote...'
                : `Stake ${option.inputToken.symbol}`}
      </button>

      {/* APY estimate */}
      {isValidAmount && (
        <div className="text-center text-sm text-muted-foreground">
          Estimated yearly earnings:{' '}
          <span className="text-green-500 font-medium">
            ${((amountUsd * option.apy) / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export default StakingForm;
