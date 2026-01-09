/**
 * PRISM Lending Types
 *
 * Unified type definitions for multi-protocol lending integration.
 * Supports: Morpho Blue, Aave V3, Compound III, Moonwell
 */

import { Address } from 'viem';

// =============================================================================
// ENUMS
// =============================================================================

export type LendingProtocol = 'morpho' | 'aave' | 'compound' | 'moonwell';

export type LendingAction = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'enable_collateral';

export type PositionStatus = 'healthy' | 'warning' | 'danger' | 'liquidatable';

export type RateType = 'variable' | 'stable';

export type AssetCategory = 'stablecoin' | 'eth' | 'lsd' | 'wrapped' | 'other';

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Represents a lending market across any protocol
 */
export interface LendingMarket {
  // Identifiers
  id: string;                          // Unique ID (protocol-specific)
  protocol: LendingProtocol;
  chainId: number;

  // Asset info
  asset: Address;                      // Underlying asset address
  assetSymbol: string;
  assetName: string;
  assetDecimals: number;
  assetCategory: AssetCategory;
  assetLogoUrl?: string;

  // For borrow markets - collateral info (Morpho isolated markets)
  collateralAsset?: Address;
  collateralSymbol?: string;
  collateralDecimals?: number;

  // Rates (as decimals, e.g., 0.05 = 5%)
  supplyAPY: number;
  borrowAPY: number;
  rewardAPY?: number;                  // Additional token rewards
  netSupplyAPY: number;                // supply + rewards
  netBorrowAPY: number;                // borrow - rewards

  // Liquidity
  totalSupply: bigint;                 // Total supplied in asset units
  totalSupplyUSD: number;
  totalBorrow: bigint;
  totalBorrowUSD: number;
  availableLiquidity: bigint;
  availableLiquidityUSD: number;
  utilization: number;                 // 0-1

  // Risk parameters
  ltv: number;                         // Loan-to-value (e.g., 0.8 = 80%)
  liquidationThreshold: number;        // e.g., 0.825 = 82.5%
  liquidationPenalty: number;          // e.g., 0.05 = 5%

  // Caps
  supplyCap?: bigint;
  borrowCap?: bigint;

  // Protocol-specific
  aTokenAddress?: Address;             // Aave
  variableDebtTokenAddress?: Address;  // Aave
  mTokenAddress?: Address;             // Moonwell
  marketParams?: MorphoMarketParams;   // Morpho
  morphoMarketParams?: MorphoMarketParams; // Morpho (alias)
  morphoFee?: number;                  // Morpho fee rate
  collateralAssets?: Address[];        // Compound III (multiple collaterals)

  // Metadata
  isActive: boolean;
  isFrozen: boolean;
  isPaused: boolean;
  canSupply: boolean;
  canBorrow: boolean;
  canUseAsCollateral: boolean;

  // Timestamps
  lastUpdated: number;
}

/**
 * Morpho-specific market parameters
 */
export interface MorphoMarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

/**
 * User's position in a lending market
 */
export interface LendingPosition {
  // Identifiers
  id: string;
  protocol: LendingProtocol;
  marketId: string;
  userAddress: Address;
  chainId: number;

  // Asset info
  asset: Address;
  assetSymbol: string;
  assetDecimals: number;

  // Supply position
  supplyBalance: bigint;               // In asset units
  supplyBalanceUSD: number;
  supplyShares?: bigint;               // Protocol-specific (Morpho, Aave)

  // Borrow position
  borrowBalance: bigint;
  borrowBalanceUSD: number;
  borrowShares?: bigint;

  // Collateral (for Morpho isolated markets)
  collateralBalance?: bigint;
  collateralBalanceUSD?: number;

  // Rates being earned/paid
  currentSupplyAPY: number;
  currentBorrowAPY: number;

  // Collateral status
  isCollateralEnabled: boolean;

  // Health (for positions with borrows)
  healthFactor?: number;
  liquidationPrice?: number;           // Price at which position liquidates

  // Profit/Loss
  interestEarned?: bigint;
  interestPaid?: bigint;

  // Timestamps
  enteredAt?: number;
  lastUpdated: number;
}

/**
 * Aggregated user position across all protocols
 */
export interface AggregatedPosition {
  userAddress: Address;
  chainId: number;

  // Totals
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  totalCollateralUSD: number;
  netWorthUSD: number;

  // Aggregate health
  weightedHealthFactor: number;        // Weighted by position size
  lowestHealthFactor: number;          // Most at-risk position
  positionWithLowestHF?: string;       // Market ID

  // By protocol
  positionsByProtocol: Record<LendingProtocol, LendingPosition[]>;

  // All positions flat
  positions: LendingPosition[];

