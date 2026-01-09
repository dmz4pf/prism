/**
 * Yields Service
 * Fetches and caches APY data from DeFiLlama and on-chain sources
 * Updates every 24-72 hours (configurable)
 *
 * Supports both mainnet (live data) and testnet (mock data)
 */

import { getContracts, shouldUseMockData } from '@/contracts/addresses/network-config';
import { getMockStakingOptions } from './mock-data';
import type { StakingOption, CachedYieldData, APYBreakdown } from '@/types/staking';

// Cache configuration
const CACHE_KEY = 'prism_yields_cache';
const DEFAULT_CACHE_TTL_HOURS = 24; // 24 hours default

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  pool: string;
  underlyingTokens?: string[];
}

interface LidoAPIResponse {
  data: {
    apr: number;
    timeUnix: number;
  };
}

interface CoinbaseAPIResponse {
  data: {
    rate: string;
  };
}

class YieldsService {
  private cache: CachedYieldData | null = null;
  private cacheExpiryHours: number = DEFAULT_CACHE_TTL_HOURS;

  constructor(cacheExpiryHours: number = DEFAULT_CACHE_TTL_HOURS) {
    this.cacheExpiryHours = cacheExpiryHours;
    this.loadCacheFromStorage();
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedYieldData;
        if (new Date(parsed.expiresAt) > new Date()) {
          this.cache = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load yields cache:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(data: CachedYieldData): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save yields cache:', error);
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return new Date(this.cache.expiresAt) > new Date();
  }

  /**
   * Get all staking options with APY data
   * Uses mock data when in testnet mode
   */
  async getStakingOptions(forceRefresh = false): Promise<StakingOption[]> {
    // In testnet mode, return mock data
    if (shouldUseMockData()) {
      return getMockStakingOptions();
    }

    // Return cached data if valid
    if (!forceRefresh && this.isCacheValid() && this.cache) {
      return this.cache.options;
    }

    // Fetch fresh data
    try {
      const options = await this.fetchAllYields();

      // Cache the data
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + this.cacheExpiryHours * 60 * 60 * 1000
      );

      const cacheData: CachedYieldData = {
        options,
        lastUpdated: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        source: 'defillama',
      };

      this.cache = cacheData;
      this.saveCacheToStorage(cacheData);

      return options;
    } catch (error) {
      console.error('Failed to fetch yields:', error);
      // Return cached data even if expired, or empty array
      return this.cache?.options || this.getDefaultOptions();
    }
  }

  /**
   * Fetch yields from all sources
   */
  private async fetchAllYields(): Promise<StakingOption[]> {
    const [defiLlamaData, lidoAPR, cbethAPR] = await Promise.all([
      this.fetchDefiLlamaYields(),
      this.fetchLidoAPR(),
      this.fetchCoinbaseAPR(),
    ]);

    return this.buildStakingOptions(defiLlamaData, lidoAPR, cbethAPR);
  }

