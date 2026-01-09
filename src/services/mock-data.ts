/**
 * Mock Data Service for Base Sepolia Testnet
 *
 * Provides realistic mock data for protocols that don't have testnet deployments.
 * This allows UI/UX testing without requiring actual contract deployments.
 */

import type { Address } from 'viem';
import { parseEther, parseUnits } from 'viem';
import type { StakingPosition, TokenInfo, StakingOption, PriceData } from '@/types/staking';
import type { LendingPosition } from '@/types/lending';
import type { UserStablecoinPosition } from '@/types/stablecoin';
import { IS_TESTNET } from '@/lib/smart-wallet';
import { BASE_SEPOLIA_CONTRACTS } from '@/contracts/addresses/base-sepolia';

// ============================================
// CONSTANTS
// ============================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

// Mock token info
const MOCK_TOKENS: Record<string, TokenInfo> = {
  wstETH: {
    symbol: 'wstETH',
    name: 'Wrapped Liquid Staked Ether',
    address: ZERO_ADDRESS,
    decimals: 18,
    logoUrl: '/tokens/wsteth.svg',
  },
  cbETH: {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: ZERO_ADDRESS,
    decimals: 18,
    logoUrl: '/tokens/cbeth.svg',
  },
  weETH: {
    symbol: 'weETH',
    name: 'Wrapped eETH',
    address: ZERO_ADDRESS,
    decimals: 18,
    logoUrl: '/tokens/weeth.svg',
  },
  superOETHb: {
    symbol: 'superOETHb',
    name: 'Super OETH (Base)',
    address: ZERO_ADDRESS,
    decimals: 18,
    logoUrl: '/tokens/superoethb.svg',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: ZERO_ADDRESS,
    decimals: 6,
    logoUrl: '/tokens/usdc.svg',
  },
  sUSDe: {
    symbol: 'sUSDe',
    name: 'Staked USDe',
    address: ZERO_ADDRESS,
    decimals: 18,
    logoUrl: '/tokens/susde.svg',
  },
};

// ============================================
// STAKING POSITIONS (NEW)
// ============================================

/**
 * Generate realistic mock staking positions
 *
 * @param userAddress - User's wallet address
 * @returns Array of mock staking positions
 */
export function generateMockStakingPositions(
  userAddress: Address
): StakingPosition[] {
  // Only return mocks on testnet
  if (!IS_TESTNET) {
    return [];
  }

  const now = new Date().toISOString();
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: `lido-${userAddress}`,
      protocol: 'lido',
      type: 'liquid-staking',
      token: MOCK_TOKENS.wstETH,
      balance: '0.5',
      balanceUsd: 1650,
      apy: 3.2,
      earnedTotal: '0.0016',
      earnedTotalUsd: 5.28,
      entryDate: oneMonthAgo,
      entryPrice: 3000,
    },
    {
      id: `coinbase-${userAddress}`,
      protocol: 'coinbase',
      type: 'liquid-staking',
      token: MOCK_TOKENS.cbETH,
      balance: '0.3',
      balanceUsd: 990,
      apy: 2.9,
      earnedTotal: '0.00087',
      earnedTotalUsd: 2.87,
      entryDate: oneMonthAgo,
      entryPrice: 3000,
    },
    {
      id: `etherfi-${userAddress}`,
      protocol: 'etherfi',
      type: 'liquid-restaking',
      token: MOCK_TOKENS.weETH,
      balance: '0.2',
      balanceUsd: 660,
      apy: 4.1,
      earnedTotal: '0.00082',
      earnedTotalUsd: 2.71,
      entryDate: oneMonthAgo,
      entryPrice: 3000,
    },
    {
      id: `origin-${userAddress}`,
      protocol: 'origin',
      type: 'supercharged-lst',
      token: MOCK_TOKENS.superOETHb,
      balance: '0.15',
      balanceUsd: 495,
      apy: 5.8,
      earnedTotal: '0.00087',
      earnedTotalUsd: 2.87,
      entryDate: oneMonthAgo,
      entryPrice: 3000,
    },
  ];
}

/**
 * Calculate aggregate staking stats
 */
export function calculateStakingStats(positions: StakingPosition[]) {
  if (positions.length === 0) {
    return {
      totalPositions: 0,
      totalBalanceUsd: 0,
      totalEarnedUsd: 0,
      averageAPY: 0,
    };
  }

  const totalBalanceUsd = positions.reduce((sum, p) => sum + p.balanceUsd, 0);
  const totalEarnedUsd = positions.reduce((sum, p) => sum + p.earnedTotalUsd, 0);

  const weightedAPY = positions.reduce(
    (sum, p) => sum + (p.apy * p.balanceUsd),
    0
  ) / totalBalanceUsd;

  return {
    totalPositions: positions.length,
    totalBalanceUsd,
    totalEarnedUsd,
    averageAPY: weightedAPY,
  };
}