  // Status
  overallStatus: PositionStatus;

  lastUpdated: number;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Parameters for a lending action
 */
export interface LendingActionParams {
  protocol: LendingProtocol;
  action: LendingAction;
  marketId: string;
  asset: Address;
  amount: bigint;

  // For borrows
  collateralAsset?: Address;

  // Options
  useMaxAmount?: boolean;              // Withdraw/repay max
  enableAsCollateral?: boolean;        // For supplies

  // Routing
  onBehalfOf?: Address;                // Different recipient
  receiver?: Address;                  // Where to send withdrawn/borrowed
}

/**
 * Result of building a lending transaction
 */
export interface LendingTransactionBuild {
  // Calls to execute
  calls: TransactionCall[];

  // Estimates
  estimatedGas: bigint;
  estimatedGasUSD: number;

  // Simulation results
  simulationSuccess: boolean;
  simulationError?: string;

  // Impact preview
  preview: ActionPreview;
}

/**
 * Single transaction call
 */
export interface TransactionCall {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  description?: string;                // Human readable
}

/**
 * Preview of what an action will do
 */
export interface ActionPreview {
  // Balances after
  supplyBalanceAfter: bigint;
  borrowBalanceAfter: bigint;

  // Health impact
  healthFactorBefore?: number;
  healthFactorAfter?: number;
  healthFactorChange?: number;

  // Rate info
  currentAPY: number;

  // Warnings
  warnings: ActionWarning[];

  // Blocking errors
  errors: ActionError[];
}

export interface ActionWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ActionError {
  code: string;
  message: string;
}

// =============================================================================
// SMART ROUTING TYPES
// =============================================================================

/**
 * Suggestion from smart router
 */
export interface RoutingSuggestion {
  // Recommended protocol
  recommended: LendingProtocol;
  recommendedMarketId: string;

  // Why it's recommended
  reason: RoutingReason;
  reasonDescription?: string;
  reasonDetails?: string;          // Human-readable explanation

  // Projected outcome
  projectedAPY?: number;

  // Comparison with alternatives
  alternatives: RoutingAlternative[];

  // Metrics used for decision
  metrics?: RoutingMetrics;
}

export type RoutingReason =
  | 'highest_apy'
  | 'lowest_rate'
  | 'highest_supply_apy'
  | 'lowest_borrow_apy'
  | 'best_liquidity'
  | 'lowest_risk'
  | 'existing_position'
  | 'gas_efficiency';

export interface RoutingAlternative {
  protocol: LendingProtocol;
  marketId: string;

  // APY value
  apy?: number;

  // How it compares
  apyDifference?: number;               // Negative = worse
  liquidityDifference?: number;

  // Why not recommended
  reason: string;
  disadvantage?: string;
}

export interface RoutingMetrics {
  supplyAPYs: Record<LendingProtocol, number>;
  borrowAPYs: Record<LendingProtocol, number>;
  availableLiquidity: Record<LendingProtocol, number>;
  existingPositions: LendingProtocol[];
}

// =============================================================================
// HEALTH & RISK TYPES
// =============================================================================

/**
 * Health factor analysis
 */
export interface HealthAnalysis {
  healthFactor: number;
  status: PositionStatus;

  // Breakdown
  totalCollateralUSD: number;
  totalBorrowUSD: number;
  liquidationThreshold: number;

  // Risk metrics
  borrowCapacityUSD: number;           // How much more can borrow
  borrowCapacityUsed: number;          // 0-1, how much capacity used

  // Liquidation info
  liquidationPrice?: number;           // For single-collateral positions
  bufferToLiquidation: number;         // % price can drop before liquidation

  // Recommendations
  recommendations: HealthRecommendation[];
}

export interface HealthRecommendation {
  type: 'add_collateral' | 'repay_debt' | 'reduce_exposure';
  description: string;
  impactOnHF: number;                  // How much HF would improve
  suggestedAmount?: bigint;
  suggestedAsset?: Address;
}

/**
 * Alert for position health
 */
export interface HealthAlert {
  id: string;
  positionId: string;
  protocol: LendingProtocol;

  type: 'health_warning' | 'health_danger' | 'liquidation_imminent' | 'rate_change';
  severity: 'info' | 'warning' | 'critical';

  title: string;
  message: string;

  // Current state
  currentHealthFactor?: number;
  currentRate?: number;

  // Suggested actions
  suggestedActions: SuggestedAction[];

  // Timing
  createdAt: number;
  expiresAt?: number;
  dismissed: boolean;
}

export interface SuggestedAction {
  label: string;
  action: LendingAction;
  params: Partial<LendingActionParams>;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Response from fetching markets
 */
export interface MarketsResponse {
  markets: LendingMarket[];
  totalCount: number;

