'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { usePositions, usePortfolioMetrics } from './use-positions';
import type { Position, CashflowData, SankeyNode, SankeyLink } from '@/types';

// Chain colors for visualization
const CHAIN_COLORS: Record<number, string> = {
  8453: '#0052FF', // Base - Blue
  1: '#0EA5E9', // Ethereum - Sky blue
  42161: '#12AAFF', // Arbitrum - Light blue
  10: '#FF0420', // Optimism - Red
};

// Protocol colors
const PROTOCOL_COLORS: Record<string, string> = {
  aave: '#B6509E',
  lido: '#00A3FF',
  ethena: '#5B21B6',
  compound: '#00D395',
  uniswap: '#FF007A',
  default: '#06B6D4',
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  lending: '#22C55E',
  staking: '#3B82F6',
  'liquid-staking': '#8B5CF6',
  lp: '#F59E0B',
  yield: '#EF4444',
};

export function usePortfolioSummary() {
  const { metrics, isLoading, error } = usePortfolioMetrics();
  const { data: positions } = usePositions();

  // Calculate 24h change (would need historical data in real implementation)
  // For now, simulate based on APY
  const change24h = metrics
    ? positions?.reduce((sum, p) => {
        const dailyChange = (p.amountUsd * p.apy) / 365 / 100;
        // Add some variance for realism
        return sum + dailyChange * (0.8 + Math.random() * 0.4);
      }, 0) ?? 0
    : 0;

  const changePercent24h = metrics?.totalValue
    ? (change24h / metrics.totalValue) * 100
    : 0;

  return {
    data: metrics
      ? {
          totalValue: metrics.totalValue,
          change24h,
          changePercent24h,
          dailyYield: metrics.dailyYield,
          avgApy: metrics.avgApy,
          positionsCount: metrics.positionsCount,
        }
      : undefined,
    isLoading,
    error,
  };
}

export function useCashflowData() {
  const { data: positions, isLoading, error } = usePositions();

  const cashflowData = positions ? generateCashflowData(positions) : null;

  return {
    data: cashflowData,
    isLoading,
    error,
  };
}

function generateCashflowData(positions: Position[]): CashflowData {
  if (positions.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Group positions by protocol and category
  const byProtocol = new Map<string, Position[]>();
  const byCategory = new Map<string, number>();

  positions.forEach((p) => {
    // Group by protocol
    if (!byProtocol.has(p.protocol)) {
      byProtocol.set(p.protocol, []);
    }
    byProtocol.get(p.protocol)!.push(p);

    // Sum by category
    const category = getPositionCategory(p);
    byCategory.set(category, (byCategory.get(category) ?? 0) + p.amountUsd);
  });

  // Create wallet node (source)
  const totalValue = positions.reduce((sum, p) => sum + p.amountUsd, 0);
  nodes.push({
    id: 'wallet',
    label: 'Wallet',
    type: 'source',
    value: totalValue,
    color: '#06B6D4',
  });

  // Create protocol nodes (middle)
  byProtocol.forEach((prots, protocol) => {
    const value = prots.reduce((sum, p) => sum + p.amountUsd, 0);
    nodes.push({
      id: `protocol-${protocol}`,
      label: protocol,
      type: 'protocol',
      value,
      color: PROTOCOL_COLORS[protocol.toLowerCase()] ?? PROTOCOL_COLORS.default,
    });

    // Link from wallet to protocol
    links.push({
      source: 'wallet',
      target: `protocol-${protocol}`,
      value,
    });
  });

  // Create category nodes (targets)
  byCategory.forEach((value, category) => {
    nodes.push({
      id: `category-${category}`,
      label: formatCategoryLabel(category),
      type: 'category',
      value,
      color: CATEGORY_COLORS[category] ?? '#6B7280',
    });
  });

  // Link protocols to categories
  byProtocol.forEach((prots, protocol) => {
    const categoryValues = new Map<string, number>();

    prots.forEach((p) => {
      const category = getPositionCategory(p);
      categoryValues.set(
        category,
        (categoryValues.get(category) ?? 0) + p.amountUsd
      );
    });

    categoryValues.forEach((value, category) => {
      links.push({
        source: `protocol-${protocol}`,
        target: `category-${category}`,
        value,
      });
    });
  });

  return { nodes, links };
}

function getPositionCategory(position: Position): string {
  const protocol = position.protocol.toLowerCase();

  if (protocol === 'lido' || position.token === 'stETH') {
    return 'liquid-staking';
  }
  if (protocol === 'aave' || protocol === 'compound') {
    return 'lending';
  }
  if (protocol === 'ethena' || position.token.includes('USD')) {
    return 'yield';
  }
  if (protocol.includes('uniswap') || protocol.includes('curve')) {
    return 'lp';
  }

  return 'staking';
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    lending: 'Lending',
    staking: 'Staking',
    'liquid-staking': 'Liquid Staking',
    lp: 'LP Farming',
    yield: 'Yield Farming',
  };
  return labels[category] ?? category;
}

export function useChainDistribution() {
  const { data: positions } = usePositions();

  if (!positions) return null;

  const distribution = positions.reduce(
    (acc, p) => {
      if (!acc[p.chainId]) {
        acc[p.chainId] = {
          chainId: p.chainId,
          value: 0,
          count: 0,
          color: CHAIN_COLORS[p.chainId] ?? '#6B7280',
        };
      }
      acc[p.chainId].value += p.amountUsd;
      acc[p.chainId].count++;
      return acc;
    },
    {} as Record<
      number,
      { chainId: number; value: number; count: number; color: string }
    >
  );

  const total = Object.values(distribution).reduce((sum, d) => sum + d.value, 0);

  return Object.values(distribution).map((d) => ({
    ...d,
    percentage: total > 0 ? (d.value / total) * 100 : 0,
  }));
}

export function useProtocolDistribution() {
  const { data: positions } = usePositions();

  if (!positions) return null;

  const distribution = positions.reduce(
    (acc, p) => {
      if (!acc[p.protocol]) {
        acc[p.protocol] = {
          protocol: p.protocol,
          value: 0,
          count: 0,
          color:
            PROTOCOL_COLORS[p.protocol.toLowerCase()] ?? PROTOCOL_COLORS.default,
        };
      }
      acc[p.protocol].value += p.amountUsd;
      acc[p.protocol].count++;
      return acc;
    },
    {} as Record<
      string,
      { protocol: string; value: number; count: number; color: string }
    >
  );

  const total = Object.values(distribution).reduce((sum, d) => sum + d.value, 0);

  return Object.values(distribution).map((d) => ({
    ...d,
    percentage: total > 0 ? (d.value / total) * 100 : 0,
  }));
}
