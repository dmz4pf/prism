'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark, Coins, Link2, Sparkles, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  iconColor = 'text-gray-400',
  iconBgColor = 'bg-gray-500/10',
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'py-4' : 'py-8',
        className
      )}
    >
      <div className={cn(
        'rounded-full flex items-center justify-center mb-3',
        iconBgColor,
        compact ? 'w-10 h-10' : 'w-14 h-14'
      )}>
        <Icon className={cn(iconColor, compact ? 'h-5 w-5' : 'h-7 w-7')} />
      </div>
      <h4 className={cn(
        'font-medium text-white mb-1',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h4>
      <p className={cn(
        'text-gray-400 mb-4 max-w-xs',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {description}
      </p>
      <Link href={actionHref}>
        <Button size={compact ? 'sm' : 'default'} className="gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      </Link>
    </motion.div>
  );
}

// Pre-configured empty states for common use cases
export function StakingEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Start Earning Staking Rewards"
      description="Stake your ETH to earn 3-4% APY through liquid staking protocols."
      actionLabel="Stake ETH"
      actionHref="/simple/stake"
      iconColor="text-green-400"
      iconBgColor="bg-green-500/10"
      compact={compact}
    />
  );
}

export function LendingEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <EmptyState
      icon={Landmark}
      title="Earn on Your Stables"
      description="Supply USDC or other assets to earn 4-5% APY on lending markets."
      actionLabel="Start Lending"
      actionHref="/simple/lend"
      iconColor="text-blue-400"
      iconBgColor="bg-blue-500/10"
      compact={compact}
    />
  );
}

export function StableYieldEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <EmptyState
      icon={Coins}
      title="Get Yield-Bearing Stables"
      description="Convert your stablecoins to sDAI, USDY, or sUSDe for automatic yield."
      actionLabel="Convert Now"
      actionHref="/simple/stable"
      iconColor="text-yellow-400"
      iconBgColor="bg-yellow-500/10"
      compact={compact}
    />
  );
}

export function StrategiesEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <EmptyState
      icon={Link2}
      title="Explore Advanced Strategies"
      description="One-click multi-protocol strategies for optimized yields up to 15% APY."
      actionLabel="View Strategies"
      actionHref="/strategies"
      iconColor="text-blue-400"
      iconBgColor="bg-blue-500/10"
      compact={compact}
    />
  );
}
