/**
 * Position Service
 *
 * Fetches user positions across all stablecoin protocols.
 * Aggregates balances and calculates portfolio totals.
 */

import { createPublicClient, http, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  UserStablecoinPosition,
  UserPortfolio,
  StablecoinPool,
  ProtocolName,
} from '@/types/stablecoin';
import {
  ERC20_ABI,
  ERC4626_ABI,
  MOONWELL_MTOKEN_ABI,
  COMPOUND_COMET_ABI,
  AAVE_V3_POOL_DATA_PROVIDER_ABI,
} from '@/contracts/abis/stablecoin-protocols';
import {
  AAVE_V3_ADDRESSES,
  STABLECOIN_ADDRESSES,
} from '@/contracts/addresses/stablecoin-protocols';
import { getAllPools } from './pool-data';
import { shouldUseMockData } from '@/contracts/addresses/network-config';

// =============================================================================
// TYPES
// =============================================================================

interface PositionBalance {
  poolId: string;
  receiptTokenBalance: bigint;
  underlyingBalance: bigint;
}

// =============================================================================
// PUBLIC CLIENT
// =============================================================================

function getPublicClient(chainId: number = 8453) {
  const chain = chainId === 8453 ? base : baseSepolia;
  const rpcUrl = chainId === 8453
    ? process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
    : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Get all user positions across all protocols
 */
export async function getUserPositions(
  userAddress: Address,
  chainId: number = 8453
): Promise<UserStablecoinPosition[]> {
  // Use mock data on testnet
  if (shouldUseMockData()) {
    return getMockPositions(userAddress);
  }

  const client = getPublicClient(chainId);
  const pools = await getAllPools();
  const positions: UserStablecoinPosition[] = [];

  // Fetch balances for each pool in parallel
  const balancePromises = pools.map((pool) =>
    getPoolBalance(client, pool, userAddress)
  );

  const balances = await Promise.all(balancePromises);

  // Filter non-zero positions and create position objects
  for (let i = 0; i < pools.length; i++) {
    const balance = balances[i];
    if (balance && balance.underlyingBalance > 0n) {
      const pool = pools[i];
      positions.push(createPosition(pool, userAddress, balance));
    }
  }

  return positions;
}

/**
 * Get user's complete portfolio summary
 */
export async function getUserPortfolio(
  userAddress: Address,
  chainId: number = 8453
): Promise<UserPortfolio> {
  const positions = await getUserPositions(userAddress, chainId);

  // Calculate totals
  let totalSupplied = 0;
  let totalInterest = 0;
  let totalRewards = 0;
  let weightedApySum = 0;

  for (const position of positions) {
    totalSupplied += position.supplied.usd;
    totalInterest += position.accruedInterest.usd;
    totalRewards += position.pendingRewards.reduce((sum, r) => sum + r.usd, 0);
    weightedApySum += position.currentApy * position.supplied.usd;
  }

  const portfolioValue = totalSupplied + totalInterest + totalRewards;
  const avgApy = totalSupplied > 0 ? weightedApySum / totalSupplied : 0;

  return {
    walletAddress: userAddress,
    positions,
    totals: {
      supplied: totalSupplied,
      interest: totalInterest,
      rewards: totalRewards,
      portfolioValue,
    },
    avgApy,
    lastUpdated: Date.now(),
  };
}

/**
 * Get position for a specific pool
 */
export async function getPoolPosition(
  userAddress: Address,
  pool: StablecoinPool,
  chainId: number = 8453
): Promise<UserStablecoinPosition | null> {
  if (shouldUseMockData()) {
    return null;
  }

  const client = getPublicClient(chainId);
  const balance = await getPoolBalance(client, pool, userAddress);

  if (!balance || balance.underlyingBalance === 0n) {
    return null;
  }

  return createPosition(pool, userAddress, balance);
}

// =============================================================================
// PROTOCOL-SPECIFIC BALANCE FETCHING
// =============================================================================

async function getPoolBalance(
  client: ReturnType<typeof getPublicClient>,
  pool: StablecoinPool,
  userAddress: Address
): Promise<PositionBalance | null> {
  try {
    switch (pool.protocol) {
      case 'aave':
        return getAaveBalance(client, pool, userAddress);
      case 'morpho':
      case 'fluid':
        return getERC4626Balance(client, pool, userAddress);
      case 'moonwell':
        return getMoonwellBalance(client, pool, userAddress);
      case 'compound':
        return getCompoundBalance(client, pool, userAddress);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error fetching ${pool.protocol} balance:`, error);
    return null;
  }
}

async function getAaveBalance(
  client: ReturnType<typeof getPublicClient>,
  pool: StablecoinPool,
  userAddress: Address
): Promise<PositionBalance> {
  // Get aToken balance directly
  const aTokenBalance = await client.readContract({
    address: pool.receiptToken.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;

  // For Aave, aToken balance = underlying balance (1:1)
  return {
    poolId: pool.id,
    receiptTokenBalance: aTokenBalance,
    underlyingBalance: aTokenBalance,
  };
}

async function getERC4626Balance(
  client: ReturnType<typeof getPublicClient>,
  pool: StablecoinPool,
  userAddress: Address
): Promise<PositionBalance> {
  // Get share balance
  const shareBalance = await client.readContract({
    address: pool.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;

  if (shareBalance === 0n) {
    return {
      poolId: pool.id,
      receiptTokenBalance: 0n,
      underlyingBalance: 0n,
    };
  }

  // Convert shares to assets
  const underlyingBalance = await client.readContract({
    address: pool.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'convertToAssets',
    args: [shareBalance],
  }) as bigint;

  return {
    poolId: pool.id,
    receiptTokenBalance: shareBalance,
    underlyingBalance,
  };
}

async function getMoonwellBalance(
  client: ReturnType<typeof getPublicClient>,
  pool: StablecoinPool,
  userAddress: Address
): Promise<PositionBalance> {
  // Get mToken balance
  const mTokenBalance = await client.readContract({
    address: pool.poolAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;

  if (mTokenBalance === 0n) {
    return {
      poolId: pool.id,
      receiptTokenBalance: 0n,
      underlyingBalance: 0n,
    };
  }

  // Get exchange rate and calculate underlying
  const exchangeRate = await client.readContract({
    address: pool.poolAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'exchangeRateStored',
    args: [],
  }) as bigint;

  const underlyingBalance = (mTokenBalance * exchangeRate) / BigInt(1e18);

  return {
    poolId: pool.id,
    receiptTokenBalance: mTokenBalance,
    underlyingBalance,
  };
}

async function getCompoundBalance(
  client: ReturnType<typeof getPublicClient>,
  pool: StablecoinPool,
  userAddress: Address
): Promise<PositionBalance> {
  // Compound V3 balanceOf returns the underlying balance directly
  const balance = await client.readContract({
    address: pool.poolAddress,
    abi: COMPOUND_COMET_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  }) as bigint;

  return {
    poolId: pool.id,
    receiptTokenBalance: balance, // In Compound V3, this is the underlying
    underlyingBalance: balance,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function createPosition(
  pool: StablecoinPool,
  userAddress: Address,
  balance: PositionBalance
): UserStablecoinPosition {
  const decimals = pool.asset.decimals;
  const underlyingUsd = Number(balance.underlyingBalance) / Math.pow(10, decimals);

  // Estimate accrued interest (simplified - would need entry point tracking in production)
  const estimatedInterest = underlyingUsd * (pool.apy.net / 100) * 0.1; // Assume ~36 days average

  return {
    poolId: pool.id,
    pool,
    walletAddress: userAddress,
    supplied: {
      native: balance.underlyingBalance,
      usd: underlyingUsd,
    },
    receiptTokenBalance: balance.receiptTokenBalance,
    accruedInterest: {
      native: BigInt(Math.floor(estimatedInterest * Math.pow(10, decimals))),
      usd: estimatedInterest,
    },
    pendingRewards: [], // Would need protocol-specific reward tracking
    entryTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // Placeholder
    entryApy: pool.apy.net,
    currentApy: pool.apy.net,
    totalValue: {
      native: balance.underlyingBalance,
      usd: underlyingUsd + estimatedInterest,
    },
    profitLoss: {
      native: BigInt(Math.floor(estimatedInterest * Math.pow(10, decimals))),
      usd: estimatedInterest,
      percentage: (estimatedInterest / underlyingUsd) * 100,
    },
  };
}

// =============================================================================
// MOCK DATA
// =============================================================================

async function getMockPositions(userAddress: Address): Promise<UserStablecoinPosition[]> {
  const pools = await getAllPools();

  // Return mock positions for first 2 pools
  const mockPositions: UserStablecoinPosition[] = [];

  if (pools.length > 0) {
    const pool1 = pools[0];
    mockPositions.push({
      poolId: pool1.id,
      pool: pool1,
      walletAddress: userAddress,
      supplied: {
        native: BigInt(5000 * Math.pow(10, pool1.asset.decimals)),
        usd: 5000,
      },
      receiptTokenBalance: BigInt(5000 * Math.pow(10, pool1.asset.decimals)),
      accruedInterest: {
        native: BigInt(25 * Math.pow(10, pool1.asset.decimals)),
        usd: 25,
      },
      pendingRewards: [],
      entryTimestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
      entryApy: pool1.apy.net - 0.5,
      currentApy: pool1.apy.net,
      totalValue: {
        native: BigInt(5025 * Math.pow(10, pool1.asset.decimals)),
        usd: 5025,
      },
      profitLoss: {
        native: BigInt(25 * Math.pow(10, pool1.asset.decimals)),
        usd: 25,
        percentage: 0.5,
      },
    });
  }

  if (pools.length > 1) {
    const pool2 = pools[1];
    mockPositions.push({
      poolId: pool2.id,
      pool: pool2,
      walletAddress: userAddress,
      supplied: {
        native: BigInt(2500 * Math.pow(10, pool2.asset.decimals)),
        usd: 2500,
      },
      receiptTokenBalance: BigInt(2500 * Math.pow(10, pool2.asset.decimals)),
      accruedInterest: {
        native: BigInt(18 * Math.pow(10, pool2.asset.decimals)),
        usd: 18,
      },
      pendingRewards: [],
      entryTimestamp: Date.now() - 45 * 24 * 60 * 60 * 1000,
      entryApy: pool2.apy.net - 0.3,
      currentApy: pool2.apy.net,
      totalValue: {
        native: BigInt(2518 * Math.pow(10, pool2.asset.decimals)),
        usd: 2518,
      },
      profitLoss: {
        native: BigInt(18 * Math.pow(10, pool2.asset.decimals)),
        usd: 18,
        percentage: 0.72,
      },
    });
  }

  return mockPositions;
}
