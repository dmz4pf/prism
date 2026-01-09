/**
 * Portfolio History Service
 *
 * Generates historical portfolio data for the dashboard chart.
 * Uses a hybrid approach:
 * 1. Simulated history based on current positions (immediate value)
 * 2. localStorage persistence for real snapshots (accumulates over time)
 */

import { format, subDays, startOfHour, startOfDay, eachHourOfInterval, eachDayOfInterval } from 'date-fns';
import type {
  TimeRange,
  TIME_RANGE_CONFIG,
  PortfolioHistoryDataPoint,
  PortfolioSnapshot,
  StoredPortfolioHistory,
  CurrentPositionsSummary,
  ProtocolBreakdown,
  ChartDataPoint,
} from '@/types/portfolio-history';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY_PREFIX = 'prism_portfolio_history_';
const STORAGE_VERSION = 1;
const MAX_SNAPSHOTS = 2160; // 90 days of hourly data
const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// =============================================================================
// SEEDED RANDOM (For deterministic simulated data)
// =============================================================================

/**
 * Generate deterministic "random" number from seed
 * Same seed always produces same sequence
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 1000) / 1000;
  };
}

// =============================================================================
// SIMULATED HISTORY GENERATION
// =============================================================================

/**
 * Generate simulated historical data based on current positions
 * Uses APY-based growth simulation with variance
 */
export function generateSimulatedHistory(
  currentPositions: CurrentPositionsSummary,
  timeRange: TimeRange,
  walletAddress: string
): PortfolioHistoryDataPoint[] {
  const config = getTimeRangeConfig(timeRange);
  const now = Date.now();
  const startTime = now - config.days * 24 * 60 * 60 * 1000;

  // Generate time points
  const timePoints = generateTimePoints(startTime, now, timeRange);

  // Create seeded random generator for this wallet
  const random = seededRandom(`${walletAddress}-${timeRange}`);

  // Calculate current totals
  let currentTotals = {
    staking: currentPositions.staking.total,
    lending: currentPositions.lending.total,
    stableYield: currentPositions.stableYield.total,
    strategies: currentPositions.strategies.total,
  };

  // If all positions are 0, generate demo data for visualization
  const totalValue = currentTotals.staking + currentTotals.lending + currentTotals.stableYield + currentTotals.strategies;
  if (totalValue === 0) {
    console.log('[PortfolioHistory] No positions, generating demo data');
    currentTotals = {
      staking: 2000,
      lending: 1500,
      stableYield: 1000,
      strategies: 800,
    };
  }

  // Average APYs for simulation (realistic values)
  const apyRates = {
    staking: 0.035, // 3.5% average
    lending: 0.045, // 4.5% average
    stableYield: 0.055, // 5.5% average
    strategies: 0.08, // 8% average
  };

  // Work backwards from current values
  const dataPoints: PortfolioHistoryDataPoint[] = [];

  for (let i = 0; i < timePoints.length; i++) {
    const timestamp = timePoints[i];
    const daysFromNow = (now - timestamp) / (24 * 60 * 60 * 1000);

    // Calculate historical value (reverse APY growth with variance)
    const getHistoricalValue = (current: number, apy: number): number => {
      if (current === 0) return 0;

      // Daily growth rate
      const dailyRate = apy / 365;

      // Add some variance (±0.5% daily)
      const variance = (random() - 0.5) * 0.01;

      // Reverse the growth
      const growthFactor = Math.pow(1 + dailyRate + variance, -daysFromNow);
      return current * growthFactor;
    };

    const stakingValue = getHistoricalValue(currentTotals.staking, apyRates.staking);
    const lendingValue = getHistoricalValue(currentTotals.lending, apyRates.lending);
    const stableYieldValue = getHistoricalValue(currentTotals.stableYield, apyRates.stableYield);
    const strategiesValue = getHistoricalValue(currentTotals.strategies, apyRates.strategies);

    // Scale breakdowns proportionally
    const scaleBreakdown = (
      breakdown: ProtocolBreakdown[],
      current: number,
      historical: number
    ): ProtocolBreakdown[] => {
      if (current === 0) return breakdown.map(b => ({ ...b, value: 0 }));
      const ratio = historical / current;
      return breakdown.map(b => ({
        ...b,
        value: b.value * ratio,
      }));
    };

    dataPoints.push({
      timestamp,
      staking: stakingValue,
      lending: lendingValue,
      stableYield: stableYieldValue,
      strategies: strategiesValue,
      total: stakingValue + lendingValue + stableYieldValue + strategiesValue,
      breakdown: {
        staking: scaleBreakdown(currentPositions.staking.breakdown, currentTotals.staking, stakingValue),
        lending: scaleBreakdown(currentPositions.lending.breakdown, currentTotals.lending, lendingValue),
        stableYield: scaleBreakdown(currentPositions.stableYield.breakdown, currentTotals.stableYield, stableYieldValue),
        strategies: scaleBreakdown(currentPositions.strategies.breakdown, currentTotals.strategies, strategiesValue),
      },
    });
  }

  return dataPoints;
}

