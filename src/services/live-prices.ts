/**
 * Live Price Service
 *
 * ALWAYS fetches real prices from Chainlink oracles or CoinGecko API.
 * Works on both mainnet and testnet - Chainlink testnets return real prices.
 *
 * This service is separate from the existing prices.ts to allow gradual migration
 * and easy rollback if needed.
 */

import { createPublicClient, http, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { CHAINLINK_AGGREGATOR_ABI } from '@/contracts/abis';
import { isTestnet } from '@/contracts/addresses/network-config';
import { BASE_MAINNET_CONTRACTS } from '@/contracts/addresses/base-mainnet';
import { BASE_SEPOLIA_CONTRACTS } from '@/contracts/addresses/base-sepolia';

// ============================================
// TYPES
// ============================================

export interface LivePrice {
  symbol: string;
  priceUsd: number;
  priceEth: number;
  source: 'chainlink' | 'coingecko' | 'fallback';
  updatedAt: number;
  isStale: boolean;
}

export interface PriceCache {
  prices: Map<string, LivePrice>;
  lastFetch: number;
}

// ============================================
// CONFIGURATION
// ============================================

const CACHE_TTL_MS = 60_000; // 1 minute cache
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Fallback prices (conservative, only used if ALL sources fail)
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 2500,
  wstETH: 2875, // ~1.15x ETH
  cbETH: 2625,  // ~1.05x ETH
  weETH: 2550,  // ~1.02x ETH
  superOETHb: 2500, // 1:1 with ETH
  USDC: 1,
  USDT: 1,
  DAI: 1,
};

// ============================================
// LIVE PRICE SERVICE CLASS
// ============================================

class LivePriceService {
  private cache: PriceCache = {
    prices: new Map(),
    lastFetch: 0,
  };

  private client = createPublicClient({
    chain: isTestnet() ? baseSepolia : base,
    transport: http(
      isTestnet()
        ? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
        : process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
    ),
  });

  private get contracts() {
    return isTestnet() ? BASE_SEPOLIA_CONTRACTS : BASE_MAINNET_CONTRACTS;
  }

  // ----------------------------------------
  // PUBLIC METHODS
  // ----------------------------------------

  /**
   * Get ETH price in USD - the primary method
   * Tries Chainlink first, falls back to CoinGecko, then to cached/fallback
   */
  async getEthPrice(): Promise<LivePrice> {
    const cached = this.getCached('ETH');
    if (cached && !this.isCacheExpired()) {
      return cached;
    }

    // Try Chainlink first
    try {
      const chainlinkPrice = await this.fetchChainlinkPrice(
        this.contracts.chainlink.ethUsd as Address,
        8 // ETH/USD has 8 decimals
      );

      if (chainlinkPrice > 0) {
        const price: LivePrice = {
          symbol: 'ETH',
          priceUsd: chainlinkPrice,
          priceEth: 1,
          source: 'chainlink',
          updatedAt: Date.now(),
          isStale: false,
        };
        this.setCache('ETH', price);
        return price;
      }
    } catch (error) {
      console.warn('[LivePriceService] Chainlink ETH/USD fetch failed:', error);
    }

    // Try CoinGecko as fallback
    try {
      const coingeckoPrice = await this.fetchCoinGeckoPrice('ethereum');
      if (coingeckoPrice > 0) {
        const price: LivePrice = {
          symbol: 'ETH',
          priceUsd: coingeckoPrice,
          priceEth: 1,
          source: 'coingecko',
          updatedAt: Date.now(),
          isStale: false,
        };
        this.setCache('ETH', price);
        return price;
      }
    } catch (error) {
      console.warn('[LivePriceService] CoinGecko ETH price fetch failed:', error);
    }

    // Return cached if available, otherwise fallback
    if (cached) {
      return { ...cached, isStale: true };
    }

    return {
      symbol: 'ETH',
      priceUsd: FALLBACK_PRICES.ETH,
      priceEth: 1,
      source: 'fallback',
      updatedAt: Date.now(),
      isStale: true,
    };
  }

  /**
   * Get LST ratio from Chainlink (e.g., wstETH/ETH)
   * Note: All Chainlink feeds on Base use 8 decimals
   */
  async getLstRatio(symbol: 'wstETH' | 'cbETH' | 'weETH'): Promise<number> {
    const feedMap: Record<string, Address> = {
      wstETH: this.contracts.chainlink.wstethEth as Address,
      cbETH: this.contracts.chainlink.cbethEth as Address,
      weETH: this.contracts.chainlink.weethEth as Address,
    };

    const fallbackRatios: Record<string, number> = {
      wstETH: 1.16,
      cbETH: 1.03,
      weETH: 1.05,
    };

    try {
      const ratio = await this.fetchChainlinkPrice(feedMap[symbol], 8); // All feeds use 8 decimals
      if (ratio > 0) {
        return ratio;
      }
    } catch (error) {
      console.warn(`[LivePriceService] Chainlink ${symbol}/ETH fetch failed:`, error);
    }

    return fallbackRatios[symbol];
  }

