/**
 * Skeleton Loading Components
 *
 * Reusable skeleton components for loading states across the app.
 * Provides consistent loading animations for different card types.
 */

import { cn } from '@/lib/utils';

// =============================================================================
// BASE SKELETON
// =============================================================================

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-secondary-700/50', className)}
      {...props}
    />
  );
}

// =============================================================================
// DASHBOARD CARD SKELETONS
// =============================================================================

/**
 * Skeleton for individual position items within a card
 */
function PositionItemSkeleton() {
  return (
    <div className="p-3 bg-surface/50 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for staking position cards
 */
function StakingCardSkeleton() {
  return (
    <div className="h-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-green-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <PositionItemSkeleton />
        <PositionItemSkeleton />
        <PositionItemSkeleton />
      </div>
      {/* Footer */}
      <div className="px-4 pb-4">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for lending position cards
 */
function LendingCardSkeleton() {
  return (
    <div className="h-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-surface/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="px-4 pb-4">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for stable yield position cards
 */
function StableYieldCardSkeleton() {
  return (
    <div className="h-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-yellow-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <PositionItemSkeleton />
        <PositionItemSkeleton />
        <PositionItemSkeleton />
      </div>
      {/* Footer */}
      <div className="px-4 pb-4">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for strategies position cards
 */
function StrategiesCardSkeleton() {
  return (
    <div className="h-full bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <PositionItemSkeleton />
        <PositionItemSkeleton />
      </div>
      {/* Footer */}
      <div className="px-4 pb-4">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for portfolio overview header
 */
function PortfolioOverviewSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Total Value */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for chart component
 */
function ChartSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-12 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Chart Area */}
      <div className="h-64 flex items-end justify-between gap-1 px-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + (i % 5) * 10}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for activity/transaction items
 */
function ActivityItemSkeleton() {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

/**
 * Full activity list skeleton
 */
function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  Skeleton,
  PositionItemSkeleton,
  StakingCardSkeleton,
  LendingCardSkeleton,
  StableYieldCardSkeleton,
  StrategiesCardSkeleton,
  PortfolioOverviewSkeleton,
  ChartSkeleton,
  ActivityItemSkeleton,
  ActivityListSkeleton,
};
