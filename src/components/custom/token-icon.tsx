'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenIconProps {
  token: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const tokenImages: Record<string, string> = {
  ETH: '/tokens/eth.svg',
  WETH: '/tokens/eth.svg',
  USDC: '/tokens/usdc.svg',
  USDT: '/tokens/usdt.svg',
  DAI: '/tokens/dai.svg',
  stETH: '/tokens/steth.svg',
  wstETH: '/tokens/wsteth.svg',
  cbETH: '/tokens/cbeth.svg',
  USDe: '/tokens/usde.svg',
  sUSDe: '/tokens/susde.svg',
  AAVE: '/tokens/aave.svg',
};

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

export function TokenIcon({ token, size = 'md', className }: TokenIconProps) {
  const imageSrc = tokenImages[token.toUpperCase()] || '/tokens/generic.svg';

  return (
    <div
      className={cn(
        'relative rounded-full bg-surface overflow-hidden flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={imageSrc}
        alt={token}
        fill
        className="object-contain p-0.5"
        onError={(e) => {
          // Fallback to text if image fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <span className="text-xs font-bold text-gray-400 absolute">
        {token.slice(0, 2)}
      </span>
    </div>
  );
}