/**
 * Generate time points based on time range
 */
function generateTimePoints(startTime: number, endTime: number, timeRange: TimeRange): number[] {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (timeRange === '7d') {
    // Hourly intervals for 7 days
    const hours = eachHourOfInterval({ start: startOfHour(start), end: startOfHour(end) });
    return hours.map(d => d.getTime());
  } else {
    // Daily intervals for 30d and 90d
    const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
    return days.map(d => d.getTime());
  }
}

/**
 * Get time range configuration
 */
function getTimeRangeConfig(timeRange: TimeRange) {
  const configs = {
    '7d': { days: 7, intervalMs: 60 * 60 * 1000, dataPoints: 168 },
    '30d': { days: 30, intervalMs: 24 * 60 * 60 * 1000, dataPoints: 30 },
    '90d': { days: 90, intervalMs: 24 * 60 * 60 * 1000, dataPoints: 90 },
  };
  return configs[timeRange];
}

// =============================================================================
// LOCAL STORAGE PERSISTENCE
// =============================================================================

/**
 * Get storage key for wallet
 */
function getStorageKey(walletAddress: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
}

/**
 * Load stored history from localStorage
 */
export function loadStoredHistory(walletAddress: string): StoredPortfolioHistory | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredPortfolioHistory;

    // Version check for future migrations
    if (data.version !== STORAGE_VERSION) {
      console.warn('[PortfolioHistory] Stored data version mismatch, clearing');
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[PortfolioHistory] Error loading stored history:', error);
    return null;
  }
}

/**
 * Save snapshot to localStorage
 */
export function saveSnapshot(
  walletAddress: string,
  snapshot: PortfolioSnapshot
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(walletAddress);
    let stored = loadStoredHistory(walletAddress);

    if (!stored) {
      stored = {
        version: STORAGE_VERSION,
        walletAddress: walletAddress.toLowerCase(),
        snapshots: [],
        lastUpdated: Date.now(),
      };
    }

    // Check if we should save (at least 1 hour since last)
    const lastSnapshot = stored.snapshots[stored.snapshots.length - 1];
    if (lastSnapshot && (Date.now() - lastSnapshot.timestamp) < SNAPSHOT_INTERVAL_MS) {
      return; // Too soon
    }

    // Add new snapshot
    stored.snapshots.push(snapshot);

    // Trim to max snapshots
    if (stored.snapshots.length > MAX_SNAPSHOTS) {
      stored.snapshots = stored.snapshots.slice(-MAX_SNAPSHOTS);
    }

    stored.lastUpdated = Date.now();

    localStorage.setItem(key, JSON.stringify(stored));
  } catch (error) {
    console.error('[PortfolioHistory] Error saving snapshot:', error);
  }
}

/**
 * Create snapshot from current positions
 */
export function createSnapshot(
  walletAddress: string,
  positions: CurrentPositionsSummary
): PortfolioSnapshot {
  return {
    timestamp: Date.now(),
    walletAddress: walletAddress.toLowerCase(),
    staking: positions.staking.total,
    lending: positions.lending.total,
    stableYield: positions.stableYield.total,
    strategies: positions.strategies.total,
    breakdowns: {
      staking: positions.staking.breakdown,
      lending: positions.lending.breakdown,
      stableYield: positions.stableYield.breakdown,
      strategies: positions.strategies.breakdown,
    },
  };
}

