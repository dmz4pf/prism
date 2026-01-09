'use client';

import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/utils';

interface APYBadgeProps {
  apy: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function APYBadge({ apy, size = 'md', showLabel = false, className }: APYBadgeProps) {
  const isPositive = apy > 0;
  const isHigh = apy >= 10;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-mono',
        isPositive
          ? isHigh
            ? 'bg-success/20 text-success'
            : 'bg-blue-500/20 text-blue-400'
          : 'bg-error/20 text-error',
        sizeClasses[size],
        className
      )}
      role="text"
      aria-label={`Annual percentage yield: ${formatPercent(apy)}`}
    >
      {showLabel && <span className="text-gray-400 font-sans">APY</span>}
      <span>{formatPercent(apy)}</span>
    </span>
  );
}
