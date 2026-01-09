/**
 * Unified Lending Service
 *
 * Aggregates all lending protocol adapters and provides a unified interface
 * for lending operations across multiple protocols.
 */

import { Address, PublicClient } from 'viem';
import {
  LendingAdapter,
  LendingMarket,
  LendingPosition,
  LendingProtocol,
  TransactionCall,
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  EnableCollateralParams,
  ValidationResult,
  LendingActionParams,
  RoutingSuggestion,
  RoutingAlternative,
} from '@/types/lending';
import { createAllAdapters, PROTOCOL_INFO, SUPPORTED_PROTOCOLS, isLendingNetworkSupported, getSupportedProtocolsForChain } from './adapters';
import { IS_TESTNET } from '@/lib/smart-wallet';
import { generateMockLendingPositions } from '@/services/mock-data';

// =============================================================================
// TYPES
// =============================================================================

export interface AggregatedMarkets {
  all: LendingMarket[];
  byProtocol: Record<LendingProtocol, LendingMarket[]>;
  byAsset: Record<string, LendingMarket[]>; // Grouped by asset symbol
}

export interface AggregatedPositions {
  all: LendingPosition[];
  byProtocol: Record<LendingProtocol, LendingPosition[]>;
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  netWorthUSD: number;
  weightedAvgSupplyAPY: number;
  weightedAvgBorrowAPY: number;
  lowestHealthFactor: number;
}

// =============================================================================
// LENDING SERVICE
// =============================================================================

export class LendingService {
  private adapters: Map<LendingProtocol, LendingAdapter>;
  private client: PublicClient;
  private chainId: number;
  private isNetworkSupported: boolean;

  // Cache
  private marketsCache: AggregatedMarkets | null = null;
  private marketsCacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(client: PublicClient, chainId: number = 8453) {
    this.client = client;
    this.chainId = chainId;
    this.isNetworkSupported = isLendingNetworkSupported(chainId);
    this.adapters = createAllAdapters(client, chainId);
  }

  /**
   * Check if lending is supported on the current network
   */
  isSupported(): boolean {
    return this.isNetworkSupported;
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  /**
   * Get all markets from all protocols
   * Returns empty results on unsupported networks (testnets)
   */
  async getMarkets(forceRefresh: boolean = false): Promise<AggregatedMarkets> {
    // Return empty results immediately if network not supported
    if (!this.isNetworkSupported) {
      return {
        all: [],
        byProtocol: { aave: [], morpho: [], compound: [], moonwell: [] },
        byAsset: {},
      };
    }

    // Check cache
    if (
      !forceRefresh &&
      this.marketsCache &&
      Date.now() - this.marketsCacheTimestamp < this.CACHE_TTL
    ) {
      return this.marketsCache;
    }

    const all: LendingMarket[] = [];
    const byProtocol: Record<LendingProtocol, LendingMarket[]> = {
      aave: [],
      morpho: [],
      compound: [],
      moonwell: [],
    };
    const byAsset: Record<string, LendingMarket[]> = {};

    // Fetch from all adapters in parallel
    const results = await Promise.allSettled(
      SUPPORTED_PROTOCOLS.map(async (protocol) => {
        const adapter = this.adapters.get(protocol);
        if (!adapter) return { protocol, markets: [] };
        const markets = await adapter.getMarkets();
        return { protocol, markets };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { protocol, markets } = result.value;
        all.push(...markets);
        byProtocol[protocol] = markets;

        // Group by asset
        for (const market of markets) {
          const assetKey = market.assetSymbol.toUpperCase();
          if (!byAsset[assetKey]) {
            byAsset[assetKey] = [];
          }
          byAsset[assetKey].push(market);
        }
      }
    }

    // Sort markets by TVL (totalSupplyUSD)
    all.sort((a, b) => b.totalSupplyUSD - a.totalSupplyUSD);

    this.marketsCache = { all, byProtocol, byAsset };
    this.marketsCacheTimestamp = Date.now();

    return this.marketsCache;
  }

  /**
   * Get a specific market
   */
  async getMarket(
    protocol: LendingProtocol,
    marketId: string
  ): Promise<LendingMarket | null> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) return null;
    return adapter.getMarket(marketId);
  }

  /**
   * Get markets for a specific asset across all protocols
   */
  async getMarketsForAsset(assetSymbol: string): Promise<LendingMarket[]> {
    const markets = await this.getMarkets();
    return markets.byAsset[assetSymbol.toUpperCase()] || [];
  }