// =============================================================================
// MERGE HISTORIES
// =============================================================================

/**
 * Merge simulated history with stored real snapshots
 * Real data takes priority where available
 */
export function mergeHistories(
  simulated: PortfolioHistoryDataPoint[],
  stored: StoredPortfolioHistory | null,
  timeRange: TimeRange
): PortfolioHistoryDataPoint[] {
  if (!stored || stored.snapshots.length === 0) {
    return simulated;
  }

  const config = getTimeRangeConfig(timeRange);
  const cutoffTime = Date.now() - config.days * 24 * 60 * 60 * 1000;

  // Filter stored snapshots to time range
  const relevantSnapshots = stored.snapshots.filter(s => s.timestamp >= cutoffTime);

  if (relevantSnapshots.length === 0) {
    return simulated;
  }

  // Convert stored snapshots to data points
  const storedDataPoints = new Map<number, PortfolioHistoryDataPoint>();
  for (const snapshot of relevantSnapshots) {
    // Round to nearest hour or day
    const roundedTimestamp = timeRange === '7d'
      ? startOfHour(new Date(snapshot.timestamp)).getTime()
      : startOfDay(new Date(snapshot.timestamp)).getTime();

    storedDataPoints.set(roundedTimestamp, {
      timestamp: roundedTimestamp,
      staking: snapshot.staking,
      lending: snapshot.lending,
      stableYield: snapshot.stableYield,
      strategies: snapshot.strategies,
      total: snapshot.staking + snapshot.lending + snapshot.stableYield + snapshot.strategies,
      breakdown: snapshot.breakdowns,
    });
  }

  // Merge: use stored where available, otherwise simulated
  const merged: PortfolioHistoryDataPoint[] = simulated.map(point => {
    const stored = storedDataPoints.get(point.timestamp);
    return stored || point;
  });

  return merged;
}

// =============================================================================
// CHART DATA FORMATTING
// =============================================================================

/**
 * Format data points for Recharts consumption
 */
export function formatForChart(
  dataPoints: PortfolioHistoryDataPoint[],
  timeRange: TimeRange
): ChartDataPoint[] {
  const dateFormat = timeRange === '7d' ? 'MMM d, ha' : 'MMM d';

  return dataPoints.map(point => ({
    date: format(new Date(point.timestamp), dateFormat),
    timestamp: point.timestamp,
    staking: Math.round(point.staking * 100) / 100,
    lending: Math.round(point.lending * 100) / 100,
    stableYield: Math.round(point.stableYield * 100) / 100,
    strategies: Math.round(point.strategies * 100) / 100,
    stakingBreakdown: point.breakdown.staking,
    lendingBreakdown: point.breakdown.lending,
    stableYieldBreakdown: point.breakdown.stableYield,
    strategiesBreakdown: point.breakdown.strategies,
  }));
}

// =============================================================================
// MAIN EXPORT FUNCTIONS
// =============================================================================

/**
 * Get complete portfolio history for chart
 */
export function getPortfolioHistory(
  currentPositions: CurrentPositionsSummary,
  timeRange: TimeRange,
  walletAddress: string
): { data: ChartDataPoint[]; isSimulated: boolean } {
  // Generate simulated history
  const simulated = generateSimulatedHistory(currentPositions, timeRange, walletAddress);

  // Load stored history
  const stored = loadStoredHistory(walletAddress);

  // Merge histories
  const merged = mergeHistories(simulated, stored, timeRange);

  // Format for chart
  const chartData = formatForChart(merged, timeRange);

  // Determine if primarily simulated
  const isSimulated = !stored || stored.snapshots.length < 10;

  return { data: chartData, isSimulated };
}

/**
 * Record current positions as a snapshot
 * Call this on dashboard load to accumulate real data over time
 */
export function recordSnapshot(
  walletAddress: string,
  positions: CurrentPositionsSummary
): void {
  const snapshot = createSnapshot(walletAddress, positions);
  saveSnapshot(walletAddress, snapshot);
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { getTimeRangeConfig };
