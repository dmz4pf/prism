/**
 * Pool Data Service
 *
 * Aggregates pool data from multiple sources:
 * 1. Morpho GraphQL API (primary for Morpho)
 * 2. DefiLlama Yields API (fallback/verification)
 * 3. On-chain reads (real-time for positions)
 * 4. Mock data (for testnet)
 *
 * Cache Strategy:
 * - Pool/APY data: 3 days (slow-changing metrics)
 * - User positions: 5 minutes (balance updates)
 * - Prices: 1 hour (stablecoins are... stable)
 *
 * Network Strategy:
 * - Mainnet: Live API data with fallbacks
 * - Testnet: Mock data for testing UI flows
 */

import {
  StablecoinPool,
  UserStablecoinPosition,
  UserPortfolio,
  ProtocolName,
  StablecoinSymbol,
} from '@/types/stablecoin';
import {
  BASE_CHAIN_ID,
  STABLECOIN_ADDRESSES,
  PROTOCOL_METADATA,
  getPoolAddress,
  getReceiptTokenAddress,
} from '@/contracts/addresses/stablecoin-protocols';
import { shouldUseMockData, getChainId } from '@/contracts/addresses/network-config';
import { getMorphoPoolsWithFallback } from './morpho-api';
import { getDefiLlamaPoolsWithFallback } from './defillama-api';
import {
  generateMockPools,
  generateMockPoolsWithVariation,
  simulateNetworkDelay,
} from './mock-data';
import {
  getCached,
  setCached,
  allPoolsCacheKey,
  poolCacheKey,
  positionCacheKey,
  invalidateCache,
} from './cache';

// =============================================================================
// COMBINED POOL DATA
// =============================================================================

/**
 * Get all stablecoin pools from all protocols
 * This is the main function for fetching pool data
 *
 * On testnet: Returns mock data
 * On mainnet: Fetches from APIs with fallback
 */
export async function getAllPools(): Promise<StablecoinPool[]> {
  // Use mock data on testnet
  if (shouldUseMockData()) {
    console.log('[PoolData] Using mock data (testnet mode)');
    await simulateNetworkDelay(100, 300); // Simulate network delay for realistic UX
    // Sort mock pools by APY (highest first) to match mainnet behavior
    return generateMockPools().sort((a, b) => b.apy.net - a.apy.net);
  }

  const cacheKey = allPoolsCacheKey();

  // Check cache first (3 days)
  const cached = getCached<StablecoinPool[]>(cacheKey);
  if (cached) {
    console.log(`[PoolData] Using cached pool data (${cached.data.length} pools)`);
    return cached.data;
  }

  console.log('[PoolData] Fetching fresh pool data...');

  // Fetch from all sources in parallel
  const [morphoPools, defiLlamaPools] = await Promise.all([
    getMorphoPoolsWithFallback(),
    getDefiLlamaPoolsWithFallback(),
  ]);

  // Combine and deduplicate pools
  const poolMap = new Map<string, StablecoinPool>();

  // Morpho pools take priority (more accurate data from their API)
  for (const pool of morphoPools) {
    poolMap.set(pool.id, pool);
  }

  // Add DefiLlama pools for protocols not covered by Morpho
  for (const pool of defiLlamaPools) {
    if (!poolMap.has(pool.id)) {
      // Only add if we don't have this pool yet
      poolMap.set(pool.id, pool);
    }
  }

  // Convert to array and sort by APY (highest first)
  const allPools = Array.from(poolMap.values()).sort((a, b) => b.apy.net - a.apy.net);

  // Cache for 3 days
  setCached(cacheKey, allPools, 'POOL_DATA', 'api');

  console.log(`[PoolData] Fetched ${allPools.length} pools`);

  return allPools;
}

/**
 * Get pools filtered by protocol
 */
export async function getPoolsByProtocol(protocol: ProtocolName): Promise<StablecoinPool[]> {
  const allPools = await getAllPools();
  return allPools.filter((pool) => pool.protocol === protocol);
}

/**
 * Get pools filtered by asset
 */
export async function getPoolsByAsset(asset: StablecoinSymbol): Promise<StablecoinPool[]> {
  const allPools = await getAllPools();
  return allPools.filter((pool) => pool.asset.symbol === asset);
}

/**
 * Get a specific pool by ID
 */
export async function getPoolById(poolId: string): Promise<StablecoinPool | null> {
  const allPools = await getAllPools();
  return allPools.find((pool) => pool.id === poolId) || null;
}

/**
 * Get the best pool for a specific asset (highest APY)
 */
export async function getBestPoolForAsset(asset: StablecoinSymbol): Promise<StablecoinPool | null> {
  const pools = await getPoolsByAsset(asset);
  if (pools.length === 0) return null;

  // Sort by net APY and return the best
  return pools.sort((a, b) => b.apy.net - a.apy.net)[0];
}

/**
 * Get pools sorted by a specific metric
 */
export async function getPoolsSorted(
  sortBy: 'apy' | 'tvl' | 'risk' = 'apy',
  order: 'asc' | 'desc' = 'desc'
): Promise<StablecoinPool[]> {
  const allPools = await getAllPools();

  return allPools.sort((a, b) => {
    let comparison: number;

    switch (sortBy) {
      case 'apy':
        comparison = a.apy.net - b.apy.net;
        break;
      case 'tvl':
        comparison = a.tvl.usd - b.tvl.usd;
        break;
      case 'risk':
        // A = 1, B = 2, C = 3, D = 4 (lower is better)
        const riskOrder = { A: 1, B: 2, C: 3, D: 4 };
        comparison = riskOrder[a.risk.score] - riskOrder[b.risk.score];
        break;
      default:
        comparison = 0;
    }

    return order === 'desc' ? -comparison : comparison;
  });
}

