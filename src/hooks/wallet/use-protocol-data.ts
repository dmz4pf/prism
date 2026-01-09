'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProtocolRate, StakingRate, StableYieldRate } from '@/types';

// Static fallback data for protocol rates
const LENDING_RATES: ProtocolRate[] = [
  {
    protocol: 'Aave V3',
    protocolLogo: '/logos/aave.svg',
    asset: 'USDC',
    supplyAPY: 4.2,
    borrowAPY: 5.1,
    tvlUsd: 1250000000,
    utilizationRate: 78,
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Aave V3',
    protocolLogo: '/logos/aave.svg',
    asset: 'ETH',
    supplyAPY: 1.8,
    borrowAPY: 2.5,
    tvlUsd: 890000000,
    utilizationRate: 45,
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Compound V3',
    protocolLogo: '/logos/compound.svg',
    asset: 'USDC',
    supplyAPY: 3.9,
    borrowAPY: 4.8,
    tvlUsd: 650000000,
    utilizationRate: 72,
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Morpho',
    protocolLogo: '/logos/morpho.svg',
    asset: 'USDC',
    supplyAPY: 5.2,
    borrowAPY: 6.1,
    tvlUsd: 320000000,
    utilizationRate: 85,
    lastUpdated: new Date().toISOString(),
  },
];

const STAKING_RATES: StakingRate[] = [
  {
    protocol: 'Lido',
    protocolLogo: '/logos/lido.svg',
    token: 'ETH',
    stakedToken: 'stETH',
    apy: 3.4,
    tvlUsd: 28500000000,
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Rocket Pool',
    protocolLogo: '/logos/rocketpool.svg',
    token: 'ETH',
    stakedToken: 'rETH',
    apy: 3.1,
    tvlUsd: 4200000000,
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Coinbase',
    protocolLogo: '/logos/coinbase.svg',
    token: 'ETH',
    stakedToken: 'cbETH',
    apy: 2.9,
    tvlUsd: 2800000000,
    lastUpdated: new Date().toISOString(),
  },
];

const STABLE_YIELD_RATES: StableYieldRate[] = [
  {
    protocol: 'Spark',
    protocolLogo: '/logos/spark.svg',
    token: 'DAI',
    yieldToken: 'sDAI',
    apy: 5.8,
    tvlUsd: 1800000000,
    risk: 'low',
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Ondo',
    protocolLogo: '/logos/ondo.svg',
    token: 'USD',
    yieldToken: 'USDY',
    apy: 4.9,
    tvlUsd: 450000000,
    risk: 'low',
    lastUpdated: new Date().toISOString(),
  },
  {
    protocol: 'Ethena',
    protocolLogo: '/logos/ethena.svg',
    token: 'USDe',
    yieldToken: 'sUSDe',
    apy: 18.0,
    tvlUsd: 2100000000,
    risk: 'high',
    lastUpdated: new Date().toISOString(),
  },
];

// Protocol data hook
export function useProtocolData() {
  // Fetch lending rates
  const { data: lendingRates = LENDING_RATES, isLoading: isLoadingLending } = useQuery({
    queryKey: ['protocolData', 'lending'],
    queryFn: async () => LENDING_RATES,
    staleTime: 60 * 1000,
  });

  // Fetch staking rates
  const { data: stakingRates = STAKING_RATES, isLoading: isLoadingStaking } = useQuery({
    queryKey: ['protocolData', 'staking'],
    queryFn: async () => STAKING_RATES,
    staleTime: 60 * 1000,
  });

  // Fetch stable yield rates
  const { data: stableYieldRates = STABLE_YIELD_RATES, isLoading: isLoadingStables } = useQuery({
    queryKey: ['protocolData', 'stables'],
    queryFn: async () => STABLE_YIELD_RATES,
    staleTime: 60 * 1000,
  });

  // Get best rate for a specific action
  const getBestLendingRate = (asset: string, type: 'supply' | 'borrow') => {
    const assetRates = lendingRates.filter((r: ProtocolRate) => r.asset === asset);
    if (assetRates.length === 0) return null;

    if (type === 'supply') {
      return assetRates.reduce((best: ProtocolRate, current: ProtocolRate) =>
        (current.supplyAPY ?? 0) > (best.supplyAPY ?? 0) ? current : best
      );
    } else {
      return assetRates.reduce((best: ProtocolRate, current: ProtocolRate) =>
        (current.borrowAPY ?? Infinity) < (best.borrowAPY ?? Infinity) ? current : best
      );
    }
  };

  const getBestStakingRate = (token: string) => {
    const tokenRates = stakingRates.filter((r: StakingRate) => r.token === token);
    if (tokenRates.length === 0) return null;

    return tokenRates.reduce((best: StakingRate, current: StakingRate) =>
      current.apy > best.apy ? current : best
    );
  };

  const getBestStableYield = (riskTolerance: 'low' | 'medium' | 'high' = 'medium') => {
    const filteredRates = stableYieldRates.filter((r: StableYieldRate) => {
      if (riskTolerance === 'low') return r.risk === 'low';
      if (riskTolerance === 'medium') return r.risk !== 'high';
      return true;
    });

    if (filteredRates.length === 0) return null;

    return filteredRates.reduce((best: StableYieldRate, current: StableYieldRate) =>
      current.apy > best.apy ? current : best
    );
  };

  return {
    // Data
    lendingRates,
    stakingRates,
    stableYieldRates,

    // Loading
    isLoading: isLoadingLending || isLoadingStaking || isLoadingStables,

    // Helpers
    getBestLendingRate,
    getBestStakingRate,
    getBestStableYield,
  };
}

// Fetch live APY from DeFi Llama for a specific pool
export function useLiveAPY(poolId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['liveAPY', poolId],
    queryFn: async () => {
      const response = await fetch(`https://yields.llama.fi/chart/${poolId}`);
      if (!response.ok) throw new Error('Failed to fetch APY');
      const data = await response.json();
      return data.data?.[data.data.length - 1]?.apy ?? 0;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!poolId,
  });

  return { apy: data ?? 0, isLoading };
}