// ============================================
// LENDING POSITIONS (NEW)
// ============================================

/**
 * Generate realistic mock lending positions
 */
export function generateMockLendingPositions(
  userAddress: Address
): LendingPosition[] {
  if (!IS_TESTNET) {
    return [];
  }

  const now = Date.now();

  return [
    {
      id: `morpho-usdc-${userAddress}`,
      protocol: 'morpho',
      marketId: 'morpho-steakhouse-usdc',
      userAddress,
      chainId: 84532,
      asset: ZERO_ADDRESS,
      assetSymbol: 'USDC',
      assetDecimals: 6,
      supplyBalance: parseUnits('1000', 6),
      supplyBalanceUSD: 1000,
      borrowBalance: 0n,
      borrowBalanceUSD: 0,
      currentSupplyAPY: 8.5,
      currentBorrowAPY: 0,
      isCollateralEnabled: false,
      lastUpdated: now,
    },
    {
      id: `morpho-weth-${userAddress}`,
      protocol: 'morpho',
      marketId: 'morpho-gauntlet-weth',
      userAddress,
      chainId: 84532,
      asset: ZERO_ADDRESS,
      assetSymbol: 'WETH',
      assetDecimals: 18,
      supplyBalance: parseEther('0.5'),
      supplyBalanceUSD: 1650,
      borrowBalance: 0n,
      borrowBalanceUSD: 0,
      currentSupplyAPY: 3.2,
      currentBorrowAPY: 0,
      isCollateralEnabled: false,
      lastUpdated: now,
    },
  ];
}

/**
 * Calculate aggregate lending stats
 */
export function calculateLendingStats(positions: LendingPosition[]) {
  const totalSupplyUsd = positions.reduce((sum, p) => sum + p.supplyBalanceUSD, 0);
  const totalBorrowUsd = positions.reduce((sum, p) => sum + p.borrowBalanceUSD, 0);

  const weightedSupplyAPY = positions.reduce(
    (sum, p) => sum + (p.currentSupplyAPY * p.supplyBalanceUSD),
    0
  ) / (totalSupplyUsd || 1);

  return {
    totalPositions: positions.length,
    totalSupplyUsd,
    totalBorrowUsd,
    netWorthUsd: totalSupplyUsd - totalBorrowUsd,
    averageSupplyAPY: weightedSupplyAPY,
  };
}

// ============================================
// STABLE YIELD POSITIONS (NEW)
// ============================================

/**
 * Generate realistic mock stable yield positions
 * Note: Returns empty array for now - will implement when stable yield UI is built
 */
export function generateMockStablePositions(
  userAddress: Address
): UserStablecoinPosition[] {
  if (!IS_TESTNET) {
    return [];
  }

  // TODO: Implement proper mock UserStablecoinPosition when needed
  // Current UserStablecoinPosition type is complex with nested pool references
  return [];
}

/**
 * Calculate aggregate stable yield stats
 */
export function calculateStableStats(positions: UserStablecoinPosition[]) {
  const totalBalanceUsd = positions.reduce((sum, p) => sum + p.supplied.usd, 0);
  const totalYieldUsd = positions.reduce((sum, p) => sum + p.accruedInterest.usd, 0);

  const weightedAPY = positions.reduce(
    (sum, p) => sum + (p.currentApy * p.supplied.usd),
    0
  ) / (totalBalanceUsd || 1);

  return {
    totalPositions: positions.length,
    totalBalanceUsd,
    totalYieldUsd,
    averageAPY: weightedAPY,
  };
}

// ============================================
// AGGREGATE PORTFOLIO (NEW)
// ============================================

/**
 * Generate complete mock portfolio
 */
export function generateMockPortfolio(userAddress: Address) {
  const stakingPositions = generateMockStakingPositions(userAddress);
  const lendingPositions = generateMockLendingPositions(userAddress);
  const stablePositions = generateMockStablePositions(userAddress);

  const stakingStats = calculateStakingStats(stakingPositions);
  const lendingStats = calculateLendingStats(lendingPositions);
  const stableStats = calculateStableStats(stablePositions);

  const totalValueUsd =
    stakingStats.totalBalanceUsd +
    lendingStats.totalSupplyUsd +
    stableStats.totalBalanceUsd;

  const totalEarnedUsd =
    stakingStats.totalEarnedUsd +
    stableStats.totalYieldUsd;

  const overallAPY = totalValueUsd > 0 ? (
    (stakingStats.averageAPY * stakingStats.totalBalanceUsd) +
    (lendingStats.averageSupplyAPY * lendingStats.totalSupplyUsd) +
    (stableStats.averageAPY * stableStats.totalBalanceUsd)
  ) / totalValueUsd : 0;

  return {
    staking: {
      positions: stakingPositions,
      stats: stakingStats,
    },
    lending: {
      positions: lendingPositions,
      stats: lendingStats,
    },
    stable: {
      positions: stablePositions,
      stats: stableStats,
    },
    overall: {
      totalValueUsd,
      totalEarnedUsd,
      averageAPY: overallAPY,
      positionCount: stakingPositions.length + lendingPositions.length + stablePositions.length,
    },
  };
}

