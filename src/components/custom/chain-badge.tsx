'use client';

import { cn } from '@/lib/utils';
import { getChainName } from '@/lib/wagmi';

interface ChainBadgeProps {
  chainId: number;
  size?: 'sm' | 'md';
  className?: string;
}

const chainColors: Record<number, string> = {
  8453: 'bg-blue-500/20 text-blue-400', // Base
  1: 'bg-gray-500/20 text-gray-400', // Ethereum
  42161: 'bg-blue-600/20 text-blue-300', // Arbitrum
  10: 'bg-red-500/20 text-red-400', // Optimism
};

export function ChainBadge({ chainId, size = 'sm', className }: ChainBadgeProps) {
  const name = getChainName(chainId);
  const colorClass = chainColors[chainId] || 'bg-gray-500/20 text-gray-400';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      {name}
    </span>
  );
}
