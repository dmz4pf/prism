/**
 * Portfolio Summary Component
 *
 * Displays aggregated statistics for user's stablecoin portfolio.
 */

'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Percent, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { UserPortfolio } from '@/types/stablecoin';
import { formatUSD, cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface PortfolioSummaryProps {
  portfolio: UserPortfolio | null;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PortfolioSummary({ portfolio, isLoading, className }: PortfolioSummaryProps) {
  if (isLoading) {
    return <PortfolioSummarySkeleton className={className} />;
  }

  if (!portfolio || portfolio.positions.length === 0) {
    return null;
  }

  const { totals, avgApy, lastUpdated, positions } = portfolio;

  // Format last updated time
  const lastUpdatedText = formatRelativeTime(lastUpdated);

  return (
    <Card className={cn('p-6 bg-secondary-900 border-secondary-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Your Portfolio</h3>
        <span className="text-xs text-secondary-500">
          <Clock className="h-3 w-3 inline mr-1" />
          {lastUpdatedText}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Value */}
        <StatCard
          icon={Wallet}
          label="Total Value"
          value={formatUSD(totals.portfolioValue)}
          iconColor="text-blue-400"
        />

        {/* Total Supplied */}
        <StatCard
          icon={Wallet}
          label="Supplied"
          value={formatUSD(totals.supplied)}
          iconColor="text-secondary-400"
        />

        {/* Total Earnings */}
        <StatCard
          icon={TrendingUp}
          label="Total Earnings"
          value={`+${formatUSD(totals.interest + totals.rewards)}`}
          valueColor="text-green-400"
          iconColor="text-green-400"
        />

        {/* Average APY */}
        <StatCard
          icon={Percent}
          label="Avg APY"
          value={`${avgApy.toFixed(2)}%`}
          valueColor="text-green-400"
          iconColor="text-green-400"
        />
      </div>

      {/* Protocol Breakdown */}
      {positions.length > 1 && (
        <div className="mt-6 pt-4 border-t border-secondary-800">
          <p className="text-xs text-secondary-500 mb-3">
            Across {positions.length} protocols
          </p>
          <div className="flex gap-2 flex-wrap">
            {positions.map((pos) => (
              <motion.div
                key={pos.poolId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1.5 rounded-full bg-secondary-800 text-xs text-secondary-300"
              >
                {pos.pool.protocol}: {formatUSD(pos.totalValue.usd)}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueColor = 'text-white',
  iconColor = 'text-secondary-400',
}: StatCardProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        <span className="text-xs text-secondary-500">{label}</span>
      </div>
      <p className={cn('text-lg font-semibold', valueColor)}>{value}</p>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function PortfolioSummarySkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6 bg-secondary-900 border-secondary-800', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-32 bg-secondary-800 rounded animate-pulse" />
        <div className="h-4 w-24 bg-secondary-800 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-secondary-800 rounded animate-pulse" />
            <div className="h-6 w-24 bg-secondary-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default PortfolioSummary;