// ============================================
// LEGACY FUNCTIONS (For backwards compatibility)
// ============================================

/**
 * Mock staking options for testnet
 * Simulates the data that would come from DeFiLlama in production
 */
export function getMockStakingOptions(): StakingOption[] {
  const now = new Date().toISOString();

  return [
    // Tier 1: wstETH (Lido)
    {
      id: 'wsteth',
      name: 'Lido Staked ETH (Testnet)',
      protocol: 'lido',
      description:
        'Stake ETH with Lido and receive wstETH. This is a TESTNET simulation.',
      inputToken: {
        symbol: 'ETH',
        name: 'Ether',
        address: BASE_SEPOLIA_CONTRACTS.WETH as Address,
        decimals: 18,
      },
      outputToken: {
        symbol: 'wstETH',
        name: 'Wrapped Staked ETH (Mock)',
        address: BASE_SEPOLIA_CONTRACTS.mockWstETH as Address,
        decimals: 18,
      },
      apy: 3.4,
      apyBreakdown: {
        base: 3.4,
        total: 3.4,
      },
      risk: 'low',
      riskFactors: [
        'TESTNET: Using mock tokens',
        'Smart contract risk (audited, battle-tested on mainnet)',
      ],
      type: 'liquid-staking',
      tvl: 38000000000, // Simulated mainnet TVL
      lastUpdated: now,
    },

    // Tier 1: cbETH (Coinbase)
    {
      id: 'cbeth',
      name: 'Coinbase Staked ETH (Testnet)',
      protocol: 'coinbase',
      description:
        'Stake ETH through Coinbase. This is a TESTNET simulation.',
      inputToken: {
        symbol: 'ETH',
        name: 'Ether',
        address: BASE_SEPOLIA_CONTRACTS.WETH as Address,
        decimals: 18,
      },
      outputToken: {
        symbol: 'cbETH',
        name: 'Coinbase Wrapped Staked ETH (Mock)',
        address: BASE_SEPOLIA_CONTRACTS.mockCbETH as Address,
        decimals: 18,
      },
      apy: 2.78,
      apyBreakdown: {
        base: 2.78,
        total: 2.78,
      },
      risk: 'low',
      riskFactors: [
        'TESTNET: Using mock tokens',
        'Centralized (Coinbase custody)',
      ],
      type: 'liquid-staking',
      tvl: 3000000000,
      lastUpdated: now,
    },

    // Tier 1: Aave WETH Supply
    {
      id: 'aave-weth',
      name: 'Aave WETH Supply (Testnet)',
      protocol: 'aave',
      description:
        'Supply ETH to Aave V3 on Base Sepolia testnet. Uses real Aave testnet contracts.',
      inputToken: {
        symbol: 'ETH',
        name: 'Ether',
        address: BASE_SEPOLIA_CONTRACTS.WETH as Address,
        decimals: 18,
      },
      outputToken: {
        symbol: 'aWETH',
        name: 'Aave Base WETH',
        address: BASE_SEPOLIA_CONTRACTS.aave.aBasWETH as Address,
        decimals: 18,
      },
      apy: 1.5,
      apyBreakdown: {
        base: 1.5,
        rewards: 0,
        total: 1.5,
      },
      risk: 'low',
      riskFactors: [
        'TESTNET: Real Aave contracts on Base Sepolia',
        'Testnet funds have no real value',
      ],
      type: 'lending',
      tvl: 200000000,
      lastUpdated: now,
    },

    // Tier 2: Super OETH
    {
      id: 'superoethb',
      name: 'Super OETH (Testnet)',
      protocol: 'origin',
      description:
        'Supercharged LST simulation. This is a TESTNET mock.',
      inputToken: {
        symbol: 'ETH',
        name: 'Ether',
        address: BASE_SEPOLIA_CONTRACTS.WETH as Address,
        decimals: 18,
      },
      outputToken: {
        symbol: 'superOETHb',
        name: 'Super OETH (Mock)',
        address: BASE_SEPOLIA_CONTRACTS.mockSuperOETHb as Address,
        decimals: 18,
      },
      apy: 8.0,
      apyBreakdown: {
        base: 3.4,
        rewards: 4.6,
        total: 8.0,
      },
      risk: 'medium',
      riskFactors: [
        'TESTNET: Using mock tokens',
        'Rebasing token mechanics',
      ],
      type: 'supercharged-lst',
      tvl: 120000000,
      lastUpdated: now,
    },

    // Tier 2: weETH (Ether.fi)
    {
      id: 'weeth',
      name: 'Ether.fi Restaked ETH (Testnet)',
      protocol: 'etherfi',
      description:
        'Liquid restaking token simulation. This is a TESTNET mock.',
      inputToken: {
        symbol: 'ETH',
        name: 'Ether',
        address: BASE_SEPOLIA_CONTRACTS.WETH as Address,
        decimals: 18,
      },
      outputToken: {
        symbol: 'weETH',
        name: 'Wrapped eETH (Mock)',
        address: BASE_SEPOLIA_CONTRACTS.mockWeETH as Address,
        decimals: 18,
      },
      apy: 4.5,
      apyBreakdown: {
        base: 3.4,
        rewards: 1.1,
        total: 4.5,
      },
      risk: 'medium',
      riskFactors: [
        'TESTNET: Using mock tokens',
        'EigenLayer slashing risk (simulated)',
      ],
      type: 'liquid-restaking',
      tvl: 10000000000,
      lastUpdated: now,
    },
  ];
}

