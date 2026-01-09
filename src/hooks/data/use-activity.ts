/**
 * useActivity Hook
 * React Query hook for fetching user activity/transaction history
 * Supports pagination with "Load More" functionality
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { Address } from 'viem';
import { fetchUserActivity, type Activity } from '@/services/activity-service';
import { useSmartWallet } from '@/hooks/wallet';

interface UseActivityOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseActivityResult {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // Pagination
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  totalLoaded: number;
}

const PAGE_SIZE = 20;

export function useActivity(options: UseActivityOptions = {}): UseActivityResult {
  const { smartWallet } = useSmartWallet();
  const { limit = 100, enabled = true } = options;

  // Track how many items we've loaded
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['activity', smartWallet?.address, limit],
    queryFn: async () => {
      if (!smartWallet?.address) return [];
      return fetchUserActivity(smartWallet.address as Address, { limit });
    },
    enabled: enabled && !!smartWallet?.address,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  // Paginated activities (show only displayCount items)
  const paginatedActivities = useMemo(() => {
    return activities.slice(0, displayCount);
  }, [activities, displayCount]);

  // Check if there are more items to load
  const hasMore = displayCount < activities.length;

  // Load more items
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, activities.length));
    }
  }, [hasMore, activities.length]);

  // Reset display count when activities change
  const handleRefetch = useCallback(async () => {
    setDisplayCount(PAGE_SIZE);
    await refetch();
  }, [refetch]);

  return {
    activities: paginatedActivities,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: handleRefetch,
    // Pagination
    hasMore,
    loadMore,
    isLoadingMore: isFetching && !isLoading,
    totalLoaded: paginatedActivities.length,
  };
}

/**
 * Alternative hook using React Query's useInfiniteQuery
 * Use this if you need true server-side pagination with page keys
 */
export function useActivityInfinite(options: UseActivityOptions = {}) {
  const { smartWallet } = useSmartWallet();
  const { limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['activity-infinite', smartWallet?.address],
    queryFn: async ({ pageParam }) => {
      if (!smartWallet?.address) return { activities: [], hasMore: false };
      const activities = await fetchUserActivity(smartWallet.address as Address, {
        limit,
      });
      return {
        activities,
        hasMore: activities.length >= limit,
        nextCursor: activities.length > 0 ? activities[activities.length - 1].blockNumber : null,
      };
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: enabled && !!smartWallet?.address,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// Re-export filter and search utilities
export { filterActivities, searchActivities } from '@/services/activity-service';
