/**
 * Mock Positions Service
 *
 * Provides realistic mock position data for testnet development.
 * Generates deterministic positions based on wallet address so
 * the same wallet always sees the same mock data.
 */

import type { Address } from 'viem';
import type { StakingPosition, StakingType, TokenInfo } from '@/types/staking';
import type { UserStablecoinPosition, StablecoinPool, ProtocolName } from '@/types/stablecoin';

// =============================================================================
// CONSTANTS
// =============================================================================

const MOCK_TOKENS: Record<string, TokenInfo> = {
  wstETH: {
    symbol: 'wstETH',
    name: 'Wrapped Staked ETH',
    address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0EE452' as Address,
    decimals: 18,
  },
  cbETH: {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEC22' as Address,
    decimals: 18,
  },
  weETH: {
    symbol: 'weETH',
    name: 'Wrapped eETH',
    address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A' as Address,
    decimals: 18,
  },
  superOETHb: {
    symbol: 'superOETHb',
    name: 'Super OETH',
    address: '0xDBFeFD2e8460a6Ee4955A68582F85708BAEA60A3' as Address,
    decimals: 18,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
    decimals: 18,
  },
};

// Realistic APY ranges for each protocol (as of 2024-2025)
const APY_RANGES = {
  lido: { min: 3.2, max: 3.8 },
  coinbase: { min: 2.5, max: 3.2 },
  etherfi: { min: 3.8, max: 5.2 },
  origin: { min: 6.5, max: 9.0 },
  aave: { min: 1.2, max: 2.5 },
  morpho: { min: 4.5, max: 8.0 },
  moonwell: { min: 3.5, max: 6.0 },
  compound: { min: 3.0, max: 5.5 },
  spark: { min: 5.0, max: 6.5 },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a deterministic "random" number from a seed string
 * Same seed always produces same number
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Normalize to 0-1 range
  return Math.abs(hash % 1000) / 1000;
}

/**
 * Generate a random number in range based on seed
 */
function seededRandomInRange(seed: string, min: number, max: number): number {
  const rand = seededRandom(seed);
  return min + rand * (max - min);
}

/**
 * Generate a random boolean based on seed and probability
 */
function seededRandomBool(seed: string, probability: number = 0.5): boolean {
  return seededRandom(seed) < probability;
}

/**
 * Format a number to specified decimal places
 */
function formatNumber(num: number, decimals: number): string {
  return num.toFixed(decimals);
}

// =============================================================================
// MOCK STAKING POSITIONS
// =============================================================================

export interface MockStakingConfig {
  /** Whether to include Lido position */
  includeLido?: boolean;
  /** Whether to include Coinbase position */
  includeCoinbase?: boolean;
  /** Whether to include Ether.fi position */
  includeEtherfi?: boolean;
  /** Whether to include Origin position */
  includeOrigin?: boolean;
  /** Whether to include Aave WETH supply */
  includeAave?: boolean;
}

/**
 * Generate mock staking positions for a wallet address
 */
