/**
 * Mock Data Service for Testnet
 *
 * Provides realistic mock data for stablecoin pools when:
 * 1. Running on testnet (Base Sepolia)
 * 2. APIs are unavailable
 * 3. Development/testing scenarios
 *
 * This ensures the UI can be fully tested without live API dependencies.
 */

import { StablecoinPool, UserStablecoinPosition, ProtocolName, RiskScore } from '@/types/stablecoin';
import {
  BASE_CHAIN_ID,
  STABLECOIN_ADDRESSES,
  AAVE_V3_ADDRESSES,
  MORPHO_ADDRESSES,
  MOONWELL_ADDRESSES,
  COMPOUND_V3_ADDRESSES,
  FLUID_ADDRESSES,
} from '@/contracts/addresses/stablecoin-protocols';

// =============================================================================
// MOCK POOL DATA
// =============================================================================

/**
 * Generate realistic mock pools for all protocols
 * APYs are based on typical historical ranges
 */
export function generateMockPools(): StablecoinPool[] {
  return [
    // ==========================================================================
    // AAVE V3 POOLS
    // ==========================================================================
    createMockPool({
      protocol: 'aave',
      asset: 'USDC',
      assetAddress: STABLECOIN_ADDRESSES.USDC,
      poolAddress: AAVE_V3_ADDRESSES.Pool,
      receiptToken: {
        address: AAVE_V3_ADDRESSES.aUSDC,
        symbol: 'aUSDC',
      },
      apy: { base: 4.5, reward: 0.8, net: 5.3 },
      tvl: 52_000_000,
      utilization: 78,
      risk: 'A',
    }),
    createMockPool({
      protocol: 'aave',
      asset: 'USDbC',
      assetAddress: STABLECOIN_ADDRESSES.USDbC,
      poolAddress: AAVE_V3_ADDRESSES.Pool,
      receiptToken: {
        address: AAVE_V3_ADDRESSES.aUSDbC,
        symbol: 'aUSDbC',
      },
      apy: { base: 3.8, reward: 0.5, net: 4.3 },
      tvl: 18_000_000,
      utilization: 65,
      risk: 'A',
    }),
    createMockPool({
      protocol: 'aave',
      asset: 'DAI',
      assetAddress: STABLECOIN_ADDRESSES.DAI,
      poolAddress: AAVE_V3_ADDRESSES.Pool,
      receiptToken: {
        address: AAVE_V3_ADDRESSES.aDAI,
        symbol: 'aDAI',
      },
      apy: { base: 4.2, reward: 0.6, net: 4.8 },
      tvl: 8_500_000,
      utilization: 72,
      risk: 'A',
    }),

    // ==========================================================================
    // MORPHO BLUE POOLS
    // ==========================================================================
    createMockPool({
      protocol: 'morpho',
      asset: 'USDC',
      assetAddress: STABLECOIN_ADDRESSES.USDC,
      poolAddress: MORPHO_ADDRESSES.vaults.gauntlet.USDCPrime,
      receiptToken: {
        address: MORPHO_ADDRESSES.vaults.gauntlet.USDCPrime,
        symbol: 'gtUSDC',
      },
      apy: { base: 8.5, reward: 1.2, net: 9.7 },
      tvl: 15_000_000,
      utilization: 85,
      risk: 'A',
      riskFactors: [
        'Curated by Gauntlet',
        '10% performance fee',
        'High liquidity',
      ],
    }),

    // ==========================================================================
    // MOONWELL POOLS
    // ==========================================================================
    createMockPool({
      protocol: 'moonwell',
      asset: 'USDC',
      assetAddress: STABLECOIN_ADDRESSES.USDC,
      poolAddress: MOONWELL_ADDRESSES.mUSDC,
      receiptToken: {
        address: MOONWELL_ADDRESSES.mUSDC,
        symbol: 'mUSDC',
      },
      apy: { base: 6.2, reward: 2.1, net: 8.3 },
      tvl: 25_000_000,
      utilization: 75,
      risk: 'B',
      riskFactors: [
        'WELL token rewards',
        'Audited by multiple firms',
        'Compound V2 fork',
      ],
    }),
    createMockPool({
      protocol: 'moonwell',
      asset: 'USDbC',
      assetAddress: STABLECOIN_ADDRESSES.USDbC,
      poolAddress: MOONWELL_ADDRESSES.mUSDbC,
      receiptToken: {
        address: MOONWELL_ADDRESSES.mUSDbC,
        symbol: 'mUSDbC',
      },
      apy: { base: 5.8, reward: 1.8, net: 7.6 },
      tvl: 12_000_000,
      utilization: 68,
      risk: 'B',
    }),
    createMockPool({
      protocol: 'moonwell',
      asset: 'DAI',
      assetAddress: STABLECOIN_ADDRESSES.DAI,
      poolAddress: MOONWELL_ADDRESSES.mDAI,
      receiptToken: {
        address: MOONWELL_ADDRESSES.mDAI,
        symbol: 'mDAI',
      },
      apy: { base: 5.5, reward: 1.5, net: 7.0 },
      tvl: 6_000_000,
      utilization: 62,
      risk: 'B',
    }),

    // ==========================================================================
    // COMPOUND V3 POOLS
    // ==========================================================================
    createMockPool({
      protocol: 'compound',
      asset: 'USDC',
      assetAddress: STABLECOIN_ADDRESSES.USDC,
      poolAddress: COMPOUND_V3_ADDRESSES.cUSDCv3,
      receiptToken: {
        address: COMPOUND_V3_ADDRESSES.cUSDCv3,
        symbol: 'cUSDCv3',
      },
      apy: { base: 4.8, reward: 0.4, net: 5.2 },
      tvl: 35_000_000,
      utilization: 70,
      risk: 'A',
      riskFactors: [
        'Battle-tested protocol',
        'COMP token rewards',
        'Tier 1 security',
      ],
    }),

    // ==========================================================================
    // FLUID POOLS
    // ==========================================================================
    createMockPool({
      protocol: 'fluid',
      asset: 'USDC',
      assetAddress: STABLECOIN_ADDRESSES.USDC,
      poolAddress: FLUID_ADDRESSES.fUSDC,
      receiptToken: {
        address: FLUID_ADDRESSES.fUSDC,
        symbol: 'fUSDC',
      },
      apy: { base: 7.5, reward: 1.8, net: 9.3 },
      tvl: 8_000_000,
      utilization: 82,
      risk: 'B',
      riskFactors: [
        'ERC-4626 vault',
        'Instadapp backing',
        'Growing TVL',
      ],
    }),
  ];
}

