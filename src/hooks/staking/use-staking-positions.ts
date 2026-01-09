/**
 * useStakingPositions Hook (Testnet-Aware)
 *
 * Fetches staking positions from blockchain on mainnet,
 * or generates mock positions on testnet.
 *
 * Interface is identical regardless of network.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useMemo } from 'react';
import type { Address } from 'viem';
import { getAllAdapters } from '@/services/adapters';
import type { StakingPosition, StakingType } from '@/types/staking';
import { IS_TESTNET } from '@/lib/smart-wallet';
import {
  generateMockStakingPositions,
  calculateStakingStats,
} from '@/services/mock-data';

// =============================================================================
// TYPES
// =============================================================================

export interface AggregatedStakingPositions {
  all: StakingPosition[];
  byProtocol: Record<string, StakingPosition[]>;
  byType: Record<StakingType, StakingPosition[]>;
  totalValueUsd: number;
  totalEarnedUsd: number;
  weightedAvgAPY: number;
  /** Indicates if data is from mock service */
  isMockData: boolean;
}

export interface UseStakingPositionsOptions {
  protocol?: string;
  type?: StakingType;
  refetchInterval?: number;
  enabled?: boolean;
}

export interface UseStakingPositionsReturn {
  positions: StakingPosition[];
  positionsByProtocol: Record<string, StakingPosition[]>;
  positionsByType: Record<StakingType, StakingPosition[]>;
  stats: {
    totalValueUsd: number;
    totalEarnedUsd: number;
    weightedAvgAPY: number;
    positionsCount: number;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  hasPositions: boolean;
  /** True if showing mock data (testnet) */
  isMockData: boolean;
}

// =============================================================================
// QUERY KEY
// =============================================================================

export const stakingPositionsQueryKey = {
  all: ['staking-positions'] as const,
  user: (address: string, network: 'mainnet' | 'testnet') =>
    ['staking-positions', 'user', address, network] as const,
};

// =============================================================================
// MAINNET FETCH FUNCTION
// =============================================================================

async function fetchMainnetStakingPositions(
  userAddress: Address
): Promise<AggregatedStakingPositions> {
  const adapters = getAllAdapters();

  const positionPromises = adapters.map(async (adapter) => {
    try {
      return await adapter.getPosition(userAddress);
    } catch (error) {
      console.warn(`[useStakingPositions] Failed to fetch from ${adapter.name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(positionPromises);
  const positions = results.filter((p): p is StakingPosition => p !== null);

  return aggregatePositions(positions, false);
}

// =============================================================================
// TESTNET FETCH FUNCTION (Mock Data)
// =============================================================================

async function fetchTestnetStakingPositions(
  userAddress: Address
): Promise<AggregatedStakingPositions> {
  // Small delay to simulate network request
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Generate mock positions (includes Lido, Coinbase, Ether.fi, Origin)
  const positions = generateMockStakingPositions(userAddress);

  console.log(`[useStakingPositions] Generated ${positions.length} mock positions for testnet`);

  return aggregatePositions(positions, true);
}

// =============================================================================
// AGGREGATION HELPER
// =============================================================================

function aggregatePositions(
  positions: StakingPosition[],
  isMockData: boolean
): AggregatedStakingPositions {
  const byProtocol: Record<string, StakingPosition[]> = {};
  const byType: Record<StakingType, StakingPosition[]> = {
    'liquid-staking': [],
    'liquid-restaking': [],
    'supercharged-lst': [],
    lending: [],
  };

  for (const position of positions) {
    const protocolKey = position.protocol.toLowerCase();
    if (!byProtocol[protocolKey]) {
      byProtocol[protocolKey] = [];
    }
    byProtocol[protocolKey].push(position);

    if (byType[position.type]) {
      byType[position.type].push(position);
    }
  }

  const stats = calculateStakingStats(positions);

  return {
    all: positions,
    byProtocol,
    byType,
    totalValueUsd: stats.totalBalanceUsd,
    totalEarnedUsd: stats.totalEarnedUsd,
    weightedAvgAPY: stats.averageAPY,
    isMockData,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useStakingPositions(
  options: UseStakingPositionsOptions = {}
): UseStakingPositionsReturn {
  const {
    protocol,
    type,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  const { address: userAddress, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const {
    data: aggregatedPositions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AggregatedStakingPositions>({
    queryKey: stakingPositionsQueryKey.user(
      userAddress || '',
      IS_TESTNET ? 'testnet' : 'mainnet'
    ),
    queryFn: () =>
      IS_TESTNET
        ? fetchTestnetStakingPositions(userAddress as Address)
        : fetchMainnetStakingPositions(userAddress as Address),
    enabled: enabled && isConnected && !!userAddress,
    staleTime: IS_TESTNET ? 60000 : 10000, // Longer stale time for mock data
    gcTime: 5 * 60 * 1000,
    refetchInterval: IS_TESTNET ? 0 : refetchInterval, // No auto-refresh for mock data
    refetchOnWindowFocus: !IS_TESTNET,
  });

  const processedData = useMemo(() => {
    if (!aggregatedPositions) {
      return {
        positions: [],
        positionsByProtocol: {},
        positionsByType: {
          'liquid-staking': [],
          'liquid-restaking': [],
          'supercharged-lst': [],
          lending: [],
        } as Record<StakingType, StakingPosition[]>,
        stats: {
          totalValueUsd: 0,
          totalEarnedUsd: 0,
          weightedAvgAPY: 0,
          positionsCount: 0,
        },
        hasPositions: false,
        isMockData: IS_TESTNET,
      };
    }

    let filtered = [...aggregatedPositions.all];

    if (protocol) {
      filtered = filtered.filter(
        (p) => p.protocol.toLowerCase() === protocol.toLowerCase()
      );
    }
    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    const totalValueUsd = filtered.reduce((sum, p) => sum + p.balanceUsd, 0);
    const totalEarnedUsd = filtered.reduce((sum, p) => sum + p.earnedTotalUsd, 0);

    let weightedAvgAPY = 0;
    if (totalValueUsd > 0) {
      const weightedSum = filtered.reduce(
        (sum, p) => sum + p.apy * p.balanceUsd,
        0
      );
      weightedAvgAPY = weightedSum / totalValueUsd;
    }

    return {
      positions: filtered,
      positionsByProtocol: aggregatedPositions.byProtocol,
      positionsByType: aggregatedPositions.byType,
      stats: {
        totalValueUsd,
        totalEarnedUsd,
        weightedAvgAPY,
        positionsCount: filtered.length,
      },
      hasPositions: filtered.length > 0,
      isMockData: aggregatedPositions.isMockData,
    };
  }, [aggregatedPositions, protocol, type]);

  return {
    ...processedData,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({
        queryKey: stakingPositionsQueryKey.user(
          userAddress || '',
          IS_TESTNET ? 'testnet' : 'mainnet'
        ),
      });
      refetch();
    },
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export function useProtocolStakingPositions(protocol: string) {
  return useStakingPositions({ protocol });
}

export function useStakingPositionsByType(type: StakingType) {
  return useStakingPositions({ type });
}

export function useInvalidateStakingPositions() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return {
    invalidate: () => {
      if (address) {
        queryClient.invalidateQueries({
          queryKey: stakingPositionsQueryKey.user(
            address,
            IS_TESTNET ? 'testnet' : 'mainnet'
          ),
        });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: stakingPositionsQueryKey.all,
      });
    },
  };
}

export default useStakingPositions;