/**
 * Mock price data for testnet
 * Uses realistic mainnet prices for simulation
 */
export function getMockPrices(): Record<string, PriceData> {
  const now = new Date().toISOString();

  // Simulated ETH price
  const ethPrice = 3500; // Realistic price for testing

  return {
    ETH: {
      token: BASE_SEPOLIA_CONTRACTS.WETH as Address,
      priceUsd: ethPrice,
      priceEth: 1,
      lastUpdated: now,
    },
    wstETH: {
      token: BASE_SEPOLIA_CONTRACTS.mockWstETH as Address,
      priceUsd: ethPrice * 1.15, // wstETH trades at ~15% premium
      priceEth: 1.15,
      lastUpdated: now,
    },
    cbETH: {
      token: BASE_SEPOLIA_CONTRACTS.mockCbETH as Address,
      priceUsd: ethPrice * 1.05, // cbETH trades at ~5% premium
      priceEth: 1.05,
      lastUpdated: now,
    },
    weETH: {
      token: BASE_SEPOLIA_CONTRACTS.mockWeETH as Address,
      priceUsd: ethPrice * 1.02, // Slight premium
      priceEth: 1.02,
      lastUpdated: now,
    },
    superOETHb: {
      token: BASE_SEPOLIA_CONTRACTS.mockSuperOETHb as Address,
      priceUsd: ethPrice, // Pegged to ETH
      priceEth: 1,
      lastUpdated: now,
    },
  };
}

/**
 * Mock ETH price for testnet
 */
export function getMockEthPrice(): number {
  return 3500;
}

/**
 * Mock LST ratios for testnet
 */
export function getMockLSTRatios(): Record<string, number> {
  return {
    wstethEth: 1.15, // 1 wstETH = 1.15 ETH value
    cbethEth: 1.05, // 1 cbETH = 1.05 ETH value
    weethEth: 1.02, // 1 weETH = 1.02 ETH value
  };
}

/**
 * Mock user positions for testnet
 * Returns empty array - users need to actually stake on testnet
 */
export function getMockPositions(_userAddress: Address): StakingPosition[] {
  // In testnet, we still read real positions from the contracts
  // This is just a fallback if contract reads fail
  return [];
}

/**
 * Simulate transaction for testnet
 * Returns mock gas estimates
 */
export function getMockGasEstimate(): {
  estimatedGas: bigint;
  estimatedGasUsd: number;
} {
  return {
    estimatedGas: 200000n,
    estimatedGasUsd: 0.5, // Mock gas cost in USD
  };
}

/**
 * Check if a contract address is a mock (placeholder)
 */
export function isMockContract(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

/**
 * Get testnet faucet info
 */
export function getTestnetFaucetInfo(): {
  name: string;
  url: string;
  description: string;
}[] {
  return [
    {
      name: 'Base Sepolia Faucet',
      url: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
      description: 'Get free Base Sepolia ETH from Coinbase',
    },
    {
      name: 'Sepolia Faucet',
      url: 'https://sepoliafaucet.com/',
      description: 'Get free Sepolia ETH (for bridging)',
    },
  ];
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that we're running on testnet
 */
export function ensureTestnetMode() {
  if (!IS_TESTNET) {
    throw new Error(
      'Mock data can only be used on testnet. Please check your network configuration.'
    );
  }
}
