import type { Address } from 'viem';

// ============================================
// PRISM SMART WALLET TYPES (ERC-4337)
// ============================================

/**
 * Smart wallet state representing a ZeroDev Kernel account
 * Created from a connected EOA (externally owned account)
 */
export interface PrismSmartWallet {
  /** Smart wallet contract address (counterfactual - may not be deployed yet) */
  address: Address;
  /** EOA that owns and controls this smart wallet */
  owner: Address;
  /** Whether the smart wallet contract has been deployed on-chain */
  isDeployed: boolean;
  /** Creation timestamp (when user first created the wallet in PRISM) */
  createdAt: string;
  /** Total USD value of assets in/controlled by this wallet */
  totalValueUsd: number;
  /** Kernel version (e.g., "0.3.1") */
  kernelVersion?: string;
}

/**
 * Legacy PrismWallet type for backward compatibility
 * @deprecated Use PrismSmartWallet instead
 */
export interface PrismWallet {
  address: Address;
  owner: Address;
  createdAt: string;
  totalValueUsd: number;
  isDeployed: boolean;
}

/**
 * Smart wallet creation state
 */
export type SmartWalletCreationStep =
  | 'idle'
  | 'connecting'
  | 'signing'
  | 'creating'
  | 'success'
  | 'error';

/**
 * UserOperation status for ERC-4337 transactions
 */
export interface UserOperationStatus {
  hash: `0x${string}`;
  status: 'pending' | 'submitted' | 'included' | 'failed';
  transactionHash?: `0x${string}`;
  blockNumber?: bigint;
  error?: string;
}

/**
 * Batched transaction call for smart wallet
 */
export interface SmartWalletCall {
  to: Address;
  value: bigint;
  data: `0x${string}`;
}

// ============================================
// TOKEN BALANCE TYPES
// ============================================

export interface TokenBalance {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  balance: string; // Formatted balance
  balanceRaw: bigint; // Raw balance
  balanceUsd: number;
  price: number;
  logoUrl?: string;
}

// ============================================
// PROTOCOL POSITION TYPES
// ============================================

export interface AaveUserPosition {
  totalCollateralUsd: number;
  totalDebtUsd: number;
  availableBorrowsUsd: number;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: number;
  supplies: AaveSupplyPosition[];
  borrows: AaveBorrowPosition[];
}

export interface AaveSupplyPosition {
  asset: string;
  assetAddress: Address;
  aTokenAddress: Address;
  balance: string;
  balanceRaw: bigint;
  balanceUsd: number;
  supplyApy: number;
  isCollateral: boolean;
}

export interface AaveBorrowPosition {
  asset: string;
  assetAddress: Address;
  debtTokenAddress: Address;
  balance: string;
  balanceRaw: bigint;
  balanceUsd: number;
  borrowApy: number;
  borrowType: 'variable' | 'stable';
}

export interface LidoPosition {
  stETHBalance: string;
  stETHBalanceRaw: bigint;
  stETHBalanceUsd: number;
  wstETHBalance: string;
  wstETHBalanceRaw: bigint;
  wstETHBalanceUsd: number;
  pendingWithdrawals: LidoWithdrawalRequest[];
  totalValueUsd: number;
  apy: number;
}

export interface LidoWithdrawalRequest {
  requestId: bigint;
  amountOfStETH: string;
  timestamp: number;
  isFinalized: boolean;
  isClaimed: boolean;
}

export interface EthenaPosition {
  usdeBalance: string;
  usdeBalanceRaw: bigint;
  usdeBalanceUsd: number;
  susdeBalance: string;
  susdeBalanceRaw: bigint;
  susdeBalanceUsd: number;
  totalValueUsd: number;
  apy: number;
}

// ============================================
// TRANSACTION STEP TYPES
// ============================================

export type TransactionStepStatus = 'pending' | 'active' | 'success' | 'error' | 'skipped';

export interface TransactionStep {
  id: string;
  label: string;
  description?: string;
  status: TransactionStepStatus;
  txHash?: `0x${string}`;
  error?: string;
}

export interface MultiStepTransaction {
  steps: TransactionStep[];
  currentStepIndex: number;
  isComplete: boolean;
  hasError: boolean;
}

// ============================================
// NETWORK TYPES
// ============================================

export interface SupportedNetwork {
  chainId: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorerUrl: string;
  iconUrl?: string;
  isTestnet: boolean;
}