// =============================================================================
// MOCK USER POSITIONS
// =============================================================================

/**
 * Generate mock user positions for testing
 */
export function generateMockPositions(userAddress: string): any[] {
  // Only generate if we have a user address
  if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
    return [];
  }

  // Create some realistic positions
  return [
    {
      poolId: `aave-${BASE_CHAIN_ID}-usdc`,
      protocol: 'aave',
      chainId: BASE_CHAIN_ID,
      userAddress: userAddress as `0x${string}`,
      asset: {
        address: STABLECOIN_ADDRESSES.USDC,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        logoUrl: '/tokens/usdc.svg',
        priceUsd: 1,
      },
      supplied: {
        amount: BigInt(5000_000000), // 5,000 USDC
        usdValue: 5000,
        receiptTokenAmount: BigInt(4950_000000), // Slight exchange rate difference
      },
      earned: {
        total: BigInt(125_000000), // $125 earned
        usdValue: 125,
        breakdown: [
          { source: 'interest', amount: BigInt(100_000000), usdValue: 100, tokenSymbol: 'USDC' },
          { source: 'rewards', amount: BigInt(25_000000), usdValue: 25, tokenSymbol: 'USDC' },
        ],
      },
      apy: {
        current: 5.3,
        projected7d: 5.1,
        projected30d: 5.0,
      },
      lastUpdated: Date.now(),
      status: 'active',
    },
    {
      poolId: `morpho-${BASE_CHAIN_ID}-usdc`,
      protocol: 'morpho',
      chainId: BASE_CHAIN_ID,
      userAddress: userAddress as `0x${string}`,
      asset: {
        address: STABLECOIN_ADDRESSES.USDC,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        logoUrl: '/tokens/usdc.svg',
        priceUsd: 1,
      },
      supplied: {
        amount: BigInt(10000_000000), // 10,000 USDC
        usdValue: 10000,
        receiptTokenAmount: BigInt(9800_000000),
      },
      earned: {
        total: BigInt(485_000000), // $485 earned
        usdValue: 485,
        breakdown: [
          { source: 'interest', amount: BigInt(425_000000), usdValue: 425, tokenSymbol: 'USDC' },
          { source: 'rewards', amount: BigInt(60_000000), usdValue: 60, tokenSymbol: 'MORPHO' },
        ],
      },
      apy: {
        current: 9.7,
        projected7d: 9.5,
        projected30d: 9.2,
      },
      lastUpdated: Date.now(),
      status: 'active',
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface CreateMockPoolParams {
  protocol: ProtocolName;
  asset: 'USDC' | 'USDbC' | 'DAI';
  assetAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  receiptToken: {
    address: `0x${string}`;
    symbol: string;
  };
  apy: { base: number; reward: number; net: number };
  tvl: number;
  utilization: number;
  risk: RiskScore;
  riskFactors?: string[];
}

function createMockPool(params: CreateMockPoolParams): StablecoinPool {
  const decimals = params.asset === 'DAI' ? 18 : 6;
  const tvlNative = BigInt(Math.floor(params.tvl * 10 ** decimals));

  return {
    id: `${params.protocol}-${BASE_CHAIN_ID}-${params.asset.toLowerCase()}`,
    protocol: params.protocol,
    chainId: BASE_CHAIN_ID,

    asset: {
      address: params.assetAddress,
      symbol: params.asset,
      decimals,
      name: getAssetName(params.asset),
      logoUrl: `/tokens/${params.asset.toLowerCase()}.svg`,
      priceUsd: 1,
    },

    receiptToken: {
      address: params.receiptToken.address,
      symbol: params.receiptToken.symbol,
      decimals,
      underlyingToken: params.assetAddress,
      exchangeRate: BigInt(1e18), // 1:1 for simplicity
      exchangeRateDecimals: 18,
    },

    poolAddress: params.poolAddress,

    apy: params.apy,

    apyHistory: {
      avg7d: params.apy.net * 0.98,
      avg30d: params.apy.net * 0.95,
      min30d: params.apy.net * 0.8,
      max30d: params.apy.net * 1.15,
    },

    tvl: {
      native: tvlNative,
      usd: params.tvl,
    },

    utilization: params.utilization,

    supplyCap: null,
    availableLiquidity: BigInt(Math.floor(params.tvl * (1 - params.utilization / 100) * 10 ** decimals)),
    minDeposit: BigInt(0),
    maxDeposit: null,

    risk: {
      score: params.risk,
      factors: params.riskFactors || getDefaultRiskFactors(params.protocol, params.tvl),
    },

    status: 'active',
    lastUpdated: Date.now(),
    dataSource: 'cached',
  };
}

function getAssetName(symbol: 'USDC' | 'USDbC' | 'DAI'): string {
  switch (symbol) {
    case 'USDC':
      return 'USD Coin';
    case 'USDbC':
      return 'Bridged USD Coin';
    case 'DAI':
      return 'Dai Stablecoin';
  }
}

function getDefaultRiskFactors(protocol: ProtocolName, tvl: number): string[] {
  const factors: string[] = [];

  // TVL factor
  if (tvl > 50_000_000) {
    factors.push('Very high TVL (>$50M)');
  } else if (tvl > 10_000_000) {
    factors.push('High TVL (>$10M)');
  } else if (tvl > 1_000_000) {
    factors.push('Moderate TVL (>$1M)');
  } else {
    factors.push('Lower TVL');
  }

  // Protocol-specific factors
  switch (protocol) {
    case 'aave':
      factors.push('Tier 1 protocol', 'Battle-tested security');
      break;
    case 'compound':
      factors.push('Tier 1 protocol', 'Pioneer in DeFi lending');
      break;
    case 'morpho':
      factors.push('Curated vault strategy', 'ERC-4626 compliant');
      break;
    case 'moonwell':
      factors.push('Base-native protocol', 'Multiple audits');
      break;
    case 'fluid':
      factors.push('ERC-4626 vault', 'Growing ecosystem');
      break;
  }

  return factors;
}

// =============================================================================
// MOCK APY VARIATIONS
// =============================================================================

/**
 * Add realistic variation to APYs for more realistic testing
 * Call this to get pools with slightly different APYs each time
 */
export function generateMockPoolsWithVariation(): StablecoinPool[] {
  const basePools = generateMockPools();

  return basePools.map((pool) => {
    // Add ±10% variation to APYs
    const variation = 0.9 + Math.random() * 0.2;

    return {
      ...pool,
      apy: {
        base: pool.apy.base * variation,
        reward: pool.apy.reward * variation,
        net: pool.apy.net * variation,
      },
      apyHistory: {
        avg7d: pool.apyHistory.avg7d * variation,
        avg30d: pool.apyHistory.avg30d * variation,
        min30d: pool.apyHistory.min30d * variation,
        max30d: pool.apyHistory.max30d * variation,
      },
      lastUpdated: Date.now(),
    };
  });
}

// =============================================================================
// MOCK STATISTICS
// =============================================================================

/**
 * Generate aggregate statistics from mock data
 */
export function generateMockStatistics() {
  const pools = generateMockPools();

  let totalTvl = 0;
  let totalWeightedApy = 0;

  for (const pool of pools) {
    totalTvl += pool.tvl.usd;
    totalWeightedApy += pool.apy.net * pool.tvl.usd;
  }

  return {
    totalTvl,
    avgApy: totalTvl > 0 ? totalWeightedApy / totalTvl : 0,
    poolCount: pools.length,
    lastUpdated: Date.now(),
  };
}

// =============================================================================
// TESTNET SIMULATION HELPERS
// =============================================================================

/**
 * Simulate a delay (for testing loading states)
 */
export async function simulateNetworkDelay(minMs = 200, maxMs = 800): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Simulate occasional errors (for testing error states)
 */
export function shouldSimulateError(errorRate = 0.1): boolean {
  return Math.random() < errorRate;
}