  /**
   * Get price for any supported token
   */
  async getTokenPrice(symbol: string): Promise<LivePrice> {
    const cached = this.getCached(symbol);
    if (cached && !this.isCacheExpired()) {
      return cached;
    }

    // For stablecoins, return $1
    if (['USDC', 'USDT', 'DAI', 'USDbC'].includes(symbol)) {
      const price: LivePrice = {
        symbol,
        priceUsd: 1,
        priceEth: 0, // Will be calculated
        source: 'fallback',
        updatedAt: Date.now(),
        isStale: false,
      };
      this.setCache(symbol, price);
      return price;
    }

    // For ETH
    if (symbol === 'ETH' || symbol === 'WETH') {
      return this.getEthPrice();
    }

    // For LSTs, calculate from ETH price and ratio
    if (['wstETH', 'cbETH', 'weETH', 'superOETHb'].includes(symbol)) {
      const ethPrice = await this.getEthPrice();
      const ratio = symbol === 'superOETHb' ? 1 : await this.getLstRatio(symbol as 'wstETH' | 'cbETH' | 'weETH');

      const price: LivePrice = {
        symbol,
        priceUsd: ethPrice.priceUsd * ratio,
        priceEth: ratio,
        source: ethPrice.source,
        updatedAt: Date.now(),
        isStale: ethPrice.isStale,
      };
      this.setCache(symbol, price);
      return price;
    }

    // Unknown token - return fallback
    return {
      symbol,
      priceUsd: FALLBACK_PRICES[symbol] || 0,
      priceEth: 0,
      source: 'fallback',
      updatedAt: Date.now(),
      isStale: true,
    };
  }

  /**
   * Get all prices at once (batch fetch)
   */
  async getAllPrices(): Promise<Record<string, LivePrice>> {
    const symbols = ['ETH', 'wstETH', 'cbETH', 'weETH', 'superOETHb', 'USDC', 'DAI'];
    const prices: Record<string, LivePrice> = {};

    // Fetch ETH first (other prices depend on it)
    prices.ETH = await this.getEthPrice();

    // Fetch others in parallel
    await Promise.all(
      symbols.filter(s => s !== 'ETH').map(async (symbol) => {
        prices[symbol] = await this.getTokenPrice(symbol);
      })
    );

    return prices;
  }

  /**
   * Convert amount to USD
   */
  async toUsd(amount: number, symbol: string): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    return amount * price.priceUsd;
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    size: number;
    lastFetch: Date | null;
    isExpired: boolean;
    entries: Array<{ symbol: string; source: string; isStale: boolean }>;
  } {
    return {
      size: this.cache.prices.size,
      lastFetch: this.cache.lastFetch ? new Date(this.cache.lastFetch) : null,
      isExpired: this.isCacheExpired(),
      entries: Array.from(this.cache.prices.entries()).map(([symbol, price]) => ({
        symbol,
        source: price.source,
        isStale: price.isStale,
      })),
    };
  }

  /**
   * Force refresh all prices
   */
  async refresh(): Promise<Record<string, LivePrice>> {
    this.cache = { prices: new Map(), lastFetch: 0 };
    return this.getAllPrices();
  }

  // ----------------------------------------
  // PRIVATE METHODS
  // ----------------------------------------

  private async fetchChainlinkPrice(feedAddress: Address, decimals: number): Promise<number> {
    const roundData = await this.client.readContract({
      address: feedAddress,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: 'latestRoundData',
    });

    const [, answer, , updatedAt] = roundData as [bigint, bigint, bigint, bigint, bigint];

    // Check for stale data (more than 1 hour old)
    const updatedAtMs = Number(updatedAt) * 1000;
    if (Date.now() - updatedAtMs > 60 * 60 * 1000) {
      console.warn('[LivePriceService] Chainlink data is stale');
    }

    return Number(answer) / 10 ** decimals;
  }

  private async fetchCoinGeckoPrice(coinId: string): Promise<number> {
    const response = await fetch(
      `${COINGECKO_API}?ids=${coinId}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data[coinId]?.usd || 0;
  }

  private getCached(symbol: string): LivePrice | undefined {
    return this.cache.prices.get(symbol);
  }

  private setCache(symbol: string, price: LivePrice): void {
    this.cache.prices.set(symbol, price);
    this.cache.lastFetch = Date.now();
  }

  private isCacheExpired(): boolean {
    return Date.now() - this.cache.lastFetch > CACHE_TTL_MS;
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const livePriceService = new LivePriceService();

// Export class for testing
export { LivePriceService };
