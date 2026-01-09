/**
 * Caching Service for Stablecoin Protocol Data
 *
 * Implements a multi-tier caching strategy:
 * - Pool/APY data: 3 days (slow-changing)
 * - Position data: 5 minutes (user balances)
 * - Price data: 1 hour (stablecoin prices)
 * - Fallback data: 7 days (emergency cache)
 *
 * Network-aware: Separates mainnet and testnet cache
 */

import { CachedData, DEFAULT_DATA_FETCH_CONFIG } from '@/types/stablecoin';
import { getChainId } from '@/contracts/addresses/network-config';

// =============================================================================
// CACHE STORAGE
// =============================================================================

// In-memory cache (could be replaced with IndexedDB for persistence)
const memoryCache = new Map<string, CachedData<unknown>>();

// localStorage keys prefix
const STORAGE_PREFIX = 'prism_stablecoin_cache_';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

export const CACHE_DURATIONS = {
  // Pool data (APY, TVL, etc.) - update every few days
  POOL_DATA: 3 * 24 * 60 * 60 * 1000, // 3 days

  // User positions - update more frequently
  POSITION_DATA: 5 * 60 * 1000, // 5 minutes

  // Token prices - hourly is fine for stablecoins
  PRICE_DATA: 60 * 60 * 1000, // 1 hour

  // Fallback/emergency cache - very long
  FALLBACK_DATA: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Protocol metadata (static) - very long
  METADATA: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

export type CacheCategory = keyof typeof CACHE_DURATIONS;

// =============================================================================
// CACHE KEY GENERATORS
// Network-aware: Keys include chain ID to separate mainnet/testnet cache
// =============================================================================

export function poolCacheKey(protocol: string, asset: string): string {
  const chainId = getChainId();
  return `pool_${chainId}_${protocol}_${asset}`;
}

export function positionCacheKey(wallet: string, protocol: string, asset: string): string {
  const chainId = getChainId();
  return `position_${chainId}_${wallet}_${protocol}_${asset}`;
}

export function priceCacheKey(symbol: string): string {
  const chainId = getChainId();
  return `price_${chainId}_${symbol}`;
}

export function allPoolsCacheKey(): string {
  const chainId = getChainId();
  return `all_pools_${chainId}`;
}

// =============================================================================
// MEMORY CACHE OPERATIONS
// =============================================================================

/**
 * Get data from memory cache
 */
export function getFromMemoryCache<T>(key: string): CachedData<T> | null {
  const cached = memoryCache.get(key) as CachedData<T> | undefined;

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return cached;
}

/**
 * Set data in memory cache
 */
export function setInMemoryCache<T>(
  key: string,
  data: T,
  category: CacheCategory,
  source: 'api' | 'onchain' | 'fallback' = 'api'
): void {
  const duration = CACHE_DURATIONS[category];
  const now = Date.now();

  const cached: CachedData<T> = {
    data,
    timestamp: now,
    expiresAt: now + duration,
    source,
  };

  memoryCache.set(key, cached);
}

/**
 * Invalidate memory cache entry
 */
export function invalidateMemoryCache(key: string): void {
  memoryCache.delete(key);
}

/**
 * Invalidate all memory cache entries matching a prefix
 */
export function invalidateMemoryCacheByPrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all memory cache
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

// =============================================================================
// LOCAL STORAGE CACHE OPERATIONS (for persistence across sessions)
// =============================================================================

/**
 * Get data from localStorage
 */
export function getFromLocalStorage<T>(key: string): CachedData<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedData<T>;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Set data in localStorage
 */
export function setInLocalStorage<T>(
  key: string,
  data: T,
  category: CacheCategory,
  source: 'api' | 'onchain' | 'fallback' = 'api'
): void {
  if (typeof window === 'undefined') return;

  const duration = CACHE_DURATIONS[category];
  const now = Date.now();

  const cached: CachedData<T> = {
    data,
    timestamp: now,
    expiresAt: now + duration,
    source,
  };

  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(cached));
  } catch (e) {
    // localStorage might be full or unavailable
    console.warn('Failed to cache to localStorage:', e);
  }
}

