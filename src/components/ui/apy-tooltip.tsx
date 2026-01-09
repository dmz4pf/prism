'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { cn } from '@/lib/utils';

interface APYBreakdownItem {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'neutral';
}

interface APYTooltipProps {
  apy: number;
  breakdown?: APYBreakdownItem[];
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl font-bold',
};

export function APYTooltip({
  apy,
  breakdown,
  size = 'md',
  showIcon = true,
  className,
  children,
}: APYTooltipProps) {
  // If no breakdown provided, create a simple one
  const displayBreakdown = breakdown || [
    { label: 'Base APY', value: apy, type: 'positive' as const },
  ];

  // Calculate net APY from breakdown
  const netAPY = displayBreakdown.reduce((sum, item) => {
    return item.type === 'negative' ? sum - Math.abs(item.value) : sum + item.value;
  }, 0);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 cursor-help',
              className
            )}
          >
            {children || (
              <span className={cn('text-green-400 font-mono', SIZE_CLASSES[size])}>
                {apy.toFixed(1)}%
              </span>
            )}
            {showIcon && (
              <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-400 transition-colors" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="min-w-[200px] p-0">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">APY Breakdown</span>
            </div>

            <div className="space-y-2">
              {displayBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.label}</span>
                  <span
                    className={cn(
                      'text-sm font-mono font-medium',
                      item.type === 'positive' && 'text-green-400',
                      item.type === 'negative' && 'text-red-400',
                      item.type === 'neutral' && 'text-gray-400'
                    )}
                  >
                    {item.type === 'negative' ? '-' : item.type === 'positive' ? '+' : ''}
                    {Math.abs(item.value).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            {displayBreakdown.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium text-white">Net APY</span>
                <span className="text-sm font-mono font-bold text-green-400">
                  {netAPY.toFixed(2)}%
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500 pt-1">
              APY is variable and may change based on market conditions.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Convenience component for strategy APY with full flow breakdown
interface StrategyAPYTooltipProps {
  apy: number;
  flow: Array<{
    protocol: string;
    action: string;
    apy: number;
  }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StrategyAPYTooltip({ apy, flow, size = 'lg', className }: StrategyAPYTooltipProps) {
  const breakdown: APYBreakdownItem[] = flow.map((step) => ({
    label: `${step.protocol} (${step.action})`,
    value: Math.abs(step.apy),
    type: step.apy >= 0 ? 'positive' : 'negative',
  }));

  return (
    <APYTooltip apy={apy} breakdown={breakdown} size={size} className={className} />
  );
}

// Simple APY display with tooltip for protocols
interface ProtocolAPYTooltipProps {
  apy: number;
  protocol: string;
  type?: 'supply' | 'borrow' | 'stake' | 'yield';
  baseAPY?: number;
  rewardAPY?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProtocolAPYTooltip({
  apy,
  protocol,
  type = 'supply',
  baseAPY,
  rewardAPY,
  size = 'md',
  className,
}: ProtocolAPYTooltipProps) {
  const breakdown: APYBreakdownItem[] = [];

  if (baseAPY !== undefined) {
    breakdown.push({ label: 'Base APY', value: baseAPY, type: 'positive' });
  }
  if (rewardAPY !== undefined && rewardAPY > 0) {
    breakdown.push({ label: 'Reward APY', value: rewardAPY, type: 'positive' });
  }

  // If no breakdown details, just show total
  if (breakdown.length === 0) {
    breakdown.push({
      label: `${protocol} ${type} APY`,
      value: apy,
      type: type === 'borrow' ? 'negative' : 'positive',
    });
  }

  return (
    <APYTooltip
      apy={apy}
      breakdown={breakdown}
      size={size}
      className={className}
    />
  );
}