export interface WalletBalance {
  token: string;
  tokenAddress: Address;
  symbol: string;
  balance: string;
  balanceUsd: number;
  decimals: number;
}

// ============================================
// STRATEGY TYPES (Core Innovation)
// ============================================

export type TimeHorizon = 'long' | 'medium' | 'opportunistic';
export type RiskLevel = 'low' | 'medium' | 'high';
export type StrategyAction = 'stake' | 'supply' | 'borrow' | 'convert' | 'loop';

export interface StrategyStep {
  protocol: string;
  protocolLogo?: string;
  action: StrategyAction;
  tokenIn: string;
  tokenOut: string;
  apy: number;
  description?: string;
}

export interface StrategyRecommendation {
  id: string;
  name: string;
  description: string;
  timeHorizon: TimeHorizon;
  currentAPY: number;
  calculatedAt: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  flow: StrategyStep[];
  recommendedSince: string;
  lastReviewedAt: string;
  reviewNotes?: string;
  historicalAPY: { date: string; apy: number }[];
  tvlUsd: number;
  minDeposit: number;
  maxDeposit: number;
  inputToken: string;
  inputTokenAddress: Address;
  vaultAddress?: Address;
  featured?: boolean;
  weeksPick?: boolean;
}

export interface StrategyPosition {
  id: string;
  strategyId: string;
  strategyName: string;
  wallet: Address;
  prismWallet: Address;
  originalDeposit: number;
  currentValue: number;
  profit: number;
  runningAPY: number;
  healthFactor: number;
  createdAt: string;
  lastUpdated: string;
  flow: StrategyStep[];
  breakdown: StrategyBreakdown;
  status: 'active' | 'pending' | 'withdrawing' | 'closed';
}

export interface StrategyBreakdown {
  collateral: { token: string; amount: string; valueUsd: number }[];
  debt: { token: string; amount: string; valueUsd: number; interestRate: number }[];
  holdings: { token: string; amount: string; valueUsd: number; apy: number }[];
}

// ============================================
// SIMPLE ACTION TYPES
// ============================================

// Staking Position Types
export interface StakingPosition {
  id: string;
  protocol: string;
  protocolLogo: string;
  token: string;
  stakedToken: string;
  balance: string;
  balanceUsd: number;
  yieldEarned: number;
  currentAPY: number;
  status: 'active' | 'pending' | 'unstaking';
  depositedAt: string;
}

// Lending Position Types
export interface LendingSupplyPosition {
  id: string;
  protocol: string;
  protocolLogo: string;
  asset: string;
  amountSupplied: string;
  amountSuppliedUsd: number;
  apyEarning: number;
  isCollateral: boolean;
  healthFactor?: number;
  yieldEarned: number;
  depositedAt: string;
}

export interface LendingBorrowPosition {
  id: string;
  protocol: string;
  protocolLogo: string;
  asset: string;
  amountBorrowed: string;
  amountBorrowedUsd: number;
  interestRate: number;
  collateralBacking: { token: string; amount: string; valueUsd: number }[];
  liquidationPrice: number;
  healthFactor: number;
  borrowedAt: string;
}

// Stable Yield Position Types
export interface StableYieldPosition {
  id: string;
  protocol: string;
  protocolLogo: string;
  token: string;
  yieldToken: string;
  balance: string;
  balanceUsd: number;
  baseValueDeposited: number;
  yieldEarned: number;
  currentAPY: number;
  isCollateral: boolean;
  depositedAt: string;
}

// ============================================
// PORTFOLIO TYPES
// ============================================

export interface PortfolioSummary {
  totalValueUsd: number;
  yieldEarnedAllTime: number;
  yieldEarnedThisMonth: number;
  currentBlendedAPY: number;
  change24h: number;
  change24hPercent: number;
}

export interface AssetAllocation {
  staking: { valueUsd: number; percentage: number };
  lending: { valueUsd: number; percentage: number };
  stableYield: { valueUsd: number; percentage: number };
  strategies: { valueUsd: number; percentage: number };
}

// ============================================
// ACTIVITY FEED TYPES
// ============================================

export interface ActivityItem {
  id: string;
  type: 'deposit' | 'withdraw' | 'stake' | 'unstake' | 'supply' | 'borrow' | 'repay' | 'convert' | 'strategy_enter' | 'strategy_exit';
  timestamp: string;
  protocol: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  valueUsd: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
}

export interface DailyActivity {
  date: string;
  activities: ActivityItem[];
}