  // ===========================================================================
  // USER POSITIONS
  // ===========================================================================

  /**
   * Get all user positions across all protocols
   * Returns empty results on unsupported networks (testnets)
   */
  async getUserPositions(userAddress: Address): Promise<AggregatedPositions> {
    // Return empty results immediately if network not supported
    if (!this.isNetworkSupported) {
      console.log('[Lending Service] Network not supported, returning empty positions');
      return {
        all: [],
        byProtocol: { aave: [], morpho: [], compound: [], moonwell: [] },
        totalSupplyUSD: 0,
        totalBorrowUSD: 0,
        netWorthUSD: 0,
        weightedAvgSupplyAPY: 0,
        weightedAvgBorrowAPY: 0,
        lowestHealthFactor: Infinity,
      };
    }

    // Get supported protocols for this chain
    const supportedProtocols = getSupportedProtocolsForChain(this.chainId);
    const networkName = IS_TESTNET ? 'Base Sepolia (testnet)' : 'Base Mainnet';

    console.log(
      `[Lending Service] Fetching positions for ${userAddress.slice(0, 6)}...${userAddress.slice(-4)} from ${supportedProtocols.length} protocol(s) on ${networkName}`,
      { protocols: supportedProtocols }
    );

    const all: LendingPosition[] = [];
    const byProtocol: Record<LendingProtocol, LendingPosition[]> = {
      aave: [],
      morpho: [],
      compound: [],
      moonwell: [],
    };

    // Fetch from supported adapters only
    const results = await Promise.allSettled(
      supportedProtocols.map(async (protocol) => {
        const adapter = this.adapters.get(protocol);
        if (!adapter) {
          console.warn(`[Lending Service] No adapter found for ${protocol}`);
          return { protocol, positions: [] };
        }

        try {
          const positions = await adapter.getUserPositions(userAddress);
          console.log(`[Lending Service] ✓ ${protocol}: ${positions.length} position(s)`);
          return { protocol, positions };
        } catch (error) {
          console.warn(`[Lending Service] ✗ ${protocol} failed:`, error);
          return { protocol, positions: [] };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { protocol, positions } = result.value;
        all.push(...positions);
        byProtocol[protocol] = positions;
      }
    }

    // On testnet, optionally add mock positions for testing UI
    // (Only if no real positions found and user wants to see mock data)
    if (IS_TESTNET && all.length === 0) {
      const mockPositions = generateMockLendingPositions(userAddress);
      if (mockPositions.length > 0) {
        console.log(`[Lending Service] 📋 Adding ${mockPositions.length} mock positions for testnet UI testing`);
        all.push(...mockPositions);
        // Categorize mock positions
        mockPositions.forEach(pos => {
          byProtocol[pos.protocol]?.push(pos);
        });
      }
    }

    // Calculate aggregated stats
    let totalSupplyUSD = 0;
    let totalBorrowUSD = 0;
    let weightedSupplyAPY = 0;
    let weightedBorrowAPY = 0;
    let lowestHealthFactor = Infinity;

    for (const position of all) {
      totalSupplyUSD += position.supplyBalanceUSD;
      totalBorrowUSD += position.borrowBalanceUSD;

      weightedSupplyAPY += position.currentSupplyAPY * position.supplyBalanceUSD;
      weightedBorrowAPY += position.currentBorrowAPY * position.borrowBalanceUSD;

      if (position.healthFactor && position.healthFactor < lowestHealthFactor) {
        lowestHealthFactor = position.healthFactor;
      }
    }

    const weightedAvgSupplyAPY =
      totalSupplyUSD > 0 ? weightedSupplyAPY / totalSupplyUSD : 0;
    const weightedAvgBorrowAPY =
      totalBorrowUSD > 0 ? weightedBorrowAPY / totalBorrowUSD : 0;

    return {
      all,
      byProtocol,
      totalSupplyUSD,
      totalBorrowUSD,
      netWorthUSD: totalSupplyUSD - totalBorrowUSD,
      weightedAvgSupplyAPY,
      weightedAvgBorrowAPY,
      lowestHealthFactor,
    };
  }

  /**
   * Get positions for a specific protocol
   */
  async getProtocolPositions(
    protocol: LendingProtocol,
    userAddress: Address
  ): Promise<LendingPosition[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) return [];
    return adapter.getUserPositions(userAddress);
  }

  // ===========================================================================
  // SMART ROUTING (Suggestions, not forced)
  // ===========================================================================

  /**
   * Get routing suggestions for a supply action
   * Returns the best option as recommendation with alternatives
   */
  async getSupplyRoutingSuggestion(
    assetSymbol: string,
    amount: bigint,
    userAddress: Address
  ): Promise<RoutingSuggestion | null> {
    const markets = await this.getMarketsForAsset(assetSymbol);

    if (markets.length === 0) return null;

    // Filter to markets that can supply
    const supplyableMarkets = markets.filter(
      (m) => m.canSupply && m.isActive && !m.isFrozen
    );

    if (supplyableMarkets.length === 0) return null;

    // Sort by net supply APY (highest first)
    const sorted = [...supplyableMarkets].sort(
      (a, b) => b.netSupplyAPY - a.netSupplyAPY
    );

    const recommended = sorted[0];
    const alternatives: RoutingAlternative[] = sorted.slice(1).map((market) => ({
      protocol: market.protocol,
      marketId: market.id,
      apy: market.netSupplyAPY,
      reason: this.getAlternativeReason(market, recommended, 'supply'),
    }));

    return {
      recommended: recommended.protocol,
      recommendedMarketId: recommended.id,
      reason: 'highest_apy',
      reasonDetails: `${recommended.protocol} offers the highest APY at ${recommended.netSupplyAPY.toFixed(2)}%`,
      projectedAPY: recommended.netSupplyAPY,
      alternatives,
    };
  }

  /**
   * Get routing suggestions for a borrow action
   */
  async getBorrowRoutingSuggestion(
    assetSymbol: string,
    amount: bigint,
    userAddress: Address
  ): Promise<RoutingSuggestion | null> {
    const markets = await this.getMarketsForAsset(assetSymbol);

    if (markets.length === 0) return null;

    // Filter to markets that can borrow and have enough liquidity
    const borrowableMarkets = markets.filter(
      (m) =>
        m.canBorrow &&
        m.isActive &&
        !m.isFrozen &&
        m.availableLiquidity >= amount
    );

    if (borrowableMarkets.length === 0) return null;

    // Sort by borrow APY (lowest first - cheaper to borrow)
    const sorted = [...borrowableMarkets].sort(
      (a, b) => a.netBorrowAPY - b.netBorrowAPY
    );

    const recommended = sorted[0];
    const alternatives: RoutingAlternative[] = sorted.slice(1).map((market) => ({
      protocol: market.protocol,
      marketId: market.id,
      apy: market.netBorrowAPY,
      reason: this.getAlternativeReason(market, recommended, 'borrow'),
    }));

    return {
      recommended: recommended.protocol,
      recommendedMarketId: recommended.id,
      reason: 'lowest_rate',
      reasonDetails: `${recommended.protocol} offers the lowest borrow rate at ${recommended.netBorrowAPY.toFixed(2)}%`,
      projectedAPY: recommended.netBorrowAPY,
      alternatives,
    };
  }

  private getAlternativeReason(
    market: LendingMarket,
    recommended: LendingMarket,
    action: 'supply' | 'borrow'
  ): string {
    if (action === 'supply') {
      const diff = recommended.netSupplyAPY - market.netSupplyAPY;
      return `${diff.toFixed(2)}% lower APY`;
    } else {
      const diff = market.netBorrowAPY - recommended.netBorrowAPY;
      return `${diff.toFixed(2)}% higher rate`;
    }
  }

  // ===========================================================================
  // TRANSACTION BUILDING
  // ===========================================================================

  /**
   * Build supply transaction
   */
  async buildSupply(
    protocol: LendingProtocol,
    params: SupplyParams
  ): Promise<TransactionCall[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) throw new Error(`Protocol ${protocol} not supported`);
    return adapter.buildSupply(params);
  }

