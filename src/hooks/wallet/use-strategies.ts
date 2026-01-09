'use client';

/**
 * useStrategies - Strategy management hook
 *
 * Phase 1: Strategies are displayed but require smart wallet for execution.
 * Users can view strategy details but cannot execute them directly.
 *
 * Phase 2: When smart wallet is deployed, enterStrategy and exitStrategy
 * will be enabled for batched multi-protocol transactions.
 */

import { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

import { STRATEGY_VAULTS } from '@/contracts/addresses';
import { usePrismWallet } from './use-prism-wallet';
import type { StrategyRecommendation, StrategyPosition } from '@/types';

const BASE_CHAIN_ID = 8453;

// Pre-built strategy definitions
const STRATEGIES: StrategyRecommendation[] = [
  {
    id: 'eth-maximizer',
    name: 'ETH Yield Maximizer',
    description: 'Stake ETH via Lido, use as collateral on Aave, borrow USDC, convert to sDAI for additional yield.',
    timeHorizon: 'long',
    currentAPY: 8.4,
    calculatedAt: new Date().toISOString(),
    riskLevel: 'medium',
    riskFactors: [
      'Liquidation risk if ETH price drops significantly',
      'Smart contract risk across multiple protocols',
      'stETH depeg risk (historically minimal)',
    ],
    flow: [
      { protocol: 'Lido', action: 'stake', tokenIn: 'ETH', tokenOut: 'stETH', apy: 3.4 },
      { protocol: 'Aave', action: 'supply', tokenIn: 'stETH', tokenOut: 'aStETH', apy: 0 },
      { protocol: 'Aave', action: 'borrow', tokenIn: 'aStETH', tokenOut: 'USDC', apy: -3.2 },
      { protocol: 'Spark', action: 'convert', tokenIn: 'USDC', tokenOut: 'sDAI', apy: 5.8 },
    ],
    recommendedSince: '2024-01-01',
    lastReviewedAt: new Date().toISOString(),
    historicalAPY: [
      { date: '2024-12-01', apy: 8.1 },
      { date: '2024-12-15', apy: 8.3 },
      { date: '2025-01-01', apy: 8.4 },
    ],
    tvlUsd: 0,
    minDeposit: 0.1,
    maxDeposit: 50,
    inputToken: 'ETH',
    inputTokenAddress: '0x0000000000000000000000000000000000000000' as Address,
    vaultAddress: STRATEGY_VAULTS[BASE_CHAIN_ID]?.ETH_MAXIMIZER,
    featured: true,
    weeksPick: true,
  },
  {
    id: 'stable-yield-plus',
    name: 'Stable Yield Plus',
    description: 'Convert USDC to sDAI, use as collateral on Aave, borrow USDC, loop into more sDAI for enhanced stable yield.',
    timeHorizon: 'long',
    currentAPY: 6.8,
    calculatedAt: new Date().toISOString(),
    riskLevel: 'low',
    riskFactors: [
      'sDAI depeg risk (backed by RWAs)',
      'Smart contract risk',
      'Aave liquidation if sDAI value drops',
    ],
    flow: [
      { protocol: 'Spark', action: 'convert', tokenIn: 'USDC', tokenOut: 'sDAI', apy: 5.8 },
      { protocol: 'Aave', action: 'supply', tokenIn: 'sDAI', tokenOut: 'asDAI', apy: 0 },
      { protocol: 'Aave', action: 'borrow', tokenIn: 'asDAI', tokenOut: 'USDC', apy: -4.1 },
      { protocol: 'Spark', action: 'loop', tokenIn: 'USDC', tokenOut: 'sDAI', apy: 5.1 },
    ],
    recommendedSince: '2024-02-15',
    lastReviewedAt: new Date().toISOString(),
    historicalAPY: [
      { date: '2024-12-01', apy: 6.5 },
      { date: '2024-12-15', apy: 6.7 },
      { date: '2025-01-01', apy: 6.8 },
    ],
    tvlUsd: 0,
    minDeposit: 100,
    maxDeposit: 100000,
    inputToken: 'USDC',
    inputTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    vaultAddress: STRATEGY_VAULTS[BASE_CHAIN_ID]?.STABLE_YIELD_PLUS,
  },
  {
    id: 'ethena-delta-neutral',
    name: 'Ethena Delta Neutral',
    description: 'Convert USDC to USDe, stake for sUSDe to earn funding rate yield from perpetual futures basis trading.',
    timeHorizon: 'medium',
    currentAPY: 15.2,
    calculatedAt: new Date().toISOString(),
    riskLevel: 'medium',
    riskFactors: [
      'USDe depeg risk during market stress',
      'Funding rate can turn negative',
      'Custodial risk with CEX collateral',
    ],
    flow: [
      { protocol: 'Ethena', action: 'convert', tokenIn: 'USDC', tokenOut: 'USDe', apy: 0 },
      { protocol: 'Ethena', action: 'stake', tokenIn: 'USDe', tokenOut: 'sUSDe', apy: 15.2 },
    ],
    recommendedSince: '2024-03-01',
    lastReviewedAt: new Date().toISOString(),
    historicalAPY: [
      { date: '2024-12-01', apy: 18.5 },
      { date: '2024-12-15', apy: 16.8 },
      { date: '2025-01-01', apy: 15.2 },
    ],
    tvlUsd: 0,
    minDeposit: 500,
    maxDeposit: 25000,
    inputToken: 'USDC',
    inputTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    vaultAddress: STRATEGY_VAULTS[BASE_CHAIN_ID]?.ETHENA_DELTA_NEUTRAL,
  },
];

export function useStrategies() {
  const { address, chainId } = useAccount();
  const { prismWalletAddress, hasWallet } = usePrismWallet();

  // Fetch all strategies (with live APY data from backend)
  const { data: strategies = STRATEGIES, isLoading: isLoadingStrategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: async (): Promise<StrategyRecommendation[]> => {
      // Return static data for now - in production, fetch from backend
      return STRATEGIES;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user's strategy positions
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ['strategyPositions', prismWalletAddress],
    queryFn: async (): Promise<StrategyPosition[]> => {
      if (!prismWalletAddress) return [];
      // Return empty array for now - in production, fetch from backend
      return [];
    },
    enabled: !!prismWalletAddress,
  });

  // Get featured strategy (This Week's Pick)
  const featuredStrategy = useMemo(() => {
    return strategies?.find(s => s.weeksPick) ?? strategies?.[0];
  }, [strategies]);

  // Get strategies by time horizon
  const strategiesByHorizon = useMemo(() => {
    if (!strategies) return { long: [], medium: [], opportunistic: [] };

    return {
      long: strategies.filter(s => s.timeHorizon === 'long'),
      medium: strategies.filter(s => s.timeHorizon === 'medium'),
      opportunistic: strategies.filter(s => s.timeHorizon === 'opportunistic'),
    };
  }, [strategies]);

  /**
   * Enter a strategy (deposit into vault)
   *
   * Phase 1: Not available - requires smart wallet system
   * Phase 2: Will execute batched transactions via router
   */
  const enterStrategy = useCallback(async (strategyId: string, amount: string) => {
    // Phase 1: Strategies require smart wallet infrastructure
    throw new Error(
      'Strategy execution requires Prism Smart Wallet. ' +
      'This feature is coming soon. For now, use Simple Actions to interact directly with protocols.'
    );
  }, []);

  /**
   * Exit a strategy (withdraw from vault)
   *
   * Phase 1: Not available - requires smart wallet system
   * Phase 2: Will execute exit via router
   */
  const exitStrategy = useCallback(async (
    positionId: string,
    withdrawType: 'full_exit' | 'partial_exit' | 'profits_only',
    percentage?: number
  ) => {
    // Phase 1: Strategies require smart wallet infrastructure
    throw new Error(
      'Strategy exit requires Prism Smart Wallet. ' +
      'This feature is coming soon.'
    );
  }, []);

  // Get strategy by ID
  const getStrategy = useCallback((strategyId: string) => {
    return strategies?.find(s => s.id === strategyId);
  }, [strategies]);

  // Get position by ID
  const getPosition = useCallback((positionId: string) => {
    return positions?.find(p => p.id === positionId);
  }, [positions]);

  // Calculate total portfolio value in strategies
  const totalStrategyValue = useMemo(() => {
    return positions?.reduce((sum, p) => sum + p.currentValue, 0) ?? 0;
  }, [positions]);

  // Check if strategies are available (Phase 2 feature)
  const isStrategiesAvailable = false; // Will be true when smart wallet is deployed

  // Get position for a specific strategy
  const getPositionForStrategy = useCallback((strategyId: string) => {
    return positions?.find(p => p.strategyId === strategyId);
  }, [positions]);

  return {
    // Data
    strategies,
    positions,
    featuredStrategy,
    strategiesByHorizon,

    // Loading states
    isLoadingStrategies,
    isLoadingPositions,
    isLoading: isLoadingStrategies || isLoadingPositions,
    isPending: false, // No pending transactions in Phase 1

    // Actions
    enterStrategy,
    exitStrategy,

    // Helpers
    getStrategy,
    getPosition,
    getPositionForStrategy,
    totalStrategyValue,

    // Feature flags
    isStrategiesAvailable,
  };
}