// ============================================
// WITHDRAWAL TYPES
// ============================================

export type WithdrawalType = 'full_exit' | 'partial_exit' | 'profits_only';

export interface WithdrawalPreview {
  type: WithdrawalType;
  currentPosition: {
    assets: { token: string; amount: string; valueUsd: number }[];
    liabilities: { token: string; amount: string; valueUsd: number }[];
    netEquity: number;
  };
  steps: WithdrawalStep[];
  outputToken: string;
  outputAmount: string;
  outputAmountUsd: number;
  fees: {
    swapFees: number;
    exitFees: number;
    gasFees: number;
    totalFees: number;
  };
  slippage: number;
  minOutput: string;
}

export interface WithdrawalStep {
  step: number;
  action: string;
  description: string;
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
}

// ============================================
// PROTOCOL DATA TYPES
// ============================================

export interface ProtocolRate {
  protocol: string;
  protocolLogo: string;
  asset: string;
  supplyAPY?: number;
  borrowAPY?: number;
  tvlUsd: number;
  utilizationRate?: number;
  lastUpdated: string;
}

export interface StakingRate {
  protocol: string;
  protocolLogo: string;
  token: string;
  stakedToken: string;
  apy: number;
  tvlUsd: number;
  lastUpdated: string;
}

export interface StableYieldRate {
  protocol: string;
  protocolLogo: string;
  token: string;
  yieldToken: string;
  apy: number;
  tvlUsd: number;
  risk: RiskLevel;
  lastUpdated: string;
}

// ============================================
// YIELD/OPPORTUNITY TYPES (Legacy/Updated)
// ============================================

export interface Yield {
  id: string;
  protocol: string;
  chain: string;
  chainId: number;
  token: string;
  tokenAddress: Address;
  apy: number;
  apyBase: number;
  apyReward: number;
  tvlUsd: number;
  category: 'lending' | 'staking' | 'liquid-staking' | 'lp' | 'yield';
  risk: 1 | 2 | 3 | 4 | 5;
  rewardTokens?: string[];
  poolId?: string;
  url?: string;
}

// Position Types
export interface Position {
  id: string;
  wallet: Address;
  protocol: string;
  chain: string;
  chainId: number;
  token: string;
  tokenAddress: Address;
  amount: string;
  amountUsd: number;
  apy: number;
  depositedAt: string;
  depositTxHash: string;
  status: 'active' | 'pending' | 'withdrawn' | 'failed';
  verified: boolean;
  earnings?: number;
}

// Points Types
export interface PointsBalance {
  address: string;
  totalPoints: number;
  depositsPoints: number;
  stakingPoints: number;
  referralPoints: number;
  bonusPoints: number;
  multiplier: number;
  season: number;
  seasonStart: string;
  seasonEnd: string;
}

export interface PointsEntry {
  date: string;
  points: number;
  source: 'deposit' | 'referral' | 'bonus';
  positionId?: string;
}

export interface LeaderboardEntry {
  address: string;
  totalPoints: number;
  totalDeposits: number;
  rank: number;
}

// Alert Types
export interface Alert {
  id: string;
  type: 'better_rate' | 'risk_change' | 'protocol_update' | 'position_update';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  read: boolean;
  data?: {
    protocol?: string;
    currentApy?: number;
    betterApy?: number;
    positionId?: string;
  };
}

// User Types
export interface User {
  address: Address;
  createdAt: string;
  lastLoginAt: string;
  referralCode?: string;
  referredBy?: Address;
  tier: 'free' | 'pro' | 'whale';
}

// Protocol Types
export interface Protocol {
  id: string;
  name: string;
  logo: string;
  category: string;
  chains: number[];
  tvl: number;
  audited: boolean;
  website: string;
}

// Transaction Types
export interface TransactionHistory {
  id: string;
  wallet: Address;
  type: 'deposit' | 'withdraw' | 'approve';
  protocol: string;
  chain: string;
  token: string;
  amount: string;
  amountUsd: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  confirmedAt?: string;
}

// Filter Types
export interface YieldFilters {
  category?: string;
  chain?: string;
  minApy?: number;
  maxRisk?: number;
  sortBy?: 'apy' | 'tvl' | 'risk';
  sortOrder?: 'asc' | 'desc';
}

// Sankey Types for Dashboard
export interface SankeyNode {
  id: string;
  label: string;
  type: 'source' | 'protocol' | 'category' | 'outcome';
  value: number;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface CashflowData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