  /**
   * Build withdraw transaction
   */
  async buildWithdraw(
    protocol: LendingProtocol,
    params: WithdrawParams
  ): Promise<TransactionCall[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) throw new Error(`Protocol ${protocol} not supported`);
    return adapter.buildWithdraw(params);
  }

  /**
   * Build borrow transaction
   */
  async buildBorrow(
    protocol: LendingProtocol,
    params: BorrowParams
  ): Promise<TransactionCall[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) throw new Error(`Protocol ${protocol} not supported`);
    return adapter.buildBorrow(params);
  }

  /**
   * Build repay transaction
   */
  async buildRepay(
    protocol: LendingProtocol,
    params: RepayParams
  ): Promise<TransactionCall[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) throw new Error(`Protocol ${protocol} not supported`);
    return adapter.buildRepay(params);
  }

  /**
   * Build enable/disable collateral transaction
   */
  async buildEnableCollateral(
    protocol: LendingProtocol,
    params: EnableCollateralParams
  ): Promise<TransactionCall[]> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) throw new Error(`Protocol ${protocol} not supported`);
    return adapter.buildEnableCollateral(params);
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  /**
   * Validate a supply action
   */
  async validateSupply(
    protocol: LendingProtocol,
    params: SupplyParams
  ): Promise<ValidationResult> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      return {
        valid: false,
        errors: [{ code: 'PROTOCOL_NOT_SUPPORTED', message: `Protocol ${protocol} not supported` }],
        warnings: [],
      };
    }
    return adapter.validateSupply(params);
  }

  /**
   * Validate a withdraw action
   */
  async validateWithdraw(
    protocol: LendingProtocol,
    params: WithdrawParams
  ): Promise<ValidationResult> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      return {
        valid: false,
        errors: [{ code: 'PROTOCOL_NOT_SUPPORTED', message: `Protocol ${protocol} not supported` }],
        warnings: [],
      };
    }
    return adapter.validateWithdraw(params);
  }

  /**
   * Validate a borrow action
   */
  async validateBorrow(
    protocol: LendingProtocol,
    params: BorrowParams
  ): Promise<ValidationResult> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      return {
        valid: false,
        errors: [{ code: 'PROTOCOL_NOT_SUPPORTED', message: `Protocol ${protocol} not supported` }],
        warnings: [],
      };
    }
    return adapter.validateBorrow(params);
  }

  /**
   * Validate a repay action
   */
  async validateRepay(
    protocol: LendingProtocol,
    params: RepayParams
  ): Promise<ValidationResult> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) {
      return {
        valid: false,
        errors: [{ code: 'PROTOCOL_NOT_SUPPORTED', message: `Protocol ${protocol} not supported` }],
        warnings: [],
      };
    }
    return adapter.validateRepay(params);
  }

  // ===========================================================================
  // HEALTH FACTOR
  // ===========================================================================

  /**
   * Get health factor for a specific protocol
   */
  async getHealthFactor(
    protocol: LendingProtocol,
    userAddress: Address
  ): Promise<number> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) return Infinity;
    return adapter.calculateHealthFactor(userAddress);
  }

  /**
   * Simulate health factor after an action
   */
  async simulateHealthFactor(
    protocol: LendingProtocol,
    userAddress: Address,
    action: LendingActionParams
  ): Promise<number> {
    const adapter = this.adapters.get(protocol);
    if (!adapter) return Infinity;
    return adapter.simulateHealthFactor(userAddress, action);
  }

  /**
   * Get lowest health factor across all protocols
   */
  async getLowestHealthFactor(userAddress: Address): Promise<{
    healthFactor: number;
    protocol: LendingProtocol | null;
  }> {
    let lowestHF = Infinity;
    let lowestProtocol: LendingProtocol | null = null;

    const results = await Promise.allSettled(
      SUPPORTED_PROTOCOLS.map(async (protocol) => {
        const hf = await this.getHealthFactor(protocol, userAddress);
        return { protocol, hf };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { protocol, hf } = result.value;
        if (hf < lowestHF) {
          lowestHF = hf;
          lowestProtocol = protocol;
        }
      }
    }

    return { healthFactor: lowestHF, protocol: lowestProtocol };
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Get protocol info
   */
  getProtocolInfo(protocol: LendingProtocol) {
    return PROTOCOL_INFO[protocol];
  }

  /**
   * Get all protocol info
   */
  getAllProtocolInfo() {
    return PROTOCOL_INFO;
  }

  /**
   * Check if a protocol is supported
   */
  isProtocolSupported(protocol: string): protocol is LendingProtocol {
    return SUPPORTED_PROTOCOLS.includes(protocol as LendingProtocol);
  }

  /**
   * Get supported protocols
   */
  getSupportedProtocols(): LendingProtocol[] {
    return [...SUPPORTED_PROTOCOLS];
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.marketsCache = null;
    this.marketsCacheTimestamp = 0;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let lendingServiceInstance: LendingService | null = null;

/**
 * Get or create the lending service singleton
 */
export function getLendingService(
  client: PublicClient,
  chainId: number = 8453
): LendingService {
  if (!lendingServiceInstance) {
    lendingServiceInstance = new LendingService(client, chainId);
  }
  return lendingServiceInstance;
}

/**
 * Create a new lending service instance
 */
export function createLendingService(
  client: PublicClient,
  chainId: number = 8453
): LendingService {
  return new LendingService(client, chainId);
}
