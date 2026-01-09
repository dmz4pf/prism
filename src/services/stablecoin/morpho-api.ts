/**
 * Morpho GraphQL API Service
 *
 * Fetches vault data from Morpho's GraphQL API.
 * API Endpoint: https://api.morpho.org/graphql
 * Rate Limit: 5,000 requests / 5 minutes
 */

import { MorphoVaultResponse, StablecoinPool, RiskScore } from '@/types/stablecoin';
import { MORPHO_ADDRESSES, BASE_CHAIN_ID, STABLECOIN_ADDRESSES } from '@/contracts/addresses/stablecoin-protocols';
import { getCached, setCached, CACHE_DURATIONS } from './cache';

// =============================================================================
// API CONFIGURATION
// =============================================================================

const MORPHO_API_ENDPOINT = 'https://api.morpho.org/graphql';

// Stablecoin symbols we care about
const STABLECOIN_SYMBOLS = ['USDC', 'USDT', 'DAI', 'USDbC'];

// =============================================================================
// GRAPHQL QUERIES
// =============================================================================

const VAULTS_QUERY = `
  query GetBaseVaults($chainId: Int!, $symbols: [String!]) {
    vaultV2s(
      first: 100
      where: {
        chainId_in: [$chainId]
        asset: { symbol_in: $symbols }
        whitelisted: true
      }
      orderBy: TotalAssetsUsd
      orderDirection: Desc
    ) {
      items {
        address
        name
        symbol
        whitelisted
        asset {
          address
          symbol
          decimals
        }
        chain {
          id
          network
        }
        totalAssets
        totalAssetsUsd
        totalSupply
        liquidityUsd
        idleAssetsUsd
        avgApy
        avgNetApy
        performanceFee
        managementFee
        curator {
          name
        }
        rewards {
          asset {
            address
            symbol
          }
          supplyApr
        }
      }
    }
  }
`;

const VAULT_BY_ADDRESS_QUERY = `
  query GetVaultByAddress($address: String!, $chainId: Int!) {
    vaultV2ByAddress(address: $address, chainId: $chainId) {
      address
      name
      symbol
      asset {
        address
        symbol
        decimals
      }
      totalAssets
      totalAssetsUsd
      totalSupply
      liquidity
      liquidityUsd
      idleAssetsUsd
      avgApy
      avgNetApy
      performanceFee
      curator {
        name
      }
    }
  }
`;

const USER_POSITIONS_QUERY = `
  query GetUserPositions($userAddress: String!, $chainId: Int!) {
    userByAddress(address: $userAddress, chainId: $chainId) {
      address
      vaultPositions {
        vault {
          address
          name
          symbol
          asset {
            address
            symbol
            decimals
          }
          avgNetApy
        }
        assets
        assetsUsd
        shares
      }
    }
  }
`;

// =============================================================================
// API CLIENT
// =============================================================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Execute a GraphQL query against Morpho API
 */
async function executeQuery<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(MORPHO_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Morpho API error: ${response.status} ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(`Morpho GraphQL error: ${result.errors[0].message}`);
  }

  if (!result.data) {
    throw new Error('Morpho API returned no data');
  }

  return result.data;
}

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

interface VaultsResponse {
  vaultV2s: {
    items: MorphoVaultResponse[];
  };
}

/**
 * Fetch all stablecoin vaults on Base
 */
export async function fetchMorphoVaults(): Promise<MorphoVaultResponse[]> {
  const cacheKey = 'morpho_vaults_base';

  // Check cache first
  const cached = getCached<MorphoVaultResponse[]>(cacheKey);
  if (cached) {
    return cached.data;
  }

  // Fetch from API
  const data = await executeQuery<VaultsResponse>(VAULTS_QUERY, {
    chainId: BASE_CHAIN_ID,
    symbols: STABLECOIN_SYMBOLS,
  });

  const vaults = data.vaultV2s.items;

  // Cache for 3 days
  setCached(cacheKey, vaults, 'POOL_DATA', 'api');

  return vaults;
}

interface VaultByAddressResponse {
  vaultV2ByAddress: MorphoVaultResponse;
}

/**
 * Fetch a specific vault by address
 */
export async function fetchMorphoVaultByAddress(
  address: string
): Promise<MorphoVaultResponse | null> {
  const cacheKey = `morpho_vault_${address.toLowerCase()}`;

  // Check cache first
  const cached = getCached<MorphoVaultResponse>(cacheKey);
  if (cached) {
    return cached.data;
  }

  try {
    const data = await executeQuery<VaultByAddressResponse>(VAULT_BY_ADDRESS_QUERY, {
      address: address.toLowerCase(),
      chainId: BASE_CHAIN_ID,
    });

    const vault = data.vaultV2ByAddress;

    // Cache for 3 days
    setCached(cacheKey, vault, 'POOL_DATA', 'api');

    return vault;
  } catch (error) {
    console.error(`Failed to fetch Morpho vault ${address}:`, error);
    return null;
  }
}

interface UserPositionsResponse {
  userByAddress: {
    address: string;
    vaultPositions: Array<{
      vault: {
        address: string;
        name: string;
        symbol: string;
        asset: {
          address: string;
          symbol: string;
          decimals: number;
        };
        avgNetApy: number;
      };
      assets: string;
      assetsUsd: number;
      shares: string;
    }>;
  } | null;
}

/**
 * Fetch user's positions in Morpho vaults
 */
