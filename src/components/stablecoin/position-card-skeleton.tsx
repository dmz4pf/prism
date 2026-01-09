/**
 * Position Card Skeleton Component
 *
 * Loading skeleton for user stablecoin position cards.
 * Matches the dimensions of the real PositionCard component.
 */

'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PositionCardSkeletonProps {
  className?: string;
}

export function PositionCardSkeleton({ className }: PositionCardSkeletonProps) {
  return (
    <Card className={cn('p-4 bg-secondary-900 border-secondary-800', className)}>
      <div className="flex items-center justify-between mb-4">
        {/* Left: Protocol info */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-10 h-10 rounded-full bg-secondary-800 animate-pulse" />
          <div className="space-y-2">
            {/* Protocol name */}
            <div className="h-4 w-20 bg-secondary-800 rounded animate-pulse" />
            {/* Token symbol */}
            <div className="h-3 w-12 bg-secondary-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Right: Value */}
        <div className="text-right space-y-2">
          <div className="h-5 w-24 bg-secondary-800 rounded animate-pulse ml-auto" />
          <div className="h-3 w-16 bg-secondary-800 rounded animate-pulse ml-auto" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-secondary-800">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-12 bg-secondary-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-secondary-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Action button */}
      <div className="mt-4">
        <div className="h-9 w-full bg-secondary-800 rounded animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * List of position card skeletons
 */
export function PositionCardSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PositionCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Portfolio summary skeleton
 */
export function PortfolioSummarySkeleton() {
  return (
    <Card className="p-6 bg-secondary-900 border-secondary-800">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-32 bg-secondary-800 rounded animate-pulse" />
        <div className="h-4 w-24 bg-secondary-800 rounded animate-pulse" />
      </div>

      {/* Stats grid */}
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

export default PositionCardSkeleton;
