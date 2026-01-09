/**
 * APY History Service
 *
 * Tracks and stores historical APY data for protocols.
 * Uses localStorage for persistence with periodic snapshots.
 */

import { format, subDays, eachDayOfInterval, eachHourOfInterval } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

export interface APYDataPoint {
  timestamp: number;
  date: string;
  apy: number;
  protocol: string;
  asset?: string;
}

export interface APYSnapshot {
  timestamp: number;
  protocols: Record<string, number>; // protocol -> APY
}

export interface StoredAPYHistory {
  version: number;
  lastUpdated: number;
  snapshots: APYSnapshot[];
}

export type APYTimeRange = '7d' | '30d' | '90d' | '1y';

export interface APYChartData {
  date: string;
  timestamp: number;
  [protocol: string]: string | number; // protocol name -> APY value
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'prism_apy_history';
const STORAGE_VERSION = 1;
const MAX_SNAPSHOTS = 365; // 1 year of daily data
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Protocol display names and colors
export const PROTOCOL_CONFIG: Record<string, { name: string; color: string }> = {
  lido: { name: 'Lido', color: '#00A3FF' },
  coinbase: { name: 'Coinbase', color: '#0052FF' },
  rocketpool: { name: 'Rocket Pool', color: '#FF6B4A' },
  aave: { name: 'Aave V3', color: '#B6509E' },
  morpho: { name: 'Morpho', color: '#00D395' },
  compound: { name: 'Compound', color: '#00D395' },
  moonwell: { name: 'Moonwell', color: '#7B3FE4' },
  etherfi: { name: 'Ether.fi', color: '#735CFF' },
};

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

function getStoredHistory(): StoredAPYHistory | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredAPYHistory;
    if (parsed.version !== STORAGE_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveHistory(history: StoredAPYHistory): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[APYHistory] Failed to save history:', error);
  }
}

// =============================================================================
// SNAPSHOT FUNCTIONS
// =============================================================================

/**
 * Take a snapshot of current APY values
 */
export function takeAPYSnapshot(protocolAPYs: Record<string, number>): void {
  const history = getStoredHistory() || {
    version: STORAGE_VERSION,
    lastUpdated: 0,
    snapshots: [],
  };

  const now = Date.now();

  // Only take snapshot if enough time has passed
  if (now - history.lastUpdated < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  // Add new snapshot
  history.snapshots.push({
    timestamp: now,
    protocols: protocolAPYs,
  });

  // Trim old snapshots
  if (history.snapshots.length > MAX_SNAPSHOTS) {
    history.snapshots = history.snapshots.slice(-MAX_SNAPSHOTS);
  }

  history.lastUpdated = now;
  saveHistory(history);
}

/**
 * Get historical APY data for charts
 */
export function getAPYHistory(
  timeRange: APYTimeRange,
  protocols: string[]
): APYChartData[] {
  const history = getStoredHistory();
  const now = Date.now();

  // Determine time range
  const daysMap: Record<APYTimeRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const days = daysMap[timeRange];
  const startTime = now - days * 24 * 60 * 60 * 1000;

  // If we have stored history, use it
  if (history && history.snapshots.length > 0) {
    const relevantSnapshots = history.snapshots.filter(
      (s) => s.timestamp >= startTime
    );

    if (relevantSnapshots.length > 0) {
      return relevantSnapshots.map((snapshot) => {
        const dataPoint: APYChartData = {
          date: format(new Date(snapshot.timestamp), 'MMM d'),
          timestamp: snapshot.timestamp,
        };

        protocols.forEach((protocol) => {
          dataPoint[protocol] = snapshot.protocols[protocol] ?? 0;
        });

        return dataPoint;
      });
    }
  }

  // Generate simulated historical data for visualization
  return generateSimulatedAPYHistory(timeRange, protocols);
}

// =============================================================================
// SIMULATED DATA GENERATION
// =============================================================================

/**
 * Generate simulated APY history based on current values
 * Uses realistic variance patterns
 */
function generateSimulatedAPYHistory(
  timeRange: APYTimeRange,
  protocols: string[]
): APYChartData[] {
  const daysMap: Record<APYTimeRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const days = daysMap[timeRange];

  // Base APYs for each protocol (current approximate values)
  const baseAPYs: Record<string, number> = {
    lido: 3.4,
    coinbase: 2.78,
    rocketpool: 3.1,
    aave: 1.5,
    morpho: 5.2,
    compound: 4.8,
    moonwell: 4.2,
    etherfi: 4.5,
  };

  // Variance ranges for each protocol
  const variance: Record<string, number> = {
    lido: 0.3,
    coinbase: 0.2,
    rocketpool: 0.4,
    aave: 0.5,
    morpho: 1.0,
    compound: 0.8,
    moonwell: 0.6,
    etherfi: 0.5,
  };

  // Generate data points
  const now = new Date();
  const startDate = subDays(now, days);

  // Use daily intervals for longer ranges, hourly for 7d
  const intervals =
    days <= 7
      ? eachHourOfInterval({ start: startDate, end: now }).filter(
          (_, i) => i % 4 === 0 // Every 4 hours
        )
      : eachDayOfInterval({ start: startDate, end: now });

  // Seeded random for deterministic results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  return intervals.map((date, index) => {
    const dataPoint: APYChartData = {
      date: format(date, days <= 7 ? 'MMM d HH:mm' : 'MMM d'),
      timestamp: date.getTime(),
    };

    protocols.forEach((protocol) => {
      const base = baseAPYs[protocol] || 3.0;
      const v = variance[protocol] || 0.5;

      // Generate smooth variation using sin wave + noise
      const wave = Math.sin(index * 0.3) * (v * 0.5);
      const noise = (seededRandom(index * 1000 + protocol.charCodeAt(0)) - 0.5) * v;
      const trend = (index / intervals.length - 0.5) * (v * 0.3); // Slight trend

      dataPoint[protocol] = Math.max(0, +(base + wave + noise + trend).toFixed(2));
    });

    return dataPoint;
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the latest APY for a protocol
 */
export function getLatestAPY(protocol: string): number | null {
  const history = getStoredHistory();
  if (!history || history.snapshots.length === 0) return null;

  const latest = history.snapshots[history.snapshots.length - 1];
  return latest.protocols[protocol] ?? null;
}

/**
 * Get APY change over time range
 */
export function getAPYChange(
  protocol: string,
  timeRange: APYTimeRange
): { change: number; percentChange: number } | null {
  const history = getStoredHistory();
  if (!history || history.snapshots.length < 2) return null;

  const daysMap: Record<APYTimeRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const days = daysMap[timeRange];
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  const relevantSnapshots = history.snapshots.filter(
    (s) => s.timestamp >= startTime
  );

  if (relevantSnapshots.length < 2) return null;

  const first = relevantSnapshots[0].protocols[protocol];
  const last = relevantSnapshots[relevantSnapshots.length - 1].protocols[protocol];

  if (first === undefined || last === undefined) return null;

  const change = last - first;
  const percentChange = first > 0 ? (change / first) * 100 : 0;

  return { change, percentChange };
}

/**
 * Clear stored APY history
 */
export function clearAPYHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
