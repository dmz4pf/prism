/**
 * useLendingPositions Hook
 *
 * Fetches and manages user lending positions across all protocols.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { Address } from 'viem';
import { createLendingService, AggregatedPositions } from '@/services/lending';
import { LendingPosition, LendingProtocol } from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export interface UseLendingPositionsOptions {
  /** Filter by protocol */
  protocol?: LendingProtocol;
  /** Only show positions with supply */
  hasSupply?: boolean;
  /** Only show positions with borrow */
  hasBorrow?: boolean;
  /** Refresh interval in milliseconds */
  refetchInterval?: number;
  /** Disable automatic fetching */
  enabled?: boolean;
}

export interface UseLendingPositionsReturn {
  /** All positions after filtering */
  positions: LendingPosition[];
  /** Positions grouped by protocol */
  positionsByProtocol: Record<LendingProtocol, LendingPosition[]>;
  /** Aggregated stats */
  stats: {
    totalSupplyUSD: number;
    totalBorrowUSD: number;
    netWorthUSD: number;
    weightedAvgSupplyAPY: number;
    weightedAvgBorrowAPY: number;
    lowestHealthFactor: number;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object */
  error: Error | null;
  /** Refetch positions */
  refetch: () => void;
  /** Whether user has any positions */
  hasPositions: boolean;
  /** Whether user is at risk (low health factor) */
  isAtRisk: boolean;
  /** Protocol with lowest health factor */
  riskiestProtocol: LendingProtocol | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useLendingPositions(
  options: UseLendingPositionsOptions = {}
): UseLendingPositionsReturn {
  const {
    protocol,
    hasSupply,
    hasBorrow,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();
  const queryClient = useQueryClient();

  // Fetch all positions
  const {
    data: aggregatedPositions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AggregatedPositions>({
    queryKey: ['lending-positions', userAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !userAddress) throw new Error('No client or address');
      // Create service with the current chain ID to handle testnet properly
      const service = createLendingService(publicClient, chainId);
      return service.getUserPositions(userAddress);
    },
    enabled: enabled && !!publicClient && isConnected && !!userAddress,
    staleTime: 10000, // 10 seconds
    refetchInterval,
  });

  // Apply filters
  const processedData = useMemo(() => {
    if (!aggregatedPositions) {
      return {
        positions: [],
        positionsByProtocol: { aave: [], morpho: [], compound: [], moonwell: [] },
        stats: {
          totalSupplyUSD: 0,
          totalBorrowUSD: 0,
          netWorthUSD: 0,
          weightedAvgSupplyAPY: 0,
          weightedAvgBorrowAPY: 0,
          lowestHealthFactor: Infinity,
        },
        hasPositions: false,
        isAtRisk: false,
        riskiestProtocol: null,
      };
    }

    // Start with all positions
    let filtered = [...aggregatedPositions.all];

    // Apply filters
    if (protocol) {
      filtered = filtered.filter((p) => p.protocol === protocol);
    }
    if (hasSupply !== undefined) {
      if (hasSupply) {
        filtered = filtered.filter((p) => p.supplyBalance > 0n);
      } else {
        filtered = filtered.filter((p) => p.supplyBalance === 0n);
      }
    }
    if (hasBorrow !== undefined) {
      if (hasBorrow) {
        filtered = filtered.filter((p) => p.borrowBalance > 0n);
      } else {
        filtered = filtered.filter((p) => p.borrowBalance === 0n);
      }
    }

    // Group by protocol
    const positionsByProtocol: Record<LendingProtocol, LendingPosition[]> = {
      aave: [],
      morpho: [],
      compound: [],
      moonwell: [],
    };
    for (const position of filtered) {
      positionsByProtocol[position.protocol].push(position);
    }

    // Find riskiest protocol
    let riskiestProtocol: LendingProtocol | null = null;
    let lowestHF = Infinity;
    for (const position of filtered) {
      if (position.healthFactor && position.healthFactor < lowestHF) {
        lowestHF = position.healthFactor;
        riskiestProtocol = position.protocol;
      }
    }

    return {
      positions: filtered,
      positionsByProtocol,
      stats: {
        totalSupplyUSD: aggregatedPositions.totalSupplyUSD,
        totalBorrowUSD: aggregatedPositions.totalBorrowUSD,
        netWorthUSD: aggregatedPositions.netWorthUSD,
        weightedAvgSupplyAPY: aggregatedPositions.weightedAvgSupplyAPY,
        weightedAvgBorrowAPY: aggregatedPositions.weightedAvgBorrowAPY,
        lowestHealthFactor: aggregatedPositions.lowestHealthFactor,
      },
      hasPositions: filtered.length > 0,
      isAtRisk: aggregatedPositions.lowestHealthFactor < 1.2,
      riskiestProtocol,
    };
  }, [aggregatedPositions, protocol, hasSupply, hasBorrow]);

  return {
    ...processedData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['lending-positions', userAddress] });
      refetch();
    },
  };
}

// =============================================================================
// SINGLE PROTOCOL POSITIONS HOOK
// =============================================================================

export function useProtocolPositions(
  protocol: LendingProtocol
): {
  positions: LendingPosition[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  healthFactor: number;
} {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();

  const { data, isLoading, isError, error, refetch } = useQuery<LendingPosition[]>({
    queryKey: ['protocol-positions', protocol, userAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !userAddress) throw new Error('No client or address');
      // Create service with the current chain ID to handle testnet properly
      const service = createLendingService(publicClient, chainId);
      return service.getProtocolPositions(protocol, userAddress);
    },
    enabled: !!publicClient && isConnected && !!userAddress,
    staleTime: 10000,
  });

  const positions = data ?? [];
  const totalSupplyUSD = positions.reduce((sum, p) => sum + p.supplyBalanceUSD, 0);
  const totalBorrowUSD = positions.reduce((sum, p) => sum + p.borrowBalanceUSD, 0);
  const healthFactor = positions.reduce(
    (min, p) => (p.healthFactor && p.healthFactor < min ? p.healthFactor : min),
    Infinity
  );

  return {
    positions,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    totalSupplyUSD,
    totalBorrowUSD,
    healthFactor,
  };
}

// =============================================================================
// POSITION BY MARKET HOOK
// =============================================================================

export function usePositionByMarket(
  protocol: LendingProtocol,
  marketId: string
): {
  position: LendingPosition | null;
  isLoading: boolean;
} {
  const { positions, isLoading } = useLendingPositions({ protocol });

  const position = useMemo(() => {
    return positions.find((p) => p.marketId === marketId) ?? null;
  }, [positions, marketId]);

  return { position, isLoading };
}