export function generateMockStakingPositions(
  walletAddress: Address,
  config: MockStakingConfig = {}
): StakingPosition[] {
  const {
    includeLido = true,
    includeCoinbase = true,
    includeEtherfi = true,
    includeOrigin = false,
    includeAave = false,
  } = config;

  const positions: StakingPosition[] = [];
  const baseDate = new Date('2024-06-15');

  // Lido wstETH Position
  if (includeLido && seededRandomBool(`${walletAddress}-lido`, 0.7)) {
    const balance = seededRandomInRange(`${walletAddress}-lido-bal`, 0.5, 5.0);
    const apy = seededRandomInRange(`${walletAddress}-lido-apy`, APY_RANGES.lido.min, APY_RANGES.lido.max);
    const ethPrice = 2350; // Mock ETH price
    const wstethRatio = 1.15; // wstETH is worth more than ETH
    const balanceUsd = balance * ethPrice * wstethRatio;
    const earnedPercent = seededRandomInRange(`${walletAddress}-lido-earned`, 0.02, 0.08);

    positions.push({
      id: `mock-lido-${walletAddress.slice(0, 8)}`,
      protocol: 'Lido',
      type: 'liquid-staking' as StakingType,
      token: MOCK_TOKENS.wstETH,
      balance: formatNumber(balance, 4),
      balanceUsd,
      apy,
      earnedTotal: formatNumber(balance * earnedPercent, 6),
      earnedTotalUsd: balanceUsd * earnedPercent,
      entryDate: new Date(baseDate.getTime() - seededRandom(`${walletAddress}-lido-date`) * 180 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: ethPrice * (1 - earnedPercent),
    });
  }

  // Coinbase cbETH Position
  if (includeCoinbase && seededRandomBool(`${walletAddress}-cbeth`, 0.5)) {
    const balance = seededRandomInRange(`${walletAddress}-cbeth-bal`, 0.3, 3.0);
    const apy = seededRandomInRange(`${walletAddress}-cbeth-apy`, APY_RANGES.coinbase.min, APY_RANGES.coinbase.max);
    const ethPrice = 2350;
    const cbethRatio = 1.05;
    const balanceUsd = balance * ethPrice * cbethRatio;
    const earnedPercent = seededRandomInRange(`${walletAddress}-cbeth-earned`, 0.01, 0.05);

    positions.push({
      id: `mock-cbeth-${walletAddress.slice(0, 8)}`,
      protocol: 'Coinbase',
      type: 'liquid-staking' as StakingType,
      token: MOCK_TOKENS.cbETH,
      balance: formatNumber(balance, 4),
      balanceUsd,
      apy,
      earnedTotal: formatNumber(balance * earnedPercent, 6),
      earnedTotalUsd: balanceUsd * earnedPercent,
      entryDate: new Date(baseDate.getTime() - seededRandom(`${walletAddress}-cbeth-date`) * 120 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: ethPrice * (1 - earnedPercent),
    });
  }

  // Ether.fi weETH Position
  if (includeEtherfi && seededRandomBool(`${walletAddress}-weeth`, 0.4)) {
    const balance = seededRandomInRange(`${walletAddress}-weeth-bal`, 0.2, 2.5);
    const apy = seededRandomInRange(`${walletAddress}-weeth-apy`, APY_RANGES.etherfi.min, APY_RANGES.etherfi.max);
    const ethPrice = 2350;
    const weethRatio = 1.03;
    const balanceUsd = balance * ethPrice * weethRatio;
    const earnedPercent = seededRandomInRange(`${walletAddress}-weeth-earned`, 0.015, 0.06);

    positions.push({
      id: `mock-weeth-${walletAddress.slice(0, 8)}`,
      protocol: 'Ether.fi',
      type: 'liquid-restaking' as StakingType,
      token: MOCK_TOKENS.weETH,
      balance: formatNumber(balance, 4),
      balanceUsd,
      apy,
      earnedTotal: formatNumber(balance * earnedPercent, 6),
      earnedTotalUsd: balanceUsd * earnedPercent,
      entryDate: new Date(baseDate.getTime() - seededRandom(`${walletAddress}-weeth-date`) * 90 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: ethPrice * (1 - earnedPercent),
    });
  }

  // Origin superOETHb Position (higher risk, higher reward)
  if (includeOrigin && seededRandomBool(`${walletAddress}-origin`, 0.3)) {
    const balance = seededRandomInRange(`${walletAddress}-origin-bal`, 0.5, 4.0);
    const apy = seededRandomInRange(`${walletAddress}-origin-apy`, APY_RANGES.origin.min, APY_RANGES.origin.max);
    const ethPrice = 2350;
    const balanceUsd = balance * ethPrice;
    const earnedPercent = seededRandomInRange(`${walletAddress}-origin-earned`, 0.03, 0.12);

    positions.push({
      id: `mock-origin-${walletAddress.slice(0, 8)}`,
      protocol: 'Origin',
      type: 'supercharged-lst' as StakingType,
      token: MOCK_TOKENS.superOETHb,
      balance: formatNumber(balance, 4),
      balanceUsd,
      apy,
      earnedTotal: formatNumber(balance * earnedPercent, 6),
      earnedTotalUsd: balanceUsd * earnedPercent,
      entryDate: new Date(baseDate.getTime() - seededRandom(`${walletAddress}-origin-date`) * 60 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: ethPrice * (1 - earnedPercent),
    });
  }

  return positions;
}

// =============================================================================
// MOCK STABLE YIELD POSITIONS
// =============================================================================

export interface MockStableConfig {
  /** Whether to include Aave position */
  includeAave?: boolean;
  /** Whether to include Morpho position */
  includeMorpho?: boolean;
  /** Whether to include Moonwell position */
  includeMoonwell?: boolean;
  /** Whether to include Compound position */
  includeCompound?: boolean;
}

/**
 * Generate mock stable yield positions for a wallet address
 */
export function generateMockStablePositions(
  walletAddress: Address,
  config: MockStableConfig = {}
): UserStablecoinPosition[] {
  const {
    includeAave = true,
    includeMorpho = true,
    includeMoonwell = false,
    includeCompound = false,
  } = config;

  const positions: UserStablecoinPosition[] = [];

  // Aave USDC Position
  if (includeAave && seededRandomBool(`${walletAddress}-aave-stable`, 0.6)) {
    const amount = seededRandomInRange(`${walletAddress}-aave-stable-amt`, 1000, 15000);
    const apy = seededRandomInRange(`${walletAddress}-aave-stable-apy`, 3.5, 5.5);
    const earnedPercent = seededRandomInRange(`${walletAddress}-aave-stable-earned`, 0.01, 0.04);

    positions.push(createMockStablePosition(
      walletAddress,
      'aave',
      'Aave V3',
      MOCK_TOKENS.USDC,
      amount,
      apy,
      earnedPercent
    ));
  }

  // Morpho USDC Position
  if (includeMorpho && seededRandomBool(`${walletAddress}-morpho-stable`, 0.5)) {
    const amount = seededRandomInRange(`${walletAddress}-morpho-stable-amt`, 2000, 25000);
    const apy = seededRandomInRange(`${walletAddress}-morpho-stable-apy`, APY_RANGES.morpho.min, APY_RANGES.morpho.max);
    const earnedPercent = seededRandomInRange(`${walletAddress}-morpho-stable-earned`, 0.02, 0.06);

    positions.push(createMockStablePosition(
      walletAddress,
      'morpho',
      'Morpho Blue',
      MOCK_TOKENS.USDC,
      amount,
      apy,
      earnedPercent
    ));
  }

  // Moonwell DAI Position
  if (includeMoonwell && seededRandomBool(`${walletAddress}-moonwell-stable`, 0.4)) {
    const amount = seededRandomInRange(`${walletAddress}-moonwell-stable-amt`, 500, 8000);
    const apy = seededRandomInRange(`${walletAddress}-moonwell-stable-apy`, APY_RANGES.moonwell.min, APY_RANGES.moonwell.max);
    const earnedPercent = seededRandomInRange(`${walletAddress}-moonwell-stable-earned`, 0.015, 0.05);

    positions.push(createMockStablePosition(
      walletAddress,
      'moonwell',
      'Moonwell',
      MOCK_TOKENS.DAI,
      amount,
      apy,
      earnedPercent
    ));
  }

  // Compound USDC Position
  if (includeCompound && seededRandomBool(`${walletAddress}-compound-stable`, 0.3)) {
    const amount = seededRandomInRange(`${walletAddress}-compound-stable-amt`, 1500, 12000);
    const apy = seededRandomInRange(`${walletAddress}-compound-stable-apy`, APY_RANGES.compound.min, APY_RANGES.compound.max);
    const earnedPercent = seededRandomInRange(`${walletAddress}-compound-stable-earned`, 0.012, 0.04);

    positions.push(createMockStablePosition(
      walletAddress,
      'compound',
      'Compound V3',
      MOCK_TOKENS.USDC,
      amount,
      apy,
      earnedPercent
    ));
  }

  return positions;
}

/**
 * Helper to create a mock stable position
 */
function createMockStablePosition(
  walletAddress: Address,
  protocol: ProtocolName,
  protocolDisplay: string,
  token: TokenInfo,
  amount: number,
  apy: number,
  earnedPercent: number
): UserStablecoinPosition {
  const interestEarned = amount * earnedPercent;
  const totalValue = amount + interestEarned;

  // Create mock pool
  const mockPool: StablecoinPool = {
    id: `${protocol}-84532-${token.symbol}`,
    protocol,
    chainId: 84532,
    asset: {
      address: token.address,
      symbol: token.symbol as 'USDC' | 'USDT' | 'DAI' | 'USDbC',
      decimals: token.decimals,
      name: token.name,
      logoUrl: '',
      priceUsd: 1.0,
    },
    receiptToken: {
      address: token.address,
      symbol: `a${token.symbol}`,
      decimals: token.decimals,
      underlyingToken: token.address,
      exchangeRate: BigInt(1e18),
      exchangeRateDecimals: 18,
    },
    poolAddress: token.address,
    apy: {
      base: apy,
      reward: 0,
      net: apy,
    },
    apyHistory: {
      avg7d: apy - 0.2,
      avg30d: apy - 0.5,
      min30d: apy - 1.0,
      max30d: apy + 0.5,
    },
    tvl: {
      native: BigInt(Math.floor(seededRandom(`${walletAddress}-${protocol}-tvl`) * 50000000 * 10 ** token.decimals)),
      usd: seededRandom(`${walletAddress}-${protocol}-tvl-usd`) * 50000000,
    },
    utilization: seededRandom(`${walletAddress}-${protocol}-util`) * 80,
    supplyCap: null,
    availableLiquidity: BigInt(Math.floor(seededRandom(`${walletAddress}-${protocol}-liq`) * 10000000 * 10 ** token.decimals)),
    minDeposit: BigInt(10 * 10 ** token.decimals),
    maxDeposit: null,
    risk: {
      score: protocol === 'aave' || protocol === 'compound' ? 'A' : 'B',
      factors: ['Smart contract risk', 'Liquidity risk'],
    },
    status: 'active',
    lastUpdated: Date.now(),
    dataSource: 'cached',
  };

  return {
    poolId: mockPool.id,
    pool: mockPool,
    walletAddress,
    supplied: {
      native: BigInt(Math.floor(amount * 10 ** token.decimals)),
      usd: amount,
    },
    receiptTokenBalance: BigInt(Math.floor(amount * 10 ** token.decimals)),
    accruedInterest: {
      native: BigInt(Math.floor(interestEarned * 10 ** token.decimals)),
      usd: interestEarned,
    },
    pendingRewards: [],
    entryTimestamp: Date.now() - seededRandom(`${walletAddress}-${protocol}-entry`) * 90 * 24 * 60 * 60 * 1000,
    entryApy: apy - 0.3,
    currentApy: apy,
    totalValue: {
      native: BigInt(Math.floor(totalValue * 10 ** token.decimals)),
      usd: totalValue,
    },
    profitLoss: {
      native: BigInt(Math.floor(interestEarned * 10 ** token.decimals)),
      usd: interestEarned,
      percentage: earnedPercent * 100,
    },
  };
}

// =============================================================================
// AGGREGATION HELPERS
// =============================================================================

/**
 * Calculate aggregated stats from mock staking positions
 */
export function calculateMockStakingStats(positions: StakingPosition[]) {
  const totalValueUsd = positions.reduce((sum, p) => sum + p.balanceUsd, 0);
  const totalEarnedUsd = positions.reduce((sum, p) => sum + p.earnedTotalUsd, 0);

  let weightedAvgAPY = 0;
  if (totalValueUsd > 0) {
    const weightedSum = positions.reduce((sum, p) => sum + p.apy * p.balanceUsd, 0);
    weightedAvgAPY = weightedSum / totalValueUsd;
  }

  return {
    totalValueUsd,
    totalEarnedUsd,
    weightedAvgAPY,
    positionsCount: positions.length,
  };
}

/**
 * Calculate aggregated stats from mock stable positions
 */
export function calculateMockStableStats(positions: UserStablecoinPosition[]) {
  const totalValue = positions.reduce((sum, p) => sum + p.supplied.usd, 0);
  const totalEarnings = positions.reduce((sum, p) => sum + p.accruedInterest.usd, 0);

  let avgApy = 0;
  if (totalValue > 0) {
    const weightedSum = positions.reduce((sum, p) => sum + p.currentApy * p.supplied.usd, 0);
    avgApy = weightedSum / totalValue;
  }

  return {
    totalValue,
    totalEarnings,
    avgApy,
    positionsCount: positions.length,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const mockPositionsService = {
  generateStakingPositions: generateMockStakingPositions,
  generateStablePositions: generateMockStablePositions,
  calculateStakingStats: calculateMockStakingStats,
  calculateStableStats: calculateMockStableStats,
};

export default mockPositionsService;
