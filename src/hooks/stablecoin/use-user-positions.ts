/**
 * User Positions Hook (Testnet-Aware)
 *
 * Fetches user's stablecoin positions across all protocols.
 * Uses mock data on testnet, real blockchain data on mainnet.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { getUserPositions, getUserPortfolio } from '@/services/stablecoin/position-service';
import { UserStablecoinPosition, UserPortfolio } from '@/types/stablecoin';
import { isTestnet } from '@/lib/utils/network';
import {
  generateMockStablePositions,
  calculateMockStableStats,
} from '@/services/mock/mock-positions';
import type { Address } from 'viem';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const positionQueryKeys = {
  all: ['stablecoin-positions'] as const,
  user: (address: string, network: 'mainnet' | 'testnet') =>
    [...positionQueryKeys.all, 'user', address, network] as const,
  portfolio: (address: string, network: 'mainnet' | 'testnet') =>
    [...positionQueryKeys.all, 'portfolio', address, network] as const,
};

// =============================================================================
// TYPES
// =============================================================================

export interface UseUserPositionsReturn {
  positions: UserStablecoinPosition[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  hasPositions: boolean;
  totalValue: number;
  totalEarnings: number;
  avgApy: number;
  refetch: () => void;
  /** True if showing mock data (testnet) */
  isMockData: boolean;
}

export interface UseUserPortfolioReturn extends UseUserPositionsReturn {
  portfolio: UserPortfolio | null;
}

// =============================================================================
// TESTNET FETCH FUNCTION
// =============================================================================

async function fetchTestnetPositions(
  userAddress: Address
): Promise<UserStablecoinPosition[]> {
  // Small delay to simulate network request
  await new Promise((resolve) => setTimeout(resolve, 300));

  return generateMockStablePositions(userAddress, {
    includeAave: true,
    includeMorpho: true,
    includeMoonwell: false,
    includeCompound: false,
  });
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get user's stablecoin positions
 */
export function useUserPositions(): UseUserPositionsReturn {
  const { address, chainId, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const testnet = isTestnet();

  const {
    data: positions = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: positionQueryKeys.user(address || '', testnet ? 'testnet' : 'mainnet'),
    queryFn: () =>
      testnet
        ? fetchTestnetPositions(address as Address)
        : getUserPositions(address!, chainId),
    enabled: isConnected && !!address,
    staleTime: testnet ? 60000 : 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: !testnet,
  });

  // Calculate aggregates
  const hasPositions = positions.length > 0;

  let totalValue = 0;
  let totalEarnings = 0;
  let avgApy = 0;

  if (hasPositions) {
    totalValue = positions.reduce((sum, p) => sum + p.supplied.usd, 0);
    totalEarnings = positions.reduce(
      (sum, p) =>
        sum +
        p.accruedInterest.usd +
        p.pendingRewards.reduce((r, pr) => r + pr.usd, 0),
      0
    );

    // Weighted average APY
    const weightedApySum = positions.reduce(
      (sum, p) => sum + p.currentApy * p.supplied.usd,
      0
    );
    avgApy = totalValue > 0 ? weightedApySum / totalValue : 0;
  }

  return {
    positions,
    isLoading,
    isFetching,
    error: error as Error | null,
    hasPositions,
    totalValue,
    totalEarnings,
    avgApy,
    refetch,
    isMockData: testnet,
  };
}

/**
 * Get user's full portfolio with aggregated stats
 */
export function useUserPortfolio(): UseUserPortfolioReturn {
  const { address, chainId, isConnected } = useAccount();
  const testnet = isTestnet();

  const {
    data: portfolio,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: positionQueryKeys.portfolio(
      address || '',
      testnet ? 'testnet' : 'mainnet'
    ),
    queryFn: async () => {
      if (testnet) {
        const positions = await fetchTestnetPositions(address as Address);
        const stats = calculateMockStableStats(positions);
        return {
          walletAddress: address as Address,
          positions,
          totals: {
            supplied: stats.totalValue,
            interest: stats.totalEarnings,
            rewards: 0,
            portfolioValue: stats.totalValue + stats.totalEarnings,
          },
          avgApy: stats.avgApy,
          lastUpdated: Date.now(),
        } as UserPortfolio;
      }
      return getUserPortfolio(address!, chainId);
    },
    enabled: isConnected && !!address,
    staleTime: testnet ? 60000 : 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: !testnet,
  });

  const positions = portfolio?.positions || [];
  const hasPositions = positions.length > 0;
  const totalValue = portfolio?.totals.portfolioValue || 0;
  const totalEarnings =
    (portfolio?.totals.interest || 0) + (portfolio?.totals.rewards || 0);
  const avgApy = portfolio?.avgApy || 0;

  return {
    portfolio: portfolio || null,
    positions,
    isLoading,
    isFetching,
    error: error as Error | null,
    hasPositions,
    totalValue,
    totalEarnings,
    avgApy,
    refetch,
    isMockData: testnet,
  };
}

/**
 * Invalidate position data (call after deposit/withdraw)
 */
export function useInvalidatePositions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: positionQueryKeys.all });
  };
}

export default useUserPositions;
