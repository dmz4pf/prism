'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TokenIcon } from './token-icon';

interface AmountInputProps {
  token: string;
  balance?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function AmountInput({
  token,
  balance,
  value,
  onChange,
  disabled = false,
  error,
  className,
}: AmountInputProps) {
  const handleMax = useCallback(() => {
    if (balance) {
      onChange(balance);
    }
  }, [balance, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Amount</span>
        {balance && (
          <span className="text-gray-400">
            Balance: <span className="text-white font-mono">{parseFloat(balance).toFixed(4)}</span>
          </span>
        )}
      </div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-surface p-3',
          error ? 'border-error' : 'border-border focus-within:border-blue-500'
        )}
      >
        <TokenIcon token={token} size="lg" />
        <div className="flex-1">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className="border-0 bg-transparent p-0 text-xl font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMax}
            disabled={disabled || !balance}
            className="text-blue-400 hover:text-blue-300"
          >
            MAX
          </Button>
          <span className="text-lg font-medium text-gray-400">{token}</span>
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
