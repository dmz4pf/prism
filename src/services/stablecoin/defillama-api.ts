/**
 * DefiLlama Yields API Service
 *
 * Fetches yield data from DefiLlama as a fallback/verification source.
 * API Endpoint: https://yields.llama.fi/pools
 * Rate Limit: None (public API)
 * Update Frequency: Hourly
 */

import { DefiLlamaPoolResponse, StablecoinPool, ProtocolName, RiskScore } from '@/types/stablecoin';
import { BASE_CHAIN_ID, STABLECOIN_ADDRESSES } from '@/contracts/addresses/stablecoin-protocols';
import { getCached, setCached } from './cache';

// =============================================================================
// API CONFIGURATION
// =============================================================================

const DEFILLAMA_YIELDS_ENDPOINT = 'https://yields.llama.fi/pools';

// Protocol name mapping (DefiLlama project names → our protocol names)
const PROTOCOL_MAPPING: Record<string, ProtocolName> = {
  'aave-v3': 'aave',
  'compound-v3': 'compound',
  'morpho-blue': 'morpho',
  'moonwell': 'moonwell',
  'fluid': 'fluid',
};

// Stablecoin symbols we care about
const STABLECOIN_SYMBOLS = ['USDC', 'USDT', 'DAI', 'USDbC'];

// =============================================================================
// DATA FETCHING
// =============================================================================

interface DefiLlamaResponse {
  status: string;
  data: DefiLlamaPoolResponse[];
}

/**
 * Fetch all yield pools from DefiLlama
 */
async function fetchAllPools(): Promise<DefiLlamaPoolResponse[]> {
  const response = await fetch(DEFILLAMA_YIELDS_ENDPOINT);

  if (!response.ok) {
    throw new Error(`DefiLlama API error: ${response.status} ${response.statusText}`);
  }

  const result: DefiLlamaResponse = await response.json();

  if (result.status !== 'success') {
    throw new Error('DefiLlama API returned non-success status');
  }

  return result.data;
}

/**
 * Fetch Base stablecoin pools from DefiLlama
 */