  /**
   * Fetch from DeFiLlama yields API
   */
  private async fetchDefiLlamaYields(): Promise<DefiLlamaPool[]> {
    try {
      const response = await fetch('https://yields.llama.fi/pools');
      const data = await response.json();

      // Filter to Base chain and relevant protocols
      return data.data.filter(
        (pool: DefiLlamaPool) =>
          pool.chain === 'Base' &&
          ['lido', 'aave-v3', 'origin-dollar', 'ether.fi', 'aerodrome'].includes(
            pool.project.toLowerCase()
          )
      );
    } catch (error) {
      console.error('DeFiLlama fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch Lido stETH APR
   */
  private async fetchLidoAPR(): Promise<number> {
    try {
      const response = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma');
      const data: LidoAPIResponse = await response.json();
      return data.data.apr;
    } catch (error) {
      console.error('Lido APR fetch failed:', error);
      return 3.4; // Fallback
    }
  }

  /**
   * Fetch Coinbase cbETH APR
   */
  private async fetchCoinbaseAPR(): Promise<number> {
    // Coinbase doesn't have a public API for this, use estimate
    return 2.78;
  }

  /**
   * Build staking options from fetched data
   */
  private buildStakingOptions(
    defiLlamaData: DefiLlamaPool[],
    lidoAPR: number,
    cbethAPR: number
  ): StakingOption[] {
    const now = new Date().toISOString();
    const contracts = getContracts();

    // Find specific pools from DeFiLlama
    const superOethPool = defiLlamaData.find(
      (p) => p.project.toLowerCase() === 'origin-dollar'
    );
    const aaveWethPool = defiLlamaData.find(
      (p) => p.project.toLowerCase() === 'aave-v3' && p.symbol.includes('WETH')
    );
    const etherfiPool = defiLlamaData.find(
      (p) => p.project.toLowerCase() === 'ether.fi'
    );

    return [
      // Tier 1: wstETH (Lido)
      {
        id: 'wsteth',
        name: 'Lido Staked ETH',
        protocol: 'lido',
        description:
          'Stake ETH with Lido and receive wstETH, a liquid staking token that earns staking rewards.',
        inputToken: {
          symbol: 'ETH',
          name: 'Ether',
          address: contracts.WETH,
          decimals: 18,
        },
        outputToken: {
          symbol: 'wstETH',
          name: 'Wrapped Staked ETH',
          address: contracts.wstETH,
          decimals: 18,
        },
        apy: lidoAPR,
        apyBreakdown: {
          base: lidoAPR,
          total: lidoAPR,
        },
        risk: 'low',
        riskFactors: [
          'Smart contract risk (audited, battle-tested)',
          'Minimal depeg risk historically',
        ],
        type: 'liquid-staking',
        tvl: 38000000000, // ~$38B total
        lastUpdated: now,
      },

      // Tier 1: cbETH (Coinbase)
      {
        id: 'cbeth',
        name: 'Coinbase Staked ETH',
        protocol: 'coinbase',
        description:
          'Stake ETH through Coinbase and receive cbETH, a liquid staking token with institutional backing.',
        inputToken: {
          symbol: 'ETH',
          name: 'Ether',
          address: contracts.WETH,
          decimals: 18,
        },
        outputToken: {
          symbol: 'cbETH',
          name: 'Coinbase Wrapped Staked ETH',
          address: contracts.cbETH,
          decimals: 18,
        },
        apy: cbethAPR,
        apyBreakdown: {
          base: cbethAPR,
          total: cbethAPR,
        },
        risk: 'low',
        riskFactors: [
          'Centralized (Coinbase custody)',
          'Higher fee (35% commission)',
          'Native to Base (no bridging)',
        ],
        type: 'liquid-staking',
        tvl: 3000000000, // ~$3B
        lastUpdated: now,
      },

      // Tier 1: Aave WETH Supply
      {
        id: 'aave-weth',
        name: 'Aave WETH Supply',
        protocol: 'aave',
        description:
          'Supply ETH to Aave V3 on Base to earn lending interest from borrowers.',
        inputToken: {
          symbol: 'ETH',
          name: 'Ether',
          address: contracts.WETH,
          decimals: 18,
        },
        outputToken: {
          symbol: 'aWETH',
          name: 'Aave Base WETH',
          address: contracts.aave.aBasWETH,
          decimals: 18,
        },
        apy: aaveWethPool?.apy || 1.5,
        apyBreakdown: {
          base: aaveWethPool?.apyBase || 1.5,
          rewards: aaveWethPool?.apyReward || 0,
          total: aaveWethPool?.apy || 1.5,
        },
        risk: 'low',
        riskFactors: [
          'Smart contract risk (heavily audited)',
          'Variable interest rates',
          'Protocol risk mitigation via safety module',
        ],
        type: 'lending',
        tvl: aaveWethPool?.tvlUsd || 200000000,
        lastUpdated: now,
      },

      // Tier 2: Super OETH
      {
        id: 'superoethb',
        name: 'Super OETH',
        protocol: 'origin',
        description:
          'Supercharged LST combining ETH staking yield with Aerodrome LP rewards for higher APY.',
        inputToken: {
          symbol: 'ETH',
          name: 'Ether',
          address: contracts.WETH,
          decimals: 18,
        },
        outputToken: {
          symbol: 'superOETHb',
          name: 'Super OETH',
          address: contracts.superOETHb,
          decimals: 18,
        },
        apy: superOethPool?.apy || 8.0,
        apyBreakdown: {
          base: 3.4, // ETH staking
          rewards: (superOethPool?.apy || 8.0) - 3.4, // Aerodrome rewards
          total: superOethPool?.apy || 8.0,
        },
        risk: 'medium',
        riskFactors: [
          'Rebasing token mechanics',
          'Dependent on Aerodrome incentives',
          'Protocol-owned liquidity risk',
        ],
        type: 'supercharged-lst',
        tvl: superOethPool?.tvlUsd || 120000000,
        lastUpdated: now,
      },

      // Tier 2: weETH (Ether.fi)
      {
        id: 'weeth',
        name: 'Ether.fi Restaked ETH',
        protocol: 'etherfi',
        description:
          'Liquid restaking token that earns staking rewards plus EigenLayer restaking rewards.',
        inputToken: {
          symbol: 'ETH',
          name: 'Ether',
          address: contracts.WETH,
          decimals: 18,
        },
        outputToken: {
          symbol: 'weETH',
          name: 'Wrapped eETH',
          address: contracts.weETH,
          decimals: 18,
        },
        apy: etherfiPool?.apy || 4.5,
        apyBreakdown: {
          base: 3.4, // ETH staking
          rewards: 1.1, // Restaking rewards
          total: etherfiPool?.apy || 4.5,
        },
        risk: 'medium',
        riskFactors: [
          'EigenLayer slashing risk',
          'Smart contract complexity (multiple protocols)',
          '7-day withdrawal unbonding',
        ],
        type: 'liquid-restaking',
        tvl: etherfiPool?.tvlUsd || 10000000000,
        lastUpdated: now,
      },
    ];
  }

  /**
   * Get default options (fallback)
   */
  private getDefaultOptions(): StakingOption[] {
    return this.buildStakingOptions([], 3.4, 2.78);
  }

  /**
   * Get single staking option by ID
   */
  async getStakingOption(id: string): Promise<StakingOption | null> {
    const options = await this.getStakingOptions();
    return options.find((opt) => opt.id === id) || null;
  }

  /**
   * Force refresh cache
   */
  async refreshCache(): Promise<StakingOption[]> {
    return this.getStakingOptions(true);
  }

  /**
   * Get cache info
   */
  getCacheInfo(): { lastUpdated: string | null; expiresAt: string | null } {
    return {
      lastUpdated: this.cache?.lastUpdated || null,
      expiresAt: this.cache?.expiresAt || null,
    };
  }

  /**
   * Set cache expiry (in hours)
   */
  setCacheExpiry(hours: number): void {
    this.cacheExpiryHours = hours;
  }
}

// Export singleton instance
export const yieldsService = new YieldsService();

// Export class for custom instances
export { YieldsService };
