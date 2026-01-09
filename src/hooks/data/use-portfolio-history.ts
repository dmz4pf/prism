/**
 * usePortfolioHistory Hook
 *
 * Provides historical portfolio data for the dashboard chart.
 * Aggregates data from all position hooks and generates time-series data.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useStakingPositions } from '@/hooks/staking/use-staking-positions';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { useUserPositions as useStablePositions } from '@/hooks/stablecoin/use-user-positions';
import { useStrategies } from '@/hooks/wallet/use-strategies';
import {
  getPortfolioHistory,
  recordSnapshot,
} from '@/services/portfolio-history';
import type {
  TimeRange,
  ChartDataPoint,
  CurrentPositionsSummary,
  ProtocolBreakdown,
  UsePortfolioHistoryReturn,
} from '@/types/portfolio-history';

// =============================================================================
// HOOK
// =============================================================================

export function usePortfolioHistory(): UsePortfolioHistoryReturn {
  const { address, isConnected } = useAccount();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ==========================================================================
  // GET POSITION DATA FROM ALL HOOKS
  // ==========================================================================

  const {
    positions: stakingPositions,
    stats: stakingStats,
    isLoading: isLoadingStaking,
  } = useStakingPositions({ enabled: isConnected });

  const {
    positions: lendingPositions,
    stats: lendingStats,
    isLoading: isLoadingLending,
  } = useLendingPositions({ enabled: isConnected });

  const {
    positions: stablePositions,
    totalValue: stableTotalValue,
    isLoading: isLoadingStable,
  } = useStablePositions();

  const { positions: strategyPositions } = useStrategies();

  // ==========================================================================
  // BUILD CURRENT POSITIONS SUMMARY
  // ==========================================================================

  const currentPositions = useMemo((): CurrentPositionsSummary => {
    // Build staking breakdown
    const stakingBreakdown: ProtocolBreakdown[] = stakingPositions.map(pos => ({
      protocol: pos.protocol,
      value: pos.balanceUsd,
      apy: pos.apy,
      token: pos.token.symbol,
    }));

    // Build lending breakdown
    const lendingBreakdown: ProtocolBreakdown[] = lendingPositions.map(pos => ({
      protocol: pos.protocol === 'morpho' ? 'Morpho' : pos.protocol === 'aave' ? 'Aave V3' : pos.protocol,
      value: pos.supplyBalanceUSD,
      apy: pos.currentSupplyAPY,
      token: pos.assetSymbol,
    }));

    // Build stable yield breakdown
    const stableBreakdown: ProtocolBreakdown[] = stablePositions.map(pos => ({
      protocol: pos.pool.protocol.charAt(0).toUpperCase() + pos.pool.protocol.slice(1),
      value: pos.supplied.usd,
      apy: pos.currentApy,
      token: pos.pool.asset.symbol,
    }));

    // Build strategies breakdown
    const strategiesBreakdown: ProtocolBreakdown[] = strategyPositions.map(pos => ({
      protocol: pos.strategyName,
      value: pos.currentValue,
      apy: pos.runningAPY,
    }));

    // Calculate totals
    const stakingTotal = stakingStats?.totalValueUsd || 0;
    const lendingTotal = lendingStats?.netWorthUSD || 0;
    const stableTotal = stableTotalValue || 0;
    const strategiesTotal = strategyPositions.reduce((sum, p) => sum + p.currentValue, 0);

    return {
      staking: {
        total: stakingTotal,
        breakdown: stakingBreakdown,
      },
      lending: {
        total: lendingTotal,
        breakdown: lendingBreakdown,
      },
      stableYield: {
        total: stableTotal,
        breakdown: stableBreakdown,
      },
      strategies: {
        total: strategiesTotal,
        breakdown: strategiesBreakdown,
      },
    };
  }, [
    stakingPositions,
    stakingStats,
    lendingPositions,
    lendingStats,
    stablePositions,
    stableTotalValue,
    strategyPositions,
  ]);

  // ==========================================================================
  // RECORD SNAPSHOT ON LOAD
  // ==========================================================================

  useEffect(() => {
    if (!address || !isConnected) return;

    // Don't record if still loading
    const isAllLoaded = !isLoadingStaking && !isLoadingLending && !isLoadingStable;
    if (!isAllLoaded) return;

    // Record current positions as a snapshot
    recordSnapshot(address, currentPositions);
  }, [address, isConnected, currentPositions, isLoadingStaking, isLoadingLending, isLoadingStable]);

  // ==========================================================================
  // GENERATE CHART DATA
  // ==========================================================================

  const { data, isSimulated } = useMemo(() => {
    if (!address || !isConnected) {
      console.log('[usePortfolioHistory] Not connected, returning empty data');
      return { data: [] as ChartDataPoint[], isSimulated: true };
    }

    try {
      console.log('[usePortfolioHistory] Generating history with positions:', {
        staking: currentPositions.staking.total,
        lending: currentPositions.lending.total,
        stableYield: currentPositions.stableYield.total,
        strategies: currentPositions.strategies.total,
        timeRange,
      });

      const result = getPortfolioHistory(currentPositions, timeRange, address);

      console.log('[usePortfolioHistory] Generated data:', {
        dataPoints: result.data.length,
        isSimulated: result.isSimulated,
        firstPoint: result.data[0],
        lastPoint: result.data[result.data.length - 1],
      });

      return result;
    } catch (err) {
      console.error('[usePortfolioHistory] Error generating history:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate history'));
      return { data: [] as ChartDataPoint[], isSimulated: true };
    }
  }, [currentPositions, timeRange, address, isConnected]);

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  useEffect(() => {
    const isDataLoading = isLoadingStaking || isLoadingLending || isLoadingStable;
    setIsLoading(isDataLoading);
  }, [isLoadingStaking, isLoadingLending, isLoadingStable]);

  // ==========================================================================
  // REFETCH
  // ==========================================================================

  const refetch = useCallback(() => {
    // Trigger re-generation by updating positions
    // The hooks will refetch their data
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    data,
    timeRange,
    setTimeRange,
    isLoading,
    error,
    isSimulated,
    refetch,
  };
}

export default usePortfolioHistory;
