/**
 * Pool Data Service Tests
 *
 * Tests for pool fetching, caching, filtering, and statistics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCKS
// =============================================================================

// Mock network config
vi.mock('@/contracts/addresses/network-config', () => ({
  shouldUseMockData: vi.fn(() => true), // Use mock data by default
  getChainId: vi.fn(() => 8453),
}));

// Mock cache
const mockCache = new Map();
vi.mock('../cache', () => ({
  getCached: vi.fn((key) => mockCache.get(key)),
  setCached: vi.fn((key, data, type, source) => {
    mockCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + 86400000,
      source,
    });
  }),
  invalidateCache: vi.fn((key) => mockCache.delete(key)),
  allPoolsCacheKey: vi.fn(() => 'all-pools'),
  poolCacheKey: vi.fn((id) => `pool-${id}`),
  positionCacheKey: vi.fn((addr) => `position-${addr}`),
}));

// Mock Morpho API
vi.mock('../morpho-api', () => ({
  getMorphoPoolsWithFallback: vi.fn(() => Promise.resolve([])),
}));

// Mock DefiLlama API
vi.mock('../defillama-api', () => ({
  getDefiLlamaPoolsWithFallback: vi.fn(() => Promise.resolve([])),
}));

// Mock data generation
vi.mock('../mock-data', () => ({
  generateMockPools: vi.fn(() => mockPools),
  generateMockPoolsWithVariation: vi.fn(() => mockPools),
  simulateNetworkDelay: vi.fn(() => Promise.resolve()),
}));

// Mock protocol metadata
vi.mock('@/contracts/addresses/stablecoin-protocols', () => ({
  BASE_CHAIN_ID: 8453,
  STABLECOIN_ADDRESSES: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  },
  PROTOCOL_METADATA: {
    aave: { displayName: 'Aave V3', color: '#B6509E' },
    morpho: { displayName: 'Morpho', color: '#2470FF' },
    moonwell: { displayName: 'Moonwell', color: '#9945FF' },
    compound: { displayName: 'Compound', color: '#00D395' },
    fluid: { displayName: 'Fluid', color: '#0066FF' },
  },
  getPoolAddress: vi.fn(),
  getReceiptTokenAddress: vi.fn(),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const mockPools = [
  {
    id: 'aave-usdc',
    protocol: 'aave',
    poolAddress: '0xPool1',
    asset: {
      symbol: 'USDC',
      address: '0xUSDC',
      decimals: 6,
      logoUri: '',
    },
    receiptToken: {
      symbol: 'aUSDC',
      address: '0xaUSDC',
      decimals: 6,
    },
    apy: {
      base: 3.5,
      rewards: 0,
      net: 3.5,
    },
    tvl: {
      native: BigInt(10000000000000),
      usd: 10000000,
    },
    risk: {
      score: 'A' as const,
      factors: [],
    },
    chainId: 8453,
    status: 'active' as const,
    lastUpdated: Date.now(),
  },
  {
    id: 'morpho-usdc',
    protocol: 'morpho',
    poolAddress: '0xPool2',
    asset: {
      symbol: 'USDC',
      address: '0xUSDC',
      decimals: 6,
      logoUri: '',
    },
    receiptToken: {
      symbol: 'mUSDC',
      address: '0xmUSDC',
      decimals: 6,
    },
    apy: {
      base: 5.2,
      rewards: 1.0,
      net: 6.2,
    },
    tvl: {
      native: BigInt(5000000000000),
      usd: 5000000,
    },
    risk: {
      score: 'B' as const,
      factors: [],
    },
    chainId: 8453,
    status: 'active' as const,
    lastUpdated: Date.now(),
  },
  {
    id: 'moonwell-dai',
    protocol: 'moonwell',
    poolAddress: '0xPool3',
    asset: {
      symbol: 'DAI',
      address: '0xDAI',
      decimals: 18,
      logoUri: '',
    },
    receiptToken: {
      symbol: 'mDAI',
      address: '0xmDAI',
      decimals: 8,
    },
    apy: {
      base: 4.0,
      rewards: 0.5,
      net: 4.5,
    },
    tvl: {
      native: BigInt(8000000000000000000000000n),
      usd: 8000000,
    },
    risk: {
      score: 'B' as const,
      factors: [],
    },
    chainId: 8453,
    status: 'active' as const,
    lastUpdated: Date.now(),
  },
];

// =============================================================================
// IMPORTS (after mocks)
// =============================================================================

let getAllPools: any;
let getPoolsByProtocol: any;
let getPoolsByAsset: any;
let getPoolById: any;
let getBestPoolForAsset: any;
let getPoolsSorted: any;
let filterPools: any;
let getPoolStatistics: any;
let refreshPoolData: any;
let getPoolDataCacheStatus: any;

beforeEach(async () => {
  vi.clearAllMocks();
  mockCache.clear();

  // Import functions
  const module = await import('../pool-data');
  getAllPools = module.getAllPools;
  getPoolsByProtocol = module.getPoolsByProtocol;
  getPoolsByAsset = module.getPoolsByAsset;
  getPoolById = module.getPoolById;
  getBestPoolForAsset = module.getBestPoolForAsset;
  getPoolsSorted = module.getPoolsSorted;
  filterPools = module.filterPools;
  getPoolStatistics = module.getPoolStatistics;
  refreshPoolData = module.refreshPoolData;
  getPoolDataCacheStatus = module.getPoolDataCacheStatus;
});

// =============================================================================
// TESTS
// =============================================================================

describe('getAllPools', () => {
  it('should return mock pools on testnet', async () => {
    const pools = await getAllPools();

    expect(pools).toHaveLength(3);
    // Pools are sorted by APY descending, so morpho (6.2%) comes first
    expect(pools[0].protocol).toBe('morpho');
  });

  it('should return pools sorted by APY (highest first)', async () => {
    const pools = await getAllPools();

    // Should be sorted by net APY descending
    expect(pools[0].apy.net).toBeGreaterThanOrEqual(pools[1].apy.net);
    expect(pools[1].apy.net).toBeGreaterThanOrEqual(pools[2].apy.net);
  });
});

describe('getPoolsByProtocol', () => {
  it('should filter pools by protocol', async () => {
    const aavePools = await getPoolsByProtocol('aave');

    expect(aavePools.every((p: any) => p.protocol === 'aave')).toBe(true);
    expect(aavePools).toHaveLength(1);
  });

  it('should return empty array for non-existent protocol', async () => {
    const pools = await getPoolsByProtocol('nonexistent');

    expect(pools).toHaveLength(0);
  });
});

describe('getPoolsByAsset', () => {
  it('should filter pools by asset', async () => {
    const usdcPools = await getPoolsByAsset('USDC');

    expect(usdcPools.every((p: any) => p.asset.symbol === 'USDC')).toBe(true);
    expect(usdcPools).toHaveLength(2); // aave and morpho both have USDC
  });

  it('should return empty array for non-existent asset', async () => {
    const pools = await getPoolsByAsset('NONEXISTENT');

    expect(pools).toHaveLength(0);
  });
});

describe('getPoolById', () => {
  it('should return pool by ID', async () => {
    const pool = await getPoolById('aave-usdc');

    expect(pool).not.toBeNull();
    expect(pool?.id).toBe('aave-usdc');
    expect(pool?.protocol).toBe('aave');
  });

  it('should return null for non-existent pool', async () => {
    const pool = await getPoolById('nonexistent-pool');

    expect(pool).toBeNull();
  });
});

describe('getBestPoolForAsset', () => {
  it('should return pool with highest APY for asset', async () => {
    const bestUsdcPool = await getBestPoolForAsset('USDC');

    expect(bestUsdcPool).not.toBeNull();
    // Morpho has higher APY (6.2%) than Aave (3.5%)
    expect(bestUsdcPool?.protocol).toBe('morpho');
    expect(bestUsdcPool?.apy.net).toBe(6.2);
  });

  it('should return null for non-existent asset', async () => {
    const pool = await getBestPoolForAsset('NONEXISTENT');

    expect(pool).toBeNull();
  });
});

describe('getPoolsSorted', () => {
  it('should sort by APY descending by default', async () => {
    const pools = await getPoolsSorted('apy', 'desc');

    expect(pools[0].apy.net).toBeGreaterThanOrEqual(pools[1].apy.net);
    expect(pools[1].apy.net).toBeGreaterThanOrEqual(pools[2].apy.net);
  });

  it('should sort by APY ascending', async () => {
    const pools = await getPoolsSorted('apy', 'asc');

    expect(pools[0].apy.net).toBeLessThanOrEqual(pools[1].apy.net);
    expect(pools[1].apy.net).toBeLessThanOrEqual(pools[2].apy.net);
  });

  it('should sort by TVL', async () => {
    const pools = await getPoolsSorted('tvl', 'desc');

    expect(pools[0].tvl.usd).toBeGreaterThanOrEqual(pools[1].tvl.usd);
  });

  it('should sort by risk score', async () => {
    const pools = await getPoolsSorted('risk', 'asc');

    // A = 1 (best), B = 2, etc.
    expect(pools[0].risk.score).toBe('A');
  });
});

describe('filterPools', () => {
  it('should filter by multiple protocols', async () => {
    const pools = await filterPools({
      protocols: ['aave', 'morpho'],
    });

    expect(pools).toHaveLength(2);
    expect(pools.every((p: any) => ['aave', 'morpho'].includes(p.protocol))).toBe(true);
  });

  it('should filter by multiple assets', async () => {
    const pools = await filterPools({
      assets: ['USDC', 'DAI'],
    });

    expect(pools).toHaveLength(3);
  });

  it('should filter by minimum APY', async () => {
    const pools = await filterPools({
      minApy: 5.0,
    });

    expect(pools.every((p: any) => p.apy.net >= 5.0)).toBe(true);
    expect(pools).toHaveLength(1); // Only morpho-usdc has 6.2%
  });

  it('should filter by maximum APY', async () => {
    const pools = await filterPools({
      maxApy: 4.0,
    });

    expect(pools.every((p: any) => p.apy.net <= 4.0)).toBe(true);
    expect(pools).toHaveLength(1); // Only aave-usdc has 3.5%
  });

  it('should filter by minimum TVL', async () => {
    const pools = await filterPools({
      minTvl: 6000000,
    });

    expect(pools.every((p: any) => p.tvl.usd >= 6000000)).toBe(true);
    expect(pools).toHaveLength(2); // aave (10M) and moonwell (8M)
  });

  it('should filter by risk scores', async () => {
    const pools = await filterPools({
      riskScores: ['A'],
    });

    expect(pools.every((p: any) => p.risk.score === 'A')).toBe(true);
    expect(pools).toHaveLength(1);
  });

  it('should combine multiple filters', async () => {
    const pools = await filterPools({
      assets: ['USDC'],
      minApy: 3.0,
      minTvl: 1000000,
    });

    expect(pools).toHaveLength(2); // Both USDC pools meet criteria
  });

  it('should return all pools with empty filters', async () => {
    const pools = await filterPools({});

    expect(pools).toHaveLength(3);
  });
});

describe('getPoolStatistics', () => {
  it('should calculate total TVL correctly', async () => {
    const stats = await getPoolStatistics();

    // 10M + 5M + 8M = 23M
    expect(stats.totalTvl).toBe(23000000);
  });

  it('should calculate weighted average APY', async () => {
    const stats = await getPoolStatistics();

    // Weighted avg: (10M*3.5 + 5M*6.2 + 8M*4.5) / 23M
    const expectedAvg = (10000000 * 3.5 + 5000000 * 6.2 + 8000000 * 4.5) / 23000000;
    expect(stats.avgApy).toBeCloseTo(expectedAvg, 2);
  });

  it('should count pools correctly', async () => {
    const stats = await getPoolStatistics();

    expect(stats.poolCount).toBe(3);
  });

  it('should aggregate by protocol', async () => {
    const stats = await getPoolStatistics();

    expect(stats.byProtocol.aave.poolCount).toBe(1);
    expect(stats.byProtocol.morpho.poolCount).toBe(1);
    expect(stats.byProtocol.moonwell.poolCount).toBe(1);
    expect(stats.byProtocol.compound.poolCount).toBe(0);
  });

  it('should aggregate by asset', async () => {
    const stats = await getPoolStatistics();

    expect(stats.byAsset.USDC.poolCount).toBe(2);
    expect(stats.byAsset.DAI.poolCount).toBe(1);
  });
});

describe('caching', () => {
  it('should report cache status correctly when not cached', async () => {
    const status = getPoolDataCacheStatus();

    expect(status.isCached).toBe(false);
    expect(status.timestamp).toBeNull();
  });
});

describe('refreshPoolData', () => {
  it('should invalidate cache and fetch fresh data', async () => {
    const { invalidateCache } = await import('../cache');

    await refreshPoolData();

    expect(invalidateCache).toHaveBeenCalled();
  });

  it('should return fresh pool data', async () => {
    const pools = await refreshPoolData();

    expect(pools).toHaveLength(3);
  });
});
