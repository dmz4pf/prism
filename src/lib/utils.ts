import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    compact?: boolean;
  } = {}
): string {
  const { decimals = 2, prefix = '', suffix = '', compact = false } = options;

  if (compact && value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M${suffix}`;
  }
  if (compact && value >= 1000) {
    return `${prefix}${(value / 1000).toFixed(1)}K${suffix}`;
  }

  return `${prefix}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

export function formatUSD(value: number, compact = false): string {
  return formatNumber(value, { prefix: '$', decimals: 2, compact });
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
