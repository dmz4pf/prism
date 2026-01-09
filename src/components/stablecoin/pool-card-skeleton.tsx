/**
 * Pool Card Skeleton Component
 *
 * Loading skeleton for stablecoin pool cards.
 * Matches the dimensions of the real PoolCard component.
 */

'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PoolCardSkeletonProps {
  className?: string;
}

export function PoolCardSkeleton({ className }: PoolCardSkeletonProps) {
  return (
    <Card className={cn('p-4 bg-secondary-900 border-secondary-800', className)}>
      <div className="flex items-center justify-between">
        {/* Left side: Logo and name */}
        <div className="flex items-center gap-3">
          {/* Logo placeholder */}
          <div className="w-10 h-10 rounded-full bg-secondary-800 animate-pulse" />
          <div className="space-y-2">
            {/* Protocol name */}
            <div className="h-4 w-24 bg-secondary-800 rounded animate-pulse" />
            {/* Token symbol */}
            <div className="h-3 w-16 bg-secondary-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Right side: APY */}
        <div className="text-right space-y-2">
          <div className="h-5 w-16 bg-secondary-800 rounded animate-pulse ml-auto" />
          <div className="h-3 w-8 bg-secondary-800 rounded animate-pulse ml-auto" />
        </div>
      </div>

      {/* Expanded section placeholder */}
      <div className="mt-3 pt-3 border-t border-secondary-800 space-y-2">
        {/* Description */}
        <div className="h-3 w-full bg-secondary-800 rounded animate-pulse" />
        {/* Risk badge */}
        <div className="h-5 w-20 bg-secondary-800 rounded-full animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * Grid of pool card skeletons
 */
export function PoolCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PoolCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default PoolCardSkeleton;