export async function fetchMorphoUserPositions(
  userAddress: string
): Promise<UserPositionsResponse['userByAddress']> {
  const cacheKey = `morpho_positions_${userAddress.toLowerCase()}`;

  // Check cache first (shorter duration for positions)
  const cached = getCached<UserPositionsResponse['userByAddress']>(cacheKey);
  if (cached) {
    return cached.data;
  }

  try {
    const data = await executeQuery<UserPositionsResponse>(USER_POSITIONS_QUERY, {
      userAddress: userAddress.toLowerCase(),
      chainId: BASE_CHAIN_ID,
    });

    const positions = data.userByAddress;

    // Cache for 5 minutes (positions change with user actions)
    setCached(cacheKey, positions, 'POSITION_DATA', 'api');

    return positions;
  } catch (error) {
    console.error(`Failed to fetch Morpho positions for ${userAddress}:`, error);
    return null;
  }
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Convert Morpho vault response to normalized StablecoinPool format
 */
export function morphoVaultToPool(vault: MorphoVaultResponse): StablecoinPool {
  // Determine risk score based on curator and TVL
  let riskScore: RiskScore = 'B';
  if (vault.curator?.name?.toLowerCase().includes('gauntlet')) {
    riskScore = 'A'; // Gauntlet vaults are highest quality
  } else if (vault.totalAssetsUsd > 10_000_000) {
    riskScore = 'B'; // High TVL
  } else if (vault.totalAssetsUsd > 1_000_000) {
    riskScore = 'B';
  } else {
    riskScore = 'C'; // Lower TVL
  }

  // Calculate reward APY from rewards array
  const rewardApy = vault.rewards?.reduce((sum, r) => sum + (r.supplyApr || 0), 0) || 0;

  return {
    id: `morpho-${BASE_CHAIN_ID}-${vault.asset.symbol.toLowerCase()}`,
    protocol: 'morpho',
    chainId: BASE_CHAIN_ID,

    asset: {
      address: vault.asset.address as `0x${string}`,
      symbol: vault.asset.symbol as 'USDC' | 'USDT' | 'DAI' | 'USDbC',
      decimals: vault.asset.decimals,
      name: vault.asset.symbol,
      logoUrl: `/tokens/${vault.asset.symbol.toLowerCase()}.svg`,
      priceUsd: 1, // Stablecoins
    },

    receiptToken: {
      address: vault.address as `0x${string}`,
      symbol: vault.symbol,
      decimals: vault.asset.decimals,
      underlyingToken: vault.asset.address as `0x${string}`,
      exchangeRate: BigInt(Math.floor((Number(vault.totalAssets) / Number(vault.totalSupply || 1)) * 1e18)),
      exchangeRateDecimals: 18,
    },

    poolAddress: vault.address as `0x${string}`,

    apy: {
      base: vault.avgApy * 100, // Convert to percentage
      reward: rewardApy * 100,
      net: vault.avgNetApy * 100,
    },

    apyHistory: {
      avg7d: vault.avgNetApy * 100,
      avg30d: vault.avgNetApy * 100, // API doesn't provide historical, use current
      min30d: vault.avgNetApy * 100 * 0.8,
      max30d: vault.avgNetApy * 100 * 1.2,
    },

    tvl: {
      native: BigInt(vault.totalAssets || '0'),
      usd: vault.totalAssetsUsd,
    },

    utilization: (vault.liquidityUsd ?? 0) > 0
      ? ((vault.totalAssetsUsd - (vault.liquidityUsd ?? 0)) / vault.totalAssetsUsd) * 100
      : 0,

    supplyCap: null, // Morpho vaults typically don't have caps
    availableLiquidity: BigInt(Math.floor((vault.liquidityUsd || 0) * 10 ** vault.asset.decimals)),
    minDeposit: BigInt(0),
    maxDeposit: null,

    risk: {
      score: riskScore,
      factors: [
        vault.curator?.name ? `Curated by ${vault.curator.name}` : 'Community vault',
        vault.performanceFee ? `${vault.performanceFee * 100}% performance fee` : 'No performance fee',
        vault.totalAssetsUsd > 1_000_000 ? 'High liquidity' : 'Lower liquidity',
      ],
    },

    status: 'active',
    lastUpdated: Date.now(),
    dataSource: 'api',
  };
}

/**
 * Get all Morpho pools as normalized StablecoinPool format
 */
export async function getMorphoPools(): Promise<StablecoinPool[]> {
  const vaults = await fetchMorphoVaults();
  return vaults.map(morphoVaultToPool);
}

// =============================================================================
// FALLBACK DATA
// =============================================================================

/**
 * Fallback Morpho vault data in case API is unavailable
 * This ensures the app doesn't break if the API is down
 */
export const MORPHO_FALLBACK_VAULTS: MorphoVaultResponse[] = [
  {
    address: MORPHO_ADDRESSES.vaults.gauntlet.USDCPrime,
    name: 'Gauntlet USDC Prime',
    symbol: 'gtUSDC',
    asset: {
      address: STABLECOIN_ADDRESSES.USDC,
      symbol: 'USDC',
      decimals: 6,
    },
    totalAssets: '10000000000000', // $10M in 6 decimals
    totalAssetsUsd: 10_000_000,
    avgNetApy: 0.08, // 8%
    avgApy: 0.085,
    performanceFee: 0.1, // 10%
    curator: {
      name: 'Gauntlet',
    },
  },
];

/**
 * Get Morpho pools with fallback
 */
export async function getMorphoPoolsWithFallback(): Promise<StablecoinPool[]> {
  try {
    return await getMorphoPools();
  } catch (error) {
    console.error('Failed to fetch Morpho pools, using fallback:', error);
    return MORPHO_FALLBACK_VAULTS.map(morphoVaultToPool);
  }
}
