/**
 * Staking Types for PRISM ETH Staking Integration
 */

import type { Address, Hex } from 'viem';

// ============================================
// STAKING OPTIONS
// ============================================

export type StakingType =
  | 'liquid-staking'
  | 'liquid-restaking'
  | 'supercharged-lst'
  | 'lending';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface StakingOption {
  id: string;
  name: string;
  protocol: string;
  description: string;
  // Token info
  inputToken: TokenInfo;
  outputToken: TokenInfo;
  // Yields
  apy: number;
  apyBreakdown?: APYBreakdown;
  // Risk
  risk: RiskLevel;
  riskFactors: string[];
  // Limits
  minDeposit?: string;
  maxDeposit?: string;
  // Metadata
  type: StakingType;
  tvl: number;
  lastUpdated: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  logoUrl?: string;
}

export interface APYBreakdown {
  base: number; // Base staking APY
  rewards?: number; // Additional reward tokens
  boost?: number; // Boost from governance
  total: number;
}

// ============================================
// TRANSACTION FLOW
// ============================================

export type TransactionStepStatus =
  | 'pending'
  | 'ready'
  | 'signing'
  | 'confirming'
  | 'completed'
  | 'failed';

export interface TransactionStep {
  id: string;
  name: string;
  description: string;
  status: TransactionStepStatus;
  // Transaction data (populated when ready)
  to?: Address;
  data?: Hex;
  value?: bigint;
  // Result (populated when completed)
  txHash?: Hex;
  error?: string;
}

export interface TransactionFlow {
  id: string;
  type: 'stake' | 'unstake' | 'supply' | 'withdraw' | 'loop';
  protocol: string;
  steps: TransactionStep[];
  currentStep: number;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  // Amounts
  inputAmount: string;
  inputToken: TokenInfo;
  expectedOutput?: string;
  outputToken?: TokenInfo;
  // Timestamps
  startedAt?: string;
  completedAt?: string;
}

// ============================================
// POSITIONS
// ============================================

export interface StakingPosition {
  id: string;
  protocol: string;
  type: StakingType;
  // Token info
  token: TokenInfo;
  balance: string;
  balanceUsd: number;
  // Yield info
  apy: number;
  earnedTotal: string;
  earnedTotalUsd: number;
  // Entry info
  entryDate: string;
  entryPrice: number;
  // For lending positions
  healthFactor?: number;
  collateralValue?: number;
  debtValue?: number;
}

export interface AavePosition extends StakingPosition {
  supplies: AaveSupply[];
  borrows: AaveBorrow[];
  healthFactor: number;
  availableBorrows: number;
  ltv: number;
  liquidationThreshold: number;
}

export interface AaveSupply {
  token: TokenInfo;
  balance: string;
  balanceUsd: number;
  apy: number;
  isCollateral: boolean;
}

export interface AaveBorrow {
  token: TokenInfo;
  balance: string;
  balanceUsd: number;
  apy: number; // Borrow APY (cost)
  rateMode: 'variable' | 'stable';
}

// ============================================
// QUOTES
// ============================================

export interface StakeQuote {
  inputToken: Address;
  outputToken: Address;
  inputAmount: bigint;
  expectedOutput: bigint;
  minOutput: bigint;
  priceImpact: number;
  route: string[];
  estimatedGas: bigint;
  estimatedGasUsd: number;
  slippage: number;
}

export interface SwapRoute {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
}

// ============================================
// DATA CACHE
// ============================================

export interface CachedYieldData {
  options: StakingOption[];
  lastUpdated: string;
  expiresAt: string;
  source: 'defillama' | 'onchain' | 'cache';
}

export interface PriceData {
  token: Address;
  priceUsd: number;
  priceEth?: number;
  change24h?: number;
  lastUpdated: string;
}

// ============================================
// PROTOCOL ADAPTER INTERFACE
// ============================================

export interface ProtocolAdapter {
  name: string;
  type: StakingType;

  // Quote operations
  getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote>;
  getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote>;

  // Build transaction flow
  buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow>;
  buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow>;

  // Position tracking
  getPosition(user: Address): Promise<StakingPosition | null>;

  // APY data
  getAPY(): Promise<number>;
}

// ============================================
// RISK MANAGEMENT
// ============================================

export interface RiskAssessment {
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  warnings: string[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  level: RiskLevel;
  description: string;
  mitigation?: string;
}

export interface HealthFactorAlert {
  type: 'warning' | 'danger' | 'critical';
  healthFactor: number;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

// ============================================
// API RESPONSES
// ============================================

export interface YieldsAPIResponse {
  success: boolean;
  data: StakingOption[];
  lastUpdated: string;
  source: string;
}

export interface PositionsAPIResponse {
  success: boolean;
  data: StakingPosition[];
  totalValueUsd: number;
  totalEarnedUsd: number;
}

export interface PricesAPIResponse {
  success: boolean;
  data: Record<string, PriceData>;
  lastUpdated: string;
}