// =============================================================================
// POOL STATISTICS
// =============================================================================

interface PoolStatistics {
  totalTvl: number;
  avgApy: number;
  poolCount: number;
  byProtocol: Record<ProtocolName, {
    tvl: number;
    avgApy: number;
    poolCount: number;
  }>;
  byAsset: Record<StablecoinSymbol, {
    tvl: number;
    avgApy: number;
    poolCount: number;
  }>;
}

/**
 * Get aggregate statistics for all pools
 */
export async function getPoolStatistics(): Promise<PoolStatistics> {
  const allPools = await getAllPools();

  const byProtocol: PoolStatistics['byProtocol'] = {
    aave: { tvl: 0, avgApy: 0, poolCount: 0 },
    morpho: { tvl: 0, avgApy: 0, poolCount: 0 },
    moonwell: { tvl: 0, avgApy: 0, poolCount: 0 },
    compound: { tvl: 0, avgApy: 0, poolCount: 0 },
    fluid: { tvl: 0, avgApy: 0, poolCount: 0 },
  };

  const byAsset: PoolStatistics['byAsset'] = {
    USDC: { tvl: 0, avgApy: 0, poolCount: 0 },
    USDT: { tvl: 0, avgApy: 0, poolCount: 0 },
    DAI: { tvl: 0, avgApy: 0, poolCount: 0 },
    USDbC: { tvl: 0, avgApy: 0, poolCount: 0 },
  };

  let totalTvl = 0;
  let totalWeightedApy = 0;

  for (const pool of allPools) {
    totalTvl += pool.tvl.usd;
    totalWeightedApy += pool.apy.net * pool.tvl.usd;

    // By protocol
    const protocolStats = byProtocol[pool.protocol];
    protocolStats.tvl += pool.tvl.usd;
    protocolStats.avgApy += pool.apy.net;
    protocolStats.poolCount += 1;

    // By asset
    const assetStats = byAsset[pool.asset.symbol as StablecoinSymbol];
    if (assetStats) {
      assetStats.tvl += pool.tvl.usd;
      assetStats.avgApy += pool.apy.net;
      assetStats.poolCount += 1;
    }
  }

  // Calculate averages
  for (const stats of Object.values(byProtocol)) {
    if (stats.poolCount > 0) {
      stats.avgApy = stats.avgApy / stats.poolCount;
    }
  }
  for (const stats of Object.values(byAsset)) {
    if (stats.poolCount > 0) {
      stats.avgApy = stats.avgApy / stats.poolCount;
    }
  }

  return {
    totalTvl,
    avgApy: totalTvl > 0 ? totalWeightedApy / totalTvl : 0,
    poolCount: allPools.length,
    byProtocol,
    byAsset,
  };
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Force refresh pool data (invalidate cache and fetch fresh)
 */
export async function refreshPoolData(): Promise<StablecoinPool[]> {
  console.log('[PoolData] Force refreshing pool data...');

  // Invalidate cache
  invalidateCache(allPoolsCacheKey());

  // Fetch fresh data
  return getAllPools();
}

/**
 * Get cache status for pool data
 */
export function getPoolDataCacheStatus(): {
  isCached: boolean;
  timestamp: number | null;
  expiresAt: number | null;
  source: string | null;
} {
  const cached = getCached<StablecoinPool[]>(allPoolsCacheKey());

  if (!cached) {
    return {
      isCached: false,
      timestamp: null,
      expiresAt: null,
      source: null,
    };
  }

  return {
    isCached: true,
    timestamp: cached.timestamp,
    expiresAt: cached.expiresAt,
    source: cached.source,
  };
}

// =============================================================================
// PROTOCOL INFO
// =============================================================================

/**
 * Get metadata for all supported protocols
 */
export function getSupportedProtocols(): typeof PROTOCOL_METADATA {
  return PROTOCOL_METADATA;
}

/**
 * Get supported stablecoins
 */
export function getSupportedStablecoins(): { symbol: StablecoinSymbol; address: string; name: string }[] {
  return [
    { symbol: 'USDC', address: STABLECOIN_ADDRESSES.USDC, name: 'USD Coin' },
    { symbol: 'USDbC', address: STABLECOIN_ADDRESSES.USDbC, name: 'Bridged USDC' },
    { symbol: 'DAI', address: STABLECOIN_ADDRESSES.DAI, name: 'Dai Stablecoin' },
  ];
}

// =============================================================================
// SEARCH & FILTER
// =============================================================================

interface PoolFilters {
  protocols?: ProtocolName[];
  assets?: StablecoinSymbol[];
  minApy?: number;
  maxApy?: number;
  minTvl?: number;
  riskScores?: ('A' | 'B' | 'C' | 'D')[];
}

/**
 * Filter pools based on criteria
 */
export async function filterPools(filters: PoolFilters): Promise<StablecoinPool[]> {
  let pools = await getAllPools();

  if (filters.protocols && filters.protocols.length > 0) {
    pools = pools.filter((p) => filters.protocols!.includes(p.protocol));
  }

  if (filters.assets && filters.assets.length > 0) {
    pools = pools.filter((p) => filters.assets!.includes(p.asset.symbol as StablecoinSymbol));
  }

  if (filters.minApy !== undefined) {
    pools = pools.filter((p) => p.apy.net >= filters.minApy!);
  }

  if (filters.maxApy !== undefined) {
    pools = pools.filter((p) => p.apy.net <= filters.maxApy!);
  }

  if (filters.minTvl !== undefined) {
    pools = pools.filter((p) => p.tvl.usd >= filters.minTvl!);
  }

  if (filters.riskScores && filters.riskScores.length > 0) {
    pools = pools.filter((p) => filters.riskScores!.includes(p.risk.score));
  }

  return pools;
}
