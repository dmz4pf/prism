/**
 * Reward APY Service
 *
 * Fetches and calculates protocol reward APYs (COMP, WELL, AAVE incentives).
 * Uses DeFiLlama API for aggregated data with fallbacks to on-chain calculations.
 */

import { createPublicClient, http, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { isTestnet } from '@/contracts/addresses/network-config';

// =============================================================================
// TYPES
// =============================================================================

export interface RewardAPY {
  protocol: string;
  asset: string;
  supplyRewardAPY: number;
  borrowRewardAPY: number;
  rewardToken: string;
  rewardTokenSymbol: string;
  source: 'defillama' | 'onchain' | 'estimated';
  updatedAt: number;
}

export interface ProtocolRewards {
  [assetAddress: string]: RewardAPY;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFILLAMA_API = 'https://yields.llama.fi/pools';

// Estimated reward APYs (used as fallback when API fails)
// These are conservative estimates based on typical Base chain rewards
const ESTIMATED_REWARDS: Record<string, { supply: number; borrow: number }> = {
  // Aave on Base typically has minimal rewards
  'aave': { supply: 0.1, borrow: 0 },
  // Compound III on Base has COMP rewards
  'compound': { supply: 0.5, borrow: 0 },
  // Moonwell on Base distributes WELL tokens
  'moonwell': { supply: 1.2, borrow: 0.3 },
  // Morpho doesn't have native rewards yet
  'morpho': { supply: 0, borrow: 0 },
};

// Protocol identifiers for DeFiLlama
const DEFILLAMA_PROTOCOL_MAP: Record<string, string> = {
  'aave': 'aave-v3',
  'compound': 'compound-v3',
  'moonwell': 'moonwell',
  'morpho': 'morpho-blue',
};

// =============================================================================
// CACHE
// =============================================================================

interface RewardCache {
  rewards: Map<string, RewardAPY>;
  lastFetch: number;
}

const cache: RewardCache = {
  rewards: new Map(),
  lastFetch: 0,
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

class RewardAPYService {
  private client = createPublicClient({
    chain: isTestnet() ? baseSepolia : base,
    transport: http(
      isTestnet()
        ? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
        : process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
    ),
  });

  /**
   * Get reward APY for a specific market
   */
  async getRewardAPY(
    protocol: string,
    assetSymbol: string,
    assetAddress?: Address
  ): Promise<RewardAPY> {
    const cacheKey = `${protocol}-${assetSymbol}`.toLowerCase();
    const cached = cache.rewards.get(cacheKey);

    // Return cached if fresh
    if (cached && Date.now() - cache.lastFetch < CACHE_TTL_MS) {
      return cached;
    }

    // Try DeFiLlama first
    try {
      const defillamaReward = await this.fetchFromDeFiLlama(protocol, assetSymbol);
      if (defillamaReward) {
        cache.rewards.set(cacheKey, defillamaReward);
        cache.lastFetch = Date.now();
        return defillamaReward;
      }
    } catch (error) {
      console.warn(`[RewardAPYService] DeFiLlama fetch failed for ${protocol}/${assetSymbol}:`, error);
    }

    // Fall back to estimated rewards
    const estimated = this.getEstimatedReward(protocol, assetSymbol);
    cache.rewards.set(cacheKey, estimated);
    cache.lastFetch = Date.now();
    return estimated;
  }

  /**
   * Get all reward APYs for a protocol
   */
  async getProtocolRewards(protocol: string): Promise<ProtocolRewards> {
    const rewards: ProtocolRewards = {};

    try {
      // Fetch from DeFiLlama API
      const defillamaId = DEFILLAMA_PROTOCOL_MAP[protocol.toLowerCase()];
      if (!defillamaId) {
        return rewards;
      }

      const response = await fetch(DEFILLAMA_API);
      if (!response.ok) {
        throw new Error(`DeFiLlama API error: ${response.status}`);
      }

      const data = await response.json();
      const pools = data.data || [];

      // Filter for Base chain and specific protocol
      const basePools = pools.filter((pool: any) =>
        pool.chain?.toLowerCase() === 'base' &&
        pool.project?.toLowerCase() === defillamaId
      );

      for (const pool of basePools) {
        const reward: RewardAPY = {
          protocol,
          asset: pool.symbol || 'Unknown',
          supplyRewardAPY: pool.rewardTokens?.length > 0 ? (pool.apyReward || 0) : 0,
          borrowRewardAPY: 0, // DeFiLlama doesn't typically show borrow rewards
          rewardToken: pool.rewardTokens?.[0] || '',
          rewardTokenSymbol: pool.rewardTokens?.[0]?.symbol || '',
          source: 'defillama',
          updatedAt: Date.now(),
        };

        rewards[pool.underlyingTokens?.[0]?.toLowerCase() || pool.pool] = reward;
      }
    } catch (error) {
      console.warn(`[RewardAPYService] Failed to fetch protocol rewards for ${protocol}:`, error);
    }

    return rewards;
  }

  /**
   * Calculate net APY including rewards
   */
  calculateNetAPY(
    baseAPY: number,
    rewardAPY: number,
    type: 'supply' | 'borrow'
  ): number {
    if (type === 'supply') {
      // Supply: base APY + reward APY
      return baseAPY + rewardAPY;
    } else {
      // Borrow: base APY - reward APY (rewards reduce effective borrow cost)
      return Math.max(0, baseAPY - rewardAPY);
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async fetchFromDeFiLlama(
    protocol: string,
    assetSymbol: string
  ): Promise<RewardAPY | null> {
    const defillamaId = DEFILLAMA_PROTOCOL_MAP[protocol.toLowerCase()];
    if (!defillamaId) {
      return null;
    }

    const response = await fetch(DEFILLAMA_API);
    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }

    const data = await response.json();
    const pools = data.data || [];

    // Find matching pool on Base chain
    const matchingPool = pools.find((pool: any) =>
      pool.chain?.toLowerCase() === 'base' &&
      pool.project?.toLowerCase() === defillamaId &&
      (pool.symbol?.toLowerCase().includes(assetSymbol.toLowerCase()) ||
       assetSymbol.toLowerCase().includes(pool.symbol?.toLowerCase().split('-')[0] || ''))
    );

    if (!matchingPool) {
      return null;
    }

    return {
      protocol,
      asset: assetSymbol,
      supplyRewardAPY: matchingPool.apyReward || 0,
      borrowRewardAPY: 0,
      rewardToken: matchingPool.rewardTokens?.[0] || '',
      rewardTokenSymbol: matchingPool.rewardTokens?.[0]?.symbol || '',
      source: 'defillama',
      updatedAt: Date.now(),
    };
  }

  private getEstimatedReward(protocol: string, assetSymbol: string): RewardAPY {
    const protocolKey = protocol.toLowerCase();
    const estimates = ESTIMATED_REWARDS[protocolKey] || { supply: 0, borrow: 0 };

    // Adjust estimates based on asset type
    let multiplier = 1;
    const symbol = assetSymbol.toLowerCase();

    // Stablecoins typically get higher rewards
    if (['usdc', 'usdt', 'dai', 'usdbc'].includes(symbol)) {
      multiplier = 1.5;
    }
    // ETH-based assets
    else if (['eth', 'weth', 'wsteth', 'cbeth'].includes(symbol)) {
      multiplier = 0.8;
    }

    return {
      protocol,
      asset: assetSymbol,
      supplyRewardAPY: estimates.supply * multiplier,
      borrowRewardAPY: estimates.borrow * multiplier,
      rewardToken: this.getRewardTokenAddress(protocol),
      rewardTokenSymbol: this.getRewardTokenSymbol(protocol),
      source: 'estimated',
      updatedAt: Date.now(),
    };
  }

  private getRewardTokenSymbol(protocol: string): string {
    switch (protocol.toLowerCase()) {
      case 'aave':
        return 'AAVE';
      case 'compound':
        return 'COMP';
      case 'moonwell':
        return 'WELL';
      default:
        return '';
    }
  }

  private getRewardTokenAddress(protocol: string): string {
    // Base chain reward token addresses
    switch (protocol.toLowerCase()) {
      case 'compound':
        return '0x9e1028F5F1D5eDE59748FFceE5532509976840E0'; // COMP on Base
      case 'moonwell':
        return '0xFF8adeC2221f9f4D8dfbAFa6B9a297d17603493D'; // WELL on Base
      case 'aave':
        return '0x63706e401c06ac8513145b7687A14804d17f814b'; // AAVE on Base (if available)
      default:
        return '';
    }
  }

  /**
   * Clear the reward cache
   */
  clearCache(): void {
    cache.rewards.clear();
    cache.lastFetch = 0;
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const rewardAPYService = new RewardAPYService();

// Export class for testing
export { RewardAPYService };
