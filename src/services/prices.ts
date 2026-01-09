/**
 * Prices Service
 * Fetches token prices from Chainlink oracles and caches them
 * Updates every 5 minutes for real-time accuracy
 *
 * Supports both mainnet (live Chainlink) and testnet (mock prices)
 */

import { createPublicClient, http, type Address } from 'viem';
import { getChain, getContracts, getRpcUrl, shouldUseLivePrices } from '@/contracts/addresses/network-config';
import { CHAINLINK_AGGREGATOR_ABI } from '@/contracts/abis';
import { getMockPrices, getMockEthPrice, getMockLSTRatios } from './mock-data';
import type { PriceData } from '@/types/staking';

// Price cache TTL (5 minutes)
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

interface PriceCache {
  data: Record<string, PriceData>;
  lastUpdated: number;
}

class PricesService {
  private client = createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  });

  private cache: PriceCache = {
    data: {},
    lastUpdated: 0,
  };

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdated < PRICE_CACHE_TTL_MS;
  }

  /**
   * Fetch price from Chainlink oracle
   */
  private async fetchChainlinkPrice(
    feedAddress: Address
  ): Promise<{ price: number; decimals: number }> {
    try {
      const [roundData, decimals] = await Promise.all([
        this.client.readContract({
          address: feedAddress,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: 'latestRoundData',
        }),
        this.client.readContract({
          address: feedAddress,
          abi: CHAINLINK_AGGREGATOR_ABI,
          functionName: 'decimals',
        }),
      ]);

      const [, answer] = roundData as [bigint, bigint, bigint, bigint, bigint];
      const price = Number(answer) / 10 ** decimals;

      return { price, decimals };
    } catch (error) {
      console.error('Chainlink price fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get ETH/USD price
   * Now uses live prices from Chainlink even on testnet
   */
  async getETHPrice(): Promise<number> {
    // Use mock price only if live prices are disabled
    if (!shouldUseLivePrices()) {
      return getMockEthPrice();
    }

    const cacheKey = 'ETH';
    if (this.isCacheValid() && this.cache.data[cacheKey]) {
      return this.cache.data[cacheKey].priceUsd;
    }

    const contracts = getContracts();
    const { price } = await this.fetchChainlinkPrice(
      contracts.chainlink.ethUsd as Address
    );

    this.updateCache(cacheKey, {
      token: contracts.WETH as Address,
      priceUsd: price,
      priceEth: 1,
      lastUpdated: new Date().toISOString(),
    });

    return price;
  }

  /**
   * Get wstETH/ETH ratio
   * Now uses live prices from Chainlink even on testnet
   */
  async getWstETHRatio(): Promise<number> {
    // Use mock ratio only if live prices are disabled
    if (!shouldUseLivePrices()) {
      return getMockLSTRatios().wstethEth;
    }

    const cacheKey = 'wstETH_ratio';
    if (this.isCacheValid() && this.cache.data[cacheKey]) {
      return this.cache.data[cacheKey].priceEth!;
    }

    const contracts = getContracts();
    const { price } = await this.fetchChainlinkPrice(
      contracts.chainlink.wstethEth as Address
    );

    this.updateCache(cacheKey, {
      token: contracts.wstETH as Address,
      priceUsd: 0, // Will be calculated with ETH price
      priceEth: price,
      lastUpdated: new Date().toISOString(),
    });

    return price;
  }

  /**
   * Get cbETH/ETH ratio
   * Now uses live prices from Chainlink even on testnet
   */
  async getCbETHRatio(): Promise<number> {
    // Use mock ratio only if live prices are disabled
    if (!shouldUseLivePrices()) {
      return getMockLSTRatios().cbethEth;
    }

    const cacheKey = 'cbETH_ratio';
    if (this.isCacheValid() && this.cache.data[cacheKey]) {
      return this.cache.data[cacheKey].priceEth!;
    }

    const contracts = getContracts();
    const { price } = await this.fetchChainlinkPrice(
      contracts.chainlink.cbethEth as Address
    );

    this.updateCache(cacheKey, {
      token: contracts.cbETH as Address,
      priceUsd: 0,
      priceEth: price,
      lastUpdated: new Date().toISOString(),
    });

    return price;
  }

  /**
   * Get weETH/ETH ratio
   * Now uses live prices from Chainlink even on testnet
   */
  async getWeETHRatio(): Promise<number> {
    // Use mock ratio only if live prices are disabled
    if (!shouldUseLivePrices()) {
      return getMockLSTRatios().weethEth || 1.05;
    }

    const cacheKey = 'weETH_ratio';
    if (this.isCacheValid() && this.cache.data[cacheKey]) {
      return this.cache.data[cacheKey].priceEth!;
    }

    const contracts = getContracts();
    try {
      const { price } = await this.fetchChainlinkPrice(
        contracts.chainlink.weethEth as Address
      );

      this.updateCache(cacheKey, {
        token: contracts.weETH as Address,
        priceUsd: 0,
        priceEth: price,
        lastUpdated: new Date().toISOString(),
      });

      return price;
    } catch (error) {
      console.warn('Failed to fetch weETH ratio, using fallback:', error);
      return 1.05; // Fallback ratio
    }
  }

  /**
   * Get all relevant prices
   * Now uses live prices from Chainlink even on testnet
   */
  async getAllPrices(): Promise<Record<string, PriceData>> {
    // Use mock prices only if live prices are disabled
    if (!shouldUseLivePrices()) {
      return getMockPrices();
    }

    if (this.isCacheValid() && Object.keys(this.cache.data).length > 0) {
      return this.cache.data;
    }

    const [ethPrice, wstethRatio, cbethRatio, weethRatio] = await Promise.all([
      this.getETHPrice(),
      this.getWstETHRatio(),
      this.getCbETHRatio(),
      this.getWeETHRatio(),
    ]);

    const now = new Date().toISOString();
    const contracts = getContracts();

    const prices: Record<string, PriceData> = {
      ETH: {
        token: contracts.WETH as Address,
        priceUsd: ethPrice,
        priceEth: 1,
        lastUpdated: now,
      },
      wstETH: {
        token: contracts.wstETH as Address,
        priceUsd: ethPrice * wstethRatio,
        priceEth: wstethRatio,
        lastUpdated: now,
      },
      cbETH: {
        token: contracts.cbETH as Address,
        priceUsd: ethPrice * cbethRatio,
        priceEth: cbethRatio,
        lastUpdated: now,
      },
      // weETH now uses live Chainlink ratio
      weETH: {
        token: contracts.weETH as Address,
        priceUsd: ethPrice * weethRatio,
        priceEth: weethRatio,
        lastUpdated: now,
      },
      superOETHb: {
        token: contracts.superOETHb as Address,
        priceUsd: ethPrice, // Pegged via Aerodrome AMO
        priceEth: 1,
        lastUpdated: now,
      },
    };

    this.cache = {
      data: prices,
      lastUpdated: Date.now(),
    };

    return prices;
  }

  /**
   * Get price for a specific token
   */
  async getTokenPrice(symbol: string): Promise<PriceData | null> {
    const prices = await this.getAllPrices();
    return prices[symbol] || null;
  }

  /**
   * Convert amount to USD
   */
  async toUSD(amount: string, tokenSymbol: string): Promise<number> {
    const price = await this.getTokenPrice(tokenSymbol);
    if (!price) return 0;
    return parseFloat(amount) * price.priceUsd;
  }

  /**
   * Convert USD to token amount
   */
  async fromUSD(usdAmount: number, tokenSymbol: string): Promise<number> {
    const price = await this.getTokenPrice(tokenSymbol);
    if (!price || price.priceUsd === 0) return 0;
    return usdAmount / price.priceUsd;
  }

  /**
   * Update cache entry
   */
  private updateCache(key: string, data: PriceData): void {
    this.cache.data[key] = data;
    this.cache.lastUpdated = Date.now();
  }

  /**
   * Force refresh all prices
   */
  async refresh(): Promise<Record<string, PriceData>> {
    this.cache = { data: {}, lastUpdated: 0 };
    return this.getAllPrices();
  }

  /**
   * Get cache info
   */
  getCacheInfo(): { lastUpdated: Date | null; isValid: boolean } {
    return {
      lastUpdated: this.cache.lastUpdated
        ? new Date(this.cache.lastUpdated)
        : null,
      isValid: this.isCacheValid(),
    };
  }
}

// Export singleton instance
export const pricesService = new PricesService();

// Export class for custom instances
export { PricesService };