/**
 * Remove from localStorage
 */
export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}

/**
 * Clear all PRISM cache from localStorage
 */
export function clearLocalStorageCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// =============================================================================
// COMBINED CACHE OPERATIONS (Memory + LocalStorage)
// =============================================================================

/**
 * Get cached data, checking memory first, then localStorage
 */
export function getCached<T>(key: string): CachedData<T> | null {
  // Try memory first (fastest)
  const memCached = getFromMemoryCache<T>(key);
  if (memCached) {
    return memCached;
  }

  // Try localStorage (persistent)
  const storageCached = getFromLocalStorage<T>(key);
  if (storageCached) {
    // Restore to memory cache for faster future access
    memoryCache.set(key, storageCached);
    return storageCached;
  }

  return null;
}

/**
 * Set cached data in both memory and localStorage
 */
export function setCached<T>(
  key: string,
  data: T,
  category: CacheCategory,
  source: 'api' | 'onchain' | 'fallback' = 'api'
): void {
  setInMemoryCache(key, data, category, source);
  setInLocalStorage(key, data, category, source);
}

/**
 * Invalidate cache in both memory and localStorage
 */
export function invalidateCache(key: string): void {
  invalidateMemoryCache(key);
  removeFromLocalStorage(key);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  clearMemoryCache();
  clearLocalStorageCache();
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Check if cache is stale (still valid but old)
 * Useful for background refresh
 */
export function isCacheStale<T>(
  cached: CachedData<T> | null,
  staleThresholdMs: number = CACHE_DURATIONS.POOL_DATA / 2
): boolean {
  if (!cached) return true;

  const age = Date.now() - cached.timestamp;
  return age > staleThresholdMs;
}

/**
 * Get cache age in human-readable format
 */
export function getCacheAge(cached: CachedData<unknown> | null): string {
  if (!cached) return 'not cached';

  const ageMs = Date.now() - cached.timestamp;
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ago`;

  const minutes = Math.floor(ageMs / (60 * 1000));
  return `${minutes}m ago`;
}

/**
 * Get remaining time until cache expires
 */
export function getCacheTimeRemaining(cached: CachedData<unknown> | null): string {
  if (!cached) return 'not cached';

  const remainingMs = cached.expiresAt - Date.now();
  if (remainingMs <= 0) return 'expired';

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;

  const minutes = Math.floor(remainingMs / (60 * 1000));
  return `${minutes}m`;
}

// =============================================================================
// CACHE WITH FETCH PATTERN
// =============================================================================

/**
 * Get data from cache or fetch if not available/expired
 * This is the main function to use for data fetching
 */
export async function getOrFetch<T>(
  key: string,
  category: CacheCategory,
  fetchFn: () => Promise<T>,
  options: {
    forceRefresh?: boolean;
    fallbackValue?: T;
  } = {}
): Promise<{ data: T; fromCache: boolean; source: 'api' | 'onchain' | 'fallback' }> {
  const { forceRefresh = false, fallbackValue } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCached<T>(key);
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        source: cached.source,
      };
    }
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();
    setCached(key, data, category, 'api');
    return {
      data,
      fromCache: false,
      source: 'api',
    };
  } catch (error) {
    // On error, try to return stale cache
    const staleCache = getCached<T>(key);
    if (staleCache) {
      console.warn(`Using stale cache for ${key} due to fetch error`);
      return {
        data: staleCache.data,
        fromCache: true,
        source: 'fallback',
      };
    }

    // Return fallback value if provided
    if (fallbackValue !== undefined) {
      console.warn(`Using fallback value for ${key} due to fetch error`);
      return {
        data: fallbackValue,
        fromCache: false,
        source: 'fallback',
      };
    }

    // Re-throw if no fallback
    throw error;
  }
}