export async function fetchDefiLlamaPools(): Promise<DefiLlamaPoolResponse[]> {
  const cacheKey = 'defillama_base_stablecoins';

  // Check cache first (3 days)
  const cached = getCached<DefiLlamaPoolResponse[]>(cacheKey);
  if (cached) {
    return cached.data;
  }

  // Fetch all pools
  const allPools = await fetchAllPools();

  // Filter to Base chain, stablecoins, and our supported protocols
  const filteredPools = allPools.filter((pool) => {
    // Must be on Base
    if (pool.chain?.toLowerCase() !== 'base') return false;

    // Must be a stablecoin (check symbol)
    const hasStablecoin = STABLECOIN_SYMBOLS.some(
      (symbol) => pool.symbol?.toUpperCase().includes(symbol)
    );
    if (!hasStablecoin) return false;

    // Must be a supported protocol
    const protocol = PROTOCOL_MAPPING[pool.project?.toLowerCase() || ''];
    if (!protocol) return false;

    // Must have meaningful TVL (>$10k)
    if ((pool.tvlUsd || 0) < 10000) return false;

    return true;
  });

  // Cache for 3 days
  setCached(cacheKey, filteredPools, 'POOL_DATA', 'api');

  return filteredPools;
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Map DefiLlama project name to our protocol name
 */
function mapProtocolName(project: string): ProtocolName | null {
  return PROTOCOL_MAPPING[project.toLowerCase()] || null;
}

/**
 * Extract stablecoin symbol from pool symbol
 */
function extractStablecoinSymbol(poolSymbol: string): 'USDC' | 'USDT' | 'DAI' | 'USDbC' | null {
  const upperSymbol = poolSymbol.toUpperCase();

  if (upperSymbol.includes('USDC')) return 'USDC';
  if (upperSymbol.includes('USDT')) return 'USDT';
  if (upperSymbol.includes('DAI')) return 'DAI';
  if (upperSymbol.includes('USDBC')) return 'USDbC';

  return null;
}

/**
 * Get stablecoin address from symbol
 */
function getStablecoinAddress(symbol: 'USDC' | 'USDT' | 'DAI' | 'USDbC'): `0x${string}` {
  switch (symbol) {
    case 'USDC':
      return STABLECOIN_ADDRESSES.USDC;
    case 'USDbC':
      return STABLECOIN_ADDRESSES.USDbC;
    case 'DAI':
      return STABLECOIN_ADDRESSES.DAI;
    default:
      return STABLECOIN_ADDRESSES.USDC; // Fallback
  }
}

/**
 * Calculate risk score based on TVL and protocol
 */
function calculateRiskScore(pool: DefiLlamaPoolResponse, protocol: ProtocolName): RiskScore {
  // Tier 1 protocols get better scores
  if (protocol === 'aave' || protocol === 'compound') {
    if (pool.tvlUsd > 10_000_000) return 'A';
    if (pool.tvlUsd > 1_000_000) return 'A';
    return 'B';
  }

  // Tier 2 protocols
  if (pool.tvlUsd > 10_000_000) return 'A';
  if (pool.tvlUsd > 1_000_000) return 'B';
  if (pool.tvlUsd > 100_000) return 'B';
  return 'C';
}

/**
 * Convert DefiLlama pool to normalized StablecoinPool format
 */
export function defiLlamaPoolToStablecoinPool(pool: DefiLlamaPoolResponse): StablecoinPool | null {
  const protocol = mapProtocolName(pool.project);
  if (!protocol) return null;

  const stablecoinSymbol = extractStablecoinSymbol(pool.symbol);
  if (!stablecoinSymbol) return null;

  const stablecoinAddress = getStablecoinAddress(stablecoinSymbol);
  const riskScore = calculateRiskScore(pool, protocol);

  return {
    id: `${protocol}-${BASE_CHAIN_ID}-${stablecoinSymbol.toLowerCase()}`,
    protocol,
    chainId: BASE_CHAIN_ID,

    asset: {
      address: stablecoinAddress,
      symbol: stablecoinSymbol,
      decimals: stablecoinSymbol === 'DAI' ? 18 : 6,
      name: stablecoinSymbol,
      logoUrl: `/tokens/${stablecoinSymbol.toLowerCase()}.svg`,
      priceUsd: 1,
    },

    receiptToken: {
      address: stablecoinAddress, // Placeholder - actual receipt token varies
      symbol: `${protocol.charAt(0)}${stablecoinSymbol}`,
      decimals: stablecoinSymbol === 'DAI' ? 18 : 6,
      underlyingToken: stablecoinAddress,
      exchangeRate: BigInt(1e18),
      exchangeRateDecimals: 18,
    },

    poolAddress: stablecoinAddress as `0x${string}`, // Needs actual pool address

    apy: {
      base: pool.apyBase || 0,
      reward: pool.apyReward || 0,
      net: pool.apy || 0,
    },

    apyHistory: {
      avg7d: pool.apy || 0,
      avg30d: pool.apy || 0,
      min30d: (pool.apy || 0) * 0.8,
      max30d: (pool.apy || 0) * 1.2,
    },

    tvl: {
      native: BigInt(Math.floor(pool.tvlUsd * (stablecoinSymbol === 'DAI' ? 1e18 : 1e6))),
      usd: pool.tvlUsd,
    },

    utilization: 70, // DefiLlama doesn't provide utilization

    supplyCap: null,
    availableLiquidity: BigInt(Math.floor(pool.tvlUsd * 0.3 * (stablecoinSymbol === 'DAI' ? 1e18 : 1e6))),
    minDeposit: BigInt(0),
    maxDeposit: null,

    risk: {
      score: riskScore,
      factors: [
        `TVL: $${(pool.tvlUsd / 1_000_000).toFixed(2)}M`,
        `Base APY: ${pool.apyBase?.toFixed(2) || 0}%`,
        pool.apyReward ? `Rewards: ${pool.apyReward.toFixed(2)}%` : 'No rewards',
      ],
    },

    status: 'active',
    lastUpdated: Date.now(),
    dataSource: 'api',
  };
}

/**
 * Get all pools from DefiLlama as normalized StablecoinPool format
 */
export async function getDefiLlamaPools(): Promise<StablecoinPool[]> {
  const pools = await fetchDefiLlamaPools();

  return pools
    .map(defiLlamaPoolToStablecoinPool)
    .filter((pool): pool is StablecoinPool => pool !== null);
}

// =============================================================================
// FALLBACK DATA
// =============================================================================

/**
 * Fallback pool data in case DefiLlama API is unavailable
 * These are conservative estimates based on typical rates
 */
export const DEFILLAMA_FALLBACK_POOLS: DefiLlamaPoolResponse[] = [
  {
    pool: 'aave-v3-base-usdc',
    chain: 'Base',
    project: 'aave-v3',
    symbol: 'USDC',
    tvlUsd: 50_000_000,
    apy: 5.5,
    apyBase: 5.0,
    apyReward: 0.5,
    rewardTokens: [],
    underlyingTokens: [STABLECOIN_ADDRESSES.USDC],
  },
  {
    pool: 'compound-v3-base-usdc',
    chain: 'Base',
    project: 'compound-v3',
    symbol: 'USDC',
    tvlUsd: 30_000_000,
    apy: 4.8,
    apyBase: 4.5,
    apyReward: 0.3,
    rewardTokens: [],
    underlyingTokens: [STABLECOIN_ADDRESSES.USDC],
  },
  {
    pool: 'moonwell-base-usdc',
    chain: 'Base',
    project: 'moonwell',
    symbol: 'USDC',
    tvlUsd: 20_000_000,
    apy: 8.0,
    apyBase: 6.5,
    apyReward: 1.5,
    rewardTokens: [],
    underlyingTokens: [STABLECOIN_ADDRESSES.USDC],
  },
  {
    pool: 'morpho-blue-base-usdc',
    chain: 'Base',
    project: 'morpho-blue',
    symbol: 'USDC',
    tvlUsd: 15_000_000,
    apy: 10.0,
    apyBase: 9.0,
    apyReward: 1.0,
    rewardTokens: [],
    underlyingTokens: [STABLECOIN_ADDRESSES.USDC],
  },
];

/**
 * Get DefiLlama pools with fallback
 */
export async function getDefiLlamaPoolsWithFallback(): Promise<StablecoinPool[]> {
  try {
    return await getDefiLlamaPools();
  } catch (error) {
    console.error('Failed to fetch DefiLlama pools, using fallback:', error);
    return DEFILLAMA_FALLBACK_POOLS
      .map(defiLlamaPoolToStablecoinPool)
      .filter((pool): pool is StablecoinPool => pool !== null);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get APY for a specific pool from DefiLlama (for verification)
 */
export async function getPoolApy(
  protocol: ProtocolName,
  asset: string
): Promise<{ apy: number; apyBase: number; apyReward: number } | null> {
  const pools = await fetchDefiLlamaPools();

  const pool = pools.find(
    (p) =>
      PROTOCOL_MAPPING[p.project?.toLowerCase() || ''] === protocol &&
      p.symbol?.toUpperCase().includes(asset.toUpperCase())
  );

  if (!pool) return null;

  return {
    apy: pool.apy || 0,
    apyBase: pool.apyBase || 0,
    apyReward: pool.apyReward || 0,
  };
}
