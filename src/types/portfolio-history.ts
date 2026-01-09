/**
 * Portfolio History Types
 *
 * Type definitions for historical portfolio data used in the dashboard chart.
 */

// =============================================================================
// TIME RANGE
// =============================================================================

export type TimeRange = '7d' | '30d' | '90d';

export const TIME_RANGE_CONFIG = {
  '7d': {
    label: 'Days',
    days: 7,
    intervalMs: 60 * 60 * 1000, // 1 hour
    dataPoints: 168, // 7 * 24
  },
  '30d': {
    label: 'Weeks',
    days: 30,
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    dataPoints: 30,
  },
  '90d': {
    label: 'Months',
    days: 90,
    intervalMs: 24 * 60 * 60 * 1000, // 1 day
    dataPoints: 90,
  },
} as const;

// =============================================================================
// FEATURE TYPES
// =============================================================================

export type FeatureType = 'staking' | 'lending' | 'stableYield' | 'strategies';

export interface FeatureConfig {
  key: FeatureType;
  name: string;
  color: string;
  description: string;
}

export const FEATURE_CONFIGS: Record<FeatureType, FeatureConfig> = {
  staking: {
    key: 'staking',
    name: 'Staking',
    color: '#22C55E', // Green
    description: 'Liquid staking positions (wstETH, cbETH, weETH)',
  },
  lending: {
    key: 'lending',
    name: 'Lending',
    color: '#3B82F6', // Blue
    description: 'Lending/borrowing positions (Aave, Morpho)',
  },
  stableYield: {
    key: 'stableYield',
    name: 'Stable Yield',
    color: '#F59E0B', // Yellow/Amber
    description: 'Stablecoin yield positions (USDC, DAI)',
  },
  strategies: {
    key: 'strategies',
    name: 'Strategies',
    color: '#8B5CF6', // Purple
    description: 'Active yield strategies',
  },
};

// =============================================================================
// PROTOCOL BREAKDOWN
// =============================================================================

export interface ProtocolBreakdown {
  /** Protocol name (e.g., "Lido", "Aave V3", "Morpho") */
  protocol: string;
  /** USD value in this protocol */
  value: number;
  /** Current APY at this point (optional) */
  apy?: number;
  /** Token symbol (optional, e.g., "wstETH") */
  token?: string;
}

// =============================================================================
// DATA POINT TYPES
// =============================================================================

export interface FeatureDataPoint {
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Total USD value for this feature */
  value: number;
  /** Protocol breakdown within this feature */
  breakdown: ProtocolBreakdown[];
}

export interface PortfolioHistoryDataPoint {
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Feature values for chart lines */
  staking: number;
  lending: number;
  stableYield: number;
  strategies: number;
  /** Total portfolio value */
  total: number;
  /** Detailed breakdown for tooltip */
  breakdown: {
    staking: ProtocolBreakdown[];
    lending: ProtocolBreakdown[];
    stableYield: ProtocolBreakdown[];
    strategies: ProtocolBreakdown[];
  };
}

// =============================================================================
// SNAPSHOT TYPES (For localStorage persistence)
// =============================================================================

export interface PortfolioSnapshot {
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Wallet address */
  walletAddress: string;
  /** Feature totals */
  staking: number;
  lending: number;
  stableYield: number;
  strategies: number;
  /** Protocol breakdowns */
  breakdowns: {
    staking: ProtocolBreakdown[];
    lending: ProtocolBreakdown[];
    stableYield: ProtocolBreakdown[];
    strategies: ProtocolBreakdown[];
  };
}

export interface StoredPortfolioHistory {
  /** Schema version for migrations */
  version: 1;
  /** Wallet address */
  walletAddress: string;
  /** Array of snapshots */
  snapshots: PortfolioSnapshot[];
  /** Last update timestamp */
  lastUpdated: number;
}

// =============================================================================
// CURRENT POSITIONS (Input to history generator)
// =============================================================================

export interface CurrentPositionsSummary {
  staking: {
    total: number;
    breakdown: ProtocolBreakdown[];
  };
  lending: {
    total: number;
    breakdown: ProtocolBreakdown[];
  };
  stableYield: {
    total: number;
    breakdown: ProtocolBreakdown[];
  };
  strategies: {
    total: number;
    breakdown: ProtocolBreakdown[];
  };
}

// =============================================================================
// CHART DATA (Output for Recharts)
// =============================================================================

export interface ChartDataPoint {
  /** Formatted date string for X-axis */
  date: string;
  /** Unix timestamp for sorting/tooltips */
  timestamp: number;
  /** Feature values */
  staking: number;
  lending: number;
  stableYield: number;
  strategies: number;
  /** Breakdowns for tooltip */
  stakingBreakdown: ProtocolBreakdown[];
  lendingBreakdown: ProtocolBreakdown[];
  stableYieldBreakdown: ProtocolBreakdown[];
  strategiesBreakdown: ProtocolBreakdown[];
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UsePortfolioHistoryReturn {
  /** Chart-ready data points */
  data: ChartDataPoint[];
  /** Currently selected time range */
  timeRange: TimeRange;
  /** Set time range */
  setTimeRange: (range: TimeRange) => void;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is simulated (vs real historical) */
  isSimulated: boolean;
  /** Refetch data */
  refetch: () => void;
}