  // Aggregates
  totalSupplyUSD: number;
  totalBorrowUSD: number;

  // By protocol
  byProtocol: Record<LendingProtocol, {
    count: number;
    totalSupplyUSD: number;
    totalBorrowUSD: number;
  }>;

  lastUpdated: number;
}

/**
 * Response from fetching user positions
 */
export interface PositionsResponse {
  positions: LendingPosition[];
  aggregated: AggregatedPosition;
  alerts: HealthAlert[];
  lastUpdated: number;
}

// =============================================================================
// FILTER & SORT TYPES
// =============================================================================

export interface MarketFilters {
  protocols?: LendingProtocol[];
  assets?: Address[];
  assetCategories?: AssetCategory[];
  minSupplyAPY?: number;
  maxBorrowAPY?: number;
  minLiquidity?: number;
  canSupply?: boolean;
  canBorrow?: boolean;
  searchQuery?: string;
}

export type MarketSortField =
  | 'supplyAPY'
  | 'borrowAPY'
  | 'totalSupply'
  | 'totalBorrow'
  | 'utilization'
  | 'liquidity';

export interface MarketSort {
  field: MarketSortField;
  direction: 'asc' | 'desc';
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Interface that all protocol adapters must implement
 */
export interface LendingAdapter {
  protocol: LendingProtocol;
  chainId: number;

  // Data fetching
  getMarkets(): Promise<LendingMarket[]>;
  getMarket(marketId: string): Promise<LendingMarket | null>;
  getUserPositions(userAddress: Address): Promise<LendingPosition[]>;

  // Rate calculations
  getSupplyRate(marketId: string): Promise<number>;
  getBorrowRate(marketId: string): Promise<number>;

  // Transaction building
  buildSupply(params: SupplyParams): Promise<TransactionCall[]>;
  buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]>;
  buildBorrow(params: BorrowParams): Promise<TransactionCall[]>;
  buildRepay(params: RepayParams): Promise<TransactionCall[]>;
  buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]>;

  // Validation
  validateSupply(params: SupplyParams): Promise<ValidationResult>;
  validateWithdraw(params: WithdrawParams): Promise<ValidationResult>;
  validateBorrow(params: BorrowParams): Promise<ValidationResult>;
  validateRepay(params: RepayParams): Promise<ValidationResult>;

  // Health calculations
  calculateHealthFactor(userAddress: Address): Promise<number>;
  simulateHealthFactor(userAddress: Address, action: LendingActionParams): Promise<number>;
}

// Adapter-specific params
export interface SupplyParams {
  marketId: string;
  asset: Address;
  amount: bigint;
  userAddress: Address;
  enableAsCollateral?: boolean;
}

export interface WithdrawParams {
  marketId: string;
  asset: Address;
  amount: bigint;
  userAddress: Address;
  maxWithdraw?: boolean;
}

export interface BorrowParams {
  marketId: string;
  asset: Address;
  amount: bigint;
  userAddress: Address;
  rateType?: RateType;
}

export interface RepayParams {
  marketId: string;
  asset: Address;
  amount: bigint;
  userAddress: Address;
  maxRepay?: boolean;
}

export interface EnableCollateralParams {
  marketId: string;
  asset: Address;
  userAddress: Address;
  enable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ActionError[];
  warnings: ActionWarning[];

  // For invalid results
  insufficientBalance?: boolean;
  insufficientLiquidity?: boolean;
  wouldCauseLiquidation?: boolean;
  exceedsCap?: boolean;
}

// =============================================================================
// EVENT TYPES (for real-time updates)
// =============================================================================

export interface LendingEvent {
  type: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation';
  protocol: LendingProtocol;
  marketId: string;
  userAddress: Address;
  asset: Address;
  amount: bigint;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const HEALTH_THRESHOLDS = {
  SAFE: 2.0,
  WARNING: 1.5,
  DANGER: 1.1,
  LIQUIDATABLE: 1.0,
} as const;

export const PROTOCOL_NAMES: Record<LendingProtocol, string> = {
  morpho: 'Morpho Blue',
  aave: 'Aave V3',
  compound: 'Compound III',
  moonwell: 'Moonwell',
};

export const PROTOCOL_COLORS: Record<LendingProtocol, string> = {
  morpho: '#2470FF',
  aave: '#B6509E',
  compound: '#00D395',
  moonwell: '#5B5BD6',
};

export const PROTOCOL_LOGOS: Record<LendingProtocol, string> = {
  morpho: '/protocols/morpho.svg',
  aave: '/protocols/aave.svg',
  compound: '/protocols/compound.svg',
  moonwell: '/protocols/moonwell.svg',
};
