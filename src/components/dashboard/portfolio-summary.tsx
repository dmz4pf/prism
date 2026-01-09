'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, Wallet, Percent, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioData {
  totalValue: number;
  change24h: number;
  changePercent24h: number;
  dailyYield: number;
  avgApy: number;
  positionsCount: number;
}

interface PortfolioSummaryProps {
  data?: PortfolioData;
  isLoading?: boolean;
}

const defaultData: PortfolioData = {
  totalValue: 0,
  change24h: 0,
  changePercent24h: 0,
  dailyYield: 0,
  avgApy: 0,
  positionsCount: 0,
};

export function PortfolioSummary({ data = defaultData, isLoading }: PortfolioSummaryProps) {
  const isPositive = data.change24h >= 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-background-card p-6 animate-pulse">
        <div className="h-8 bg-surface rounded w-48 mb-4" />
        <div className="h-12 bg-surface rounded w-64 mb-6" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-surface rounded" />
          <div className="h-16 bg-surface rounded" />
          <div className="h-16 bg-surface rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-background-card p-4"
    >
      {/* Total Value */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-secondary-400" />
          <span className="text-sm text-secondary-400">Total Portfolio Value</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold font-mono text-white">
            $
            <CountUp
              start={data.totalValue * 0.9}
              end={data.totalValue}
              duration={1.2}
              decimals={2}
              separator=","
            />
          </span>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-success' : 'text-error'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {isPositive ? '+' : ''}${Math.abs(data.change24h).toFixed(2)}
            </span>
            <span className="text-secondary-500">
              ({isPositive ? '+' : ''}{data.changePercent24h.toFixed(2)}%)
            </span>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Yield */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg bg-surface p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-secondary-400">Daily Yield</span>
          </div>
          <span className="text-xl font-bold font-mono text-success">
            +$
            <CountUp
              end={data.dailyYield}
              duration={1}
              decimals={2}
            />
          </span>
        </motion.div>

        {/* Average APY */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg bg-surface p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-secondary-400">Avg APY</span>
          </div>
          <span className="text-xl font-bold font-mono text-blue-400">
            <CountUp
              end={data.avgApy}
              duration={1}
              decimals={2}
            />%
          </span>
        </motion.div>

        {/* Positions Count */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg bg-surface p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-secondary-400">Active Positions</span>
          </div>
          <span className="text-xl font-bold font-mono text-white">
            <CountUp
              end={data.positionsCount}
              duration={0.8}
            />
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
