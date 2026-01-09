/**
 * Stablecoin Protocol Integration Types
 *
 * This file contains all TypeScript types for the stablecoin yield integration.
 * Covers: Protocols, Pools, Positions, Transactions, and Risk Management
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

export type StablecoinSymbol = 'USDC' | 'USDT' | 'DAI' | 'USDbC';

export type ProtocolName = 'aave' | 'morpho' | 'moonwell' | 'compound' | 'fluid';

export type ProtocolTier = 1 | 2; // 1 = Institutional Grade, 2 = Established

export type RiskScore = 'A' | 'B' | 'C' | 'D';

export type PoolStatus = 'active' | 'paused' | 'deprecated';

export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

// =============================================================================
// PROTOCOL METADATA
// =============================================================================

export interface ProtocolMetadata {
  name: ProtocolName;
  displayName: string;
  tier: ProtocolTier;
  description: string;
  website: string;
  logoUrl: string;
  color: string; // Brand color for UI
  launchDate: string; // ISO date string
  audits: {
    auditor: string;
    date: string;
    reportUrl: string;
  }[];
  supportedChains: number[]; // Chain IDs
}

// =============================================================================
// TOKEN & ASSET TYPES
// =============================================================================

export interface StablecoinToken {
  address: `0x${string}`;
  symbol: StablecoinSymbol;
  decimals: number;
  name: string;
  logoUrl: string;
  // Price should always be ~$1, but track for depeg detection
  priceUsd: number;
}

export interface ReceiptToken {
  address: `0x${string}`;
  symbol: string; // aUSDC, mUSDC, cUSDCv3, etc.
  decimals: number;
  underlyingToken: `0x${string}`;
  // Exchange rate: how many underlying tokens per receipt token
  exchangeRate: bigint;
  exchangeRateDecimals: number;
}

// =============================================================================
// POOL TYPES (Normalized across protocols)
// =============================================================================

export interface StablecoinPool {
  // Identification
  id: string; // `${protocol}-${chainId}-${asset}`
  protocol: ProtocolName;
  chainId: number;

  // Asset Information
  asset: StablecoinToken;
  receiptToken: ReceiptToken;

  // Contract Addresses
  poolAddress: `0x${string}`; // Main contract to interact with

  // Yield Data
  apy: {
    base: number; // Base lending APY (%)
    reward: number; // Additional reward token APY (%)
    net: number; // Net APY after fees (%)
  };

  // Historical APY (for stability assessment)
  apyHistory: {
    avg7d: number;
    avg30d: number;
    min30d: number;
    max30d: number;
  };

  // Pool Metrics
  tvl: {
    native: bigint; // In token decimals
    usd: number;
  };

  utilization: number; // 0-100 (%)

  // Limits
  supplyCap: bigint | null; // null = no cap
  availableLiquidity: bigint;
  minDeposit: bigint;
  maxDeposit: bigint | null; // null = no max

  // Risk Assessment
  risk: {
    score: RiskScore;
    factors: string[];
  };

  // Status
  status: PoolStatus;

  // Metadata
  lastUpdated: number; // Unix timestamp (ms)
  dataSource: 'api' | 'onchain' | 'cached';
}

// =============================================================================
// USER POSITION TYPES
// =============================================================================

export interface UserStablecoinPosition {
  // Pool Reference
  poolId: string;
  pool: StablecoinPool;

  // User
  walletAddress: `0x${string}`;

  // Position Data
  supplied: {
    native: bigint;
    usd: number;
  };

  receiptTokenBalance: bigint;

  // Earnings
  accruedInterest: {
    native: bigint;
    usd: number;
  };

  // Pending Rewards (protocol tokens like WELL, COMP, MORPHO)
  pendingRewards: {
    token: `0x${string}`;
    symbol: string;
    amount: bigint;
    usd: number;
  }[];

  // Position History
  entryTimestamp: number;
  entryApy: number;
  currentApy: number;

  // Calculated Fields
  totalValue: {
    native: bigint;
    usd: number;
  };

  profitLoss: {
    native: bigint;
    usd: number;
    percentage: number;
  };
}

export interface UserPortfolio {
  walletAddress: `0x${string}`;
  positions: UserStablecoinPosition[];

  // Aggregated Totals
  totals: {
    supplied: number; // USD
    interest: number; // USD
    rewards: number; // USD
    portfolioValue: number; // USD
  };

  // Weighted Average APY
  avgApy: number;

  // Last Updated
  lastUpdated: number;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export interface TransactionStep {
  id: string;
  name: string;
  description: string;
  status: TransactionStatus;
  txHash?: `0x${string}`;
  error?: string;
  // For multi-step flows
  order: number;
  isOptional: boolean;
}

export interface TransactionFlow {
  id: string;
  type: 'deposit' | 'withdraw' | 'claim';
  protocol: ProtocolName;

  // Steps in the flow
  steps: TransactionStep[];
  currentStepIndex: number;

  // Transaction details
  asset: StablecoinToken;
  amount: bigint;

  // Status
  status: TransactionStatus;
  startTime: number;
  endTime?: number;

  // Results
  txHashes: `0x${string}`[];
  error?: string;
}

// =============================================================================
// DEPOSIT/WITHDRAW PARAMETERS
// =============================================================================

export interface DepositParams {
  pool: StablecoinPool;
  amount: bigint;
  userAddress: `0x${string}`;
  // Optional: for smart wallet batching
  useSmartWallet?: boolean;
}

export interface WithdrawParams {
  position: UserStablecoinPosition;
  amount: bigint | 'max'; // 'max' = full withdrawal
  userAddress: `0x${string}`;
  // Optional: claim rewards in same tx
  claimRewards?: boolean;
}

export interface ClaimRewardsParams {
  position: UserStablecoinPosition;
  userAddress: `0x${string}`;
  // Which reward tokens to claim
  rewardTokens?: `0x${string}`[];
}

// =============================================================================
// PREVIEW/QUOTE TYPES
// =============================================================================

export interface DepositPreview {
  pool: StablecoinPool;
  inputAmount: bigint;

  // What user will receive
  receiptTokens: bigint;

  // Estimated value after 1 year at current APY
  estimatedValue1Y: {
    native: bigint;
    usd: number;
  };

  // Gas estimate
  estimatedGas: {
    wei: bigint;
    usd: number;
  };

  // Warnings
  warnings: string[];
}

export interface WithdrawPreview {
  position: UserStablecoinPosition;
  withdrawAmount: bigint;

  // What user will receive
  outputAmount: bigint;

  // If partial withdrawal
  remainingPosition?: {
    native: bigint;
    usd: number;
  };

  // Rewards to claim
  rewardsClaimed?: {
    token: `0x${string}`;
    amount: bigint;
    usd: number;
  }[];

  // Gas estimate
  estimatedGas: {
    wei: bigint;
    usd: number;
  };

  // Warnings (e.g., withdrawal queue)
  warnings: string[];

  // Estimated time to complete
  estimatedTime: number; // seconds
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface MorphoVaultResponse {
  address: string;
  name: string;
  symbol: string;
  asset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  totalAssets: string;
  totalAssetsUsd: number;
  totalSupply?: string;
  liquidityUsd?: number;
  avgNetApy: number;
  avgApy: number;
  performanceFee: number;
  curator?: {
    name: string;
  };
  rewards?: {
    supplyApr?: number;
  }[];
}

export interface DefiLlamaPoolResponse {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  rewardTokens: string[];
  underlyingTokens: string[];
}

// =============================================================================
// DATA CACHE TYPES
// =============================================================================

export interface CachedData<T> {
  data: T;
  timestamp: number; // When cached
  expiresAt: number; // When cache expires
  source: 'api' | 'onchain' | 'fallback';
}

export interface DataFetchConfig {
  // Cache duration in milliseconds
  poolDataCacheDuration: number; // APY, TVL (few days)
  positionCacheDuration: number; // User positions (shorter)
  priceCacheDuration: number; // Token prices

  // Retry config
  maxRetries: number;
  retryDelayMs: number;

  // Fallback behavior
  useFallbackOnError: boolean;
  fallbackCacheDuration: number;
}

// Default config: few days for pool data
export const DEFAULT_DATA_FETCH_CONFIG: DataFetchConfig = {
  poolDataCacheDuration: 3 * 24 * 60 * 60 * 1000, // 3 days
  positionCacheDuration: 5 * 60 * 1000, // 5 minutes for positions
  priceCacheDuration: 60 * 60 * 1000, // 1 hour for prices
  maxRetries: 3,
  retryDelayMs: 1000,
  useFallbackOnError: true,
  fallbackCacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days for fallback
};

// =============================================================================
// RISK MANAGEMENT TYPES
// =============================================================================

export interface PoolRiskAssessment {
  poolId: string;

  // Overall score
  score: RiskScore;

  // Individual factors (0-100, higher = safer)
  factors: {
    protocolAge: number; // Days since launch
    tvlStability: number; // TVL volatility
    auditCoverage: number; // % of code audited
    utilizationHealth: number; // Not too high
    apyStability: number; // APY volatility
    oracleReliability: number; // Price feed health
  };

  // Warnings
  warnings: {
    type: 'info' | 'warning' | 'critical';
    message: string;
  }[];

  // Recommendations
  maxRecommendedDeposit: number; // USD
}

export interface DepegAlert {
  token: StablecoinSymbol;
  currentPrice: number;
  deviation: number; // % from $1
  severity: 'minor' | 'moderate' | 'severe';
  timestamp: number;
}

// =============================================================================
// PROTOCOL-SPECIFIC TYPES
// =============================================================================

// Aave-specific
export interface AaveReserveData {
  underlyingAsset: `0x${string}`;
  aTokenAddress: `0x${string}`;
  variableDebtTokenAddress: `0x${string}`;
  liquidityRate: bigint; // RAY units (10^27)
  variableBorrowRate: bigint;
  liquidityIndex: bigint;
  totalAToken: bigint;
  totalVariableDebt: bigint;
}

// Moonwell-specific
export interface MoonwellMarketData {
  mToken: `0x${string}`;
  underlyingAsset: `0x${string}`;
  supplyRatePerTimestamp: bigint;
  exchangeRate: bigint;
  totalSupply: bigint;
  totalBorrows: bigint;
  reserveFactor: bigint;
}

// Compound-specific
export interface CompoundCometData {
  baseToken: `0x${string}`;
  supplyRate: bigint;
  utilization: bigint;
  totalSupply: bigint;
  totalBorrow: bigint;
}

// Morpho-specific (ERC-4626)
export interface MorphoVaultData {
  vault: `0x${string}`;
  asset: `0x${string}`;
  totalAssets: bigint;
  totalSupply: bigint; // Shares
  // APY comes from API, not on-chain
}

// =============================================================================
// HELPER TYPE UTILITIES
// =============================================================================

export type Address = `0x${string}`;

export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function poolId(protocol: ProtocolName, chainId: number, asset: string): string {
  return `${protocol}-${chainId}-${asset.toLowerCase()}`;
}
