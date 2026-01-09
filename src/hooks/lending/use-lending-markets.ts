/**
 * useLendingMarkets Hook
 *
 * Fetches and manages lending markets across all protocols.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { createLendingService, AggregatedMarkets } from '@/services/lending';
import { LendingMarket, LendingProtocol, AssetCategory } from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export interface UseLendingMarketsOptions {
  /** Filter by protocol */
  protocol?: LendingProtocol;
  /** Filter by asset symbol */
  assetSymbol?: string;
  /** Filter by asset category */
  category?: AssetCategory;
  /** Only show markets that can supply */
  canSupply?: boolean;
  /** Only show markets that can borrow */
  canBorrow?: boolean;
  /** Sort by field */
  sortBy?: 'supplyAPY' | 'borrowAPY' | 'totalSupplyUSD' | 'totalBorrowUSD' | 'utilization';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Refresh interval in milliseconds */
  refetchInterval?: number;
  /** Disable automatic fetching */
  enabled?: boolean;
}

export interface UseLendingMarketsReturn {
  /** All markets after filtering */
  markets: LendingMarket[];
  /** Markets grouped by protocol */
  marketsByProtocol: Record<LendingProtocol, LendingMarket[]>;
  /** Markets grouped by asset */
  marketsByAsset: Record<string, LendingMarket[]>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object */
  error: Error | null;
  /** Refetch markets */
  refetch: () => void;
  /** Unique asset symbols */
  uniqueAssets: string[];
  /** Best supply APY for each asset */
  bestSupplyByAsset: Record<string, LendingMarket>;
  /** Best borrow rate for each asset */
  bestBorrowByAsset: Record<string, LendingMarket>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useLendingMarkets(
  options: UseLendingMarketsOptions = {}
): UseLendingMarketsReturn {
  const {
    protocol,
    assetSymbol,
    category,
    canSupply,
    canBorrow,
    sortBy = 'totalSupplyUSD',
    sortDirection = 'desc',
    refetchInterval = 30000, // 30 seconds default
    enabled = true,
  } = options;

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // Fetch all markets
  const {
    data: aggregatedMarkets,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AggregatedMarkets>({
    queryKey: ['lending-markets', chainId],
    queryFn: async () => {
      if (!publicClient) throw new Error('No public client');
      // Create service with the current chain ID to handle testnet properly
      const service = createLendingService(publicClient, chainId);
      return service.getMarkets();
    },
    enabled: enabled && !!publicClient,
    staleTime: 15000, // 15 seconds
    refetchInterval,
  });

  // Apply filters and sorting
  const processedData = useMemo(() => {
    if (!aggregatedMarkets) {
      return {
        markets: [],
        marketsByProtocol: { aave: [], morpho: [], compound: [], moonwell: [] },
        marketsByAsset: {},
        uniqueAssets: [],
        bestSupplyByAsset: {},
        bestBorrowByAsset: {},
      };
    }

    // Start with all markets
    let filtered = [...aggregatedMarkets.all];

    // Apply filters
    if (protocol) {
      filtered = filtered.filter((m) => m.protocol === protocol);
    }
    if (assetSymbol) {
      filtered = filtered.filter(
        (m) => m.assetSymbol.toUpperCase() === assetSymbol.toUpperCase()
      );
    }
    if (category) {
      filtered = filtered.filter((m) => m.assetCategory === category);
    }
    if (canSupply !== undefined) {
      filtered = filtered.filter((m) => m.canSupply === canSupply);
    }
    if (canBorrow !== undefined) {
      filtered = filtered.filter((m) => m.canBorrow === canBorrow);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'supplyAPY':
          comparison = a.supplyAPY - b.supplyAPY;
          break;
        case 'borrowAPY':
          comparison = a.borrowAPY - b.borrowAPY;
          break;
        case 'totalSupplyUSD':
          comparison = a.totalSupplyUSD - b.totalSupplyUSD;
          break;
        case 'totalBorrowUSD':
          comparison = a.totalBorrowUSD - b.totalBorrowUSD;
          break;
        case 'utilization':
          comparison = a.utilization - b.utilization;
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Group by protocol
    const marketsByProtocol: Record<LendingProtocol, LendingMarket[]> = {
      aave: [],
      morpho: [],
      compound: [],
      moonwell: [],
    };
    for (const market of filtered) {
      marketsByProtocol[market.protocol].push(market);
    }

    // Group by asset
    const marketsByAsset: Record<string, LendingMarket[]> = {};
    for (const market of filtered) {
      const key = market.assetSymbol.toUpperCase();
      if (!marketsByAsset[key]) {
        marketsByAsset[key] = [];
      }
      marketsByAsset[key].push(market);
    }

    // Get unique assets
    const uniqueAssets = Object.keys(marketsByAsset);

    // Find best supply APY for each asset
    const bestSupplyByAsset: Record<string, LendingMarket> = {};
    for (const [asset, markets] of Object.entries(marketsByAsset)) {
      const supplyable = markets.filter((m) => m.canSupply);
      if (supplyable.length > 0) {
        bestSupplyByAsset[asset] = supplyable.reduce((best, m) =>
          m.netSupplyAPY > best.netSupplyAPY ? m : best
        );
      }
    }

    // Find best borrow rate for each asset
    const bestBorrowByAsset: Record<string, LendingMarket> = {};
    for (const [asset, markets] of Object.entries(marketsByAsset)) {
      const borrowable = markets.filter((m) => m.canBorrow);
      if (borrowable.length > 0) {
        bestBorrowByAsset[asset] = borrowable.reduce((best, m) =>
          m.netBorrowAPY < best.netBorrowAPY ? m : best
        );
      }
    }

    return {
      markets: filtered,
      marketsByProtocol,
      marketsByAsset,
      uniqueAssets,
      bestSupplyByAsset,
      bestBorrowByAsset,
    };
  }, [
    aggregatedMarkets,
    protocol,
    assetSymbol,
    category,
    canSupply,
    canBorrow,
    sortBy,
    sortDirection,
  ]);

  return {
    ...processedData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['lending-markets'] });
      refetch();
    },
  };
}

// =============================================================================
// SINGLE MARKET HOOK
// =============================================================================

export function useLendingMarket(
  protocol: LendingProtocol,
  marketId: string
): {
  market: LendingMarket | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const { data, isLoading, isError, error, refetch } = useQuery<LendingMarket | null>({
    queryKey: ['lending-market', protocol, marketId, chainId],
    queryFn: async () => {
      if (!publicClient) throw new Error('No public client');
      // Create service with the current chain ID to handle testnet properly
      const service = createLendingService(publicClient, chainId);
      return service.getMarket(protocol, marketId);
    },
    enabled: !!publicClient && !!protocol && !!marketId,
    staleTime: 15000,
  });

  return {
    market: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
