/**
 * Stablecoin Pools Hook
 *
 * React Query hook for fetching and managing stablecoin pool data.
 * Features:
 * - Automatic caching and background refresh
 * - Error handling with fallback data
 * - Filtering and sorting
 * - Loading states
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import {
  getAllPools,
  getPoolsByProtocol,
  getPoolsByAsset,
  getPoolById,
  getPoolStatistics,
  refreshPoolData,
  filterPools,
} from '@/services/stablecoin/pool-data';
import {
  StablecoinPool,
  ProtocolName,
  StablecoinSymbol,
  RiskScore,
} from '@/types/stablecoin';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const poolQueryKeys = {
  all: ['stablecoin-pools'] as const,
  list: () => [...poolQueryKeys.all, 'list'] as const,
  byProtocol: (protocol: ProtocolName) => [...poolQueryKeys.all, 'protocol', protocol] as const,
  byAsset: (asset: StablecoinSymbol) => [...poolQueryKeys.all, 'asset', asset] as const,
  byId: (id: string) => [...poolQueryKeys.all, 'id', id] as const,
  statistics: () => [...poolQueryKeys.all, 'statistics'] as const,
  filtered: (filters: PoolFilters) => [...poolQueryKeys.all, 'filtered', filters] as const,
};

// =============================================================================
// TYPES
// =============================================================================

export interface PoolFilters {
  protocols?: ProtocolName[];
  assets?: StablecoinSymbol[];
  minApy?: number;
  maxApy?: number;
  minTvl?: number;
  riskScores?: RiskScore[];
}

export interface UseStablecoinPoolsOptions {
  /** Filter by protocols */
  protocols?: ProtocolName[];
  /** Filter by assets */
  assets?: StablecoinSymbol[];
  /** Sort field */
  sortBy?: 'apy' | 'tvl' | 'risk';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Minimum APY filter */
  minApy?: number;
  /** Risk scores to include */
  riskScores?: RiskScore[];
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseStablecoinPoolsReturn {
  /** All pools (filtered if options provided) */
  pools: StablecoinPool[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether data is being fetched in background */
  isFetching: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch pools data */
  refetch: () => void;
  /** Force refresh (bypass cache) */
  forceRefresh: () => Promise<void>;
  /** Get a specific pool by ID */
  getPool: (id: string) => StablecoinPool | undefined;
  /** Get best pool for an asset */
  getBestPool: (asset: StablecoinSymbol) => StablecoinPool | undefined;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useStablecoinPools(
  options: UseStablecoinPoolsOptions = {}
): UseStablecoinPoolsReturn {
  const {
    protocols,
    assets,
    sortBy = 'apy',
    sortOrder = 'desc',
    minApy,
    riskScores,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  // Build filters
  const filters: PoolFilters | undefined =
    protocols || assets || minApy || riskScores
      ? { protocols, assets, minApy, riskScores }
      : undefined;

  // Query for pools
  const {
    data: pools = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: filters ? poolQueryKeys.filtered(filters) : poolQueryKeys.list(),
    queryFn: async () => {
      let result: StablecoinPool[];

      if (filters) {
        result = await filterPools(filters);
      } else {
        result = await getAllPools();
      }

      // Sort results
      return sortPools(result, sortBy, sortOrder);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for UI
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    enabled,
  });

  // Force refresh function
  const forceRefresh = async () => {
    await refreshPoolData();
    queryClient.invalidateQueries({ queryKey: poolQueryKeys.all });
  };

  // Get specific pool
  const getPool = (id: string): StablecoinPool | undefined => {
    return pools.find((p) => p.id === id);
  };

  // Get best pool for asset
  const getBestPool = (asset: StablecoinSymbol): StablecoinPool | undefined => {
    const assetPools = pools.filter((p) => p.asset.symbol === asset);
    if (assetPools.length === 0) return undefined;
    return assetPools.sort((a, b) => b.apy.net - a.apy.net)[0];
  };

  return {
    pools,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    forceRefresh,
    getPool,
    getBestPool,
  };
}

// =============================================================================
// INDIVIDUAL HOOKS
// =============================================================================

/**
 * Get pools for a specific protocol
 */
export function usePoolsByProtocol(protocol: ProtocolName) {
  return useQuery({
    queryKey: poolQueryKeys.byProtocol(protocol),
    queryFn: () => getPoolsByProtocol(protocol),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get pools for a specific asset
 */
export function usePoolsByAsset(asset: StablecoinSymbol) {
  return useQuery({
    queryKey: poolQueryKeys.byAsset(asset),
    queryFn: () => getPoolsByAsset(asset),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific pool by ID
 */
export function usePool(poolId: string) {
  return useQuery({
    queryKey: poolQueryKeys.byId(poolId),
    queryFn: () => getPoolById(poolId),
    staleTime: 5 * 60 * 1000,
    enabled: !!poolId,
  });
}

/**
 * Get pool statistics
 */
export function usePoolStatistics() {
  return useQuery({
    queryKey: poolQueryKeys.statistics(),
    queryFn: getPoolStatistics,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// HELPERS
// =============================================================================

function sortPools(
  pools: StablecoinPool[],
  sortBy: 'apy' | 'tvl' | 'risk',
  sortOrder: 'asc' | 'desc'
): StablecoinPool[] {
  const sorted = [...pools].sort((a, b) => {
    let comparison: number;

    switch (sortBy) {
      case 'apy':
        comparison = a.apy.net - b.apy.net;
        break;
      case 'tvl':
        comparison = a.tvl.usd - b.tvl.usd;
        break;
      case 'risk':
        const riskOrder = { A: 1, B: 2, C: 3, D: 4 };
        comparison = riskOrder[a.risk.score] - riskOrder[b.risk.score];
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

export default useStablecoinPools;
