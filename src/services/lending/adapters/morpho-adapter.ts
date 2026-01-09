/**
 * Morpho Blue Lending Adapter
 *
 * Implements the LendingAdapter interface for Morpho Blue protocol.
 * Morpho Blue uses isolated markets with specific loan/collateral pairs.
 */

import { Address, PublicClient, encodeFunctionData, keccak256, encodeAbiParameters } from 'viem';
import { BaseLendingAdapter } from './base-adapter';
import {
  LendingMarket,
  LendingPosition,
  LendingProtocol,
  TransactionCall,
  SupplyParams,
  WithdrawParams,
  BorrowParams,
  RepayParams,
  EnableCollateralParams,
  LendingActionParams,
  MorphoMarketParams,
} from '@/types/lending';
import { morphoBlueAbi, metaMorphoAbi, erc20Abi } from '@/contracts/lending/abis';
import { BASE_ADDRESSES, WAD, SECONDS_PER_YEAR } from '@/contracts/lending/addresses';

// =============================================================================
// MORPHO BLUE ADAPTER
// =============================================================================

export class MorphoAdapter extends BaseLendingAdapter {
  protocol: LendingProtocol = 'morpho';
  chainId: number;

  private morphoAddress: Address;
  private bundlerAddress?: Address;

  // Cache for market data (reduces RPC calls)
  private marketsCache: Map<string, LendingMarket> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    client: PublicClient,
    chainId: number,
    addresses: {
      morpho: Address;
      bundler?: Address;
    }
  ) {
    super(client, addresses.morpho);
    this.chainId = chainId;
    this.morphoAddress = addresses.morpho;
    this.bundlerAddress = addresses.bundler;
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  /**
   * Get markets from known/curated market list.
   * Morpho has thousands of markets, so we filter to popular ones.
   */
  async getMarkets(): Promise<LendingMarket[]> {
    // Check cache
    if (Date.now() - this.cacheTimestamp < this.CACHE_TTL && this.marketsCache.size > 0) {
      return Array.from(this.marketsCache.values());
    }

    try {
      // Fetch from curated market list
      // In production, this would come from Morpho's API or a curated list
      const curatedMarkets = await this.fetchCuratedMarkets();

      const markets: LendingMarket[] = [];

      for (const marketConfig of curatedMarkets) {
        try {
          const market = await this.fetchMarketData(marketConfig);
          if (market) {
            markets.push(market);
            this.marketsCache.set(market.id, market);
          }
        } catch (error) {
          console.warn(`Failed to fetch Morpho market ${marketConfig.id}:`, error);
        }
      }

      this.cacheTimestamp = Date.now();
      return markets;
    } catch (error) {
      console.error('Error fetching Morpho markets:', error);
      return [];
    }
  }

  async getMarket(marketId: string): Promise<LendingMarket | null> {
    // Check cache first
    if (this.marketsCache.has(marketId)) {
      return this.marketsCache.get(marketId) || null;
    }

    // Fetch fresh data
    const markets = await this.getMarkets();
    return markets.find(m => m.id === marketId) || null;
  }

  async getSupplyRate(marketId: string): Promise<number> {
    const market = await this.getMarket(marketId);
    return market?.supplyAPY || 0;
  }

  async getBorrowRate(marketId: string): Promise<number> {
    const market = await this.getMarket(marketId);
    return market?.borrowAPY || 0;
  }

  // ===========================================================================
  // USER POSITIONS
  // ===========================================================================

  async getUserPositions(userAddress: Address): Promise<LendingPosition[]> {
    try {
      const markets = await this.getMarkets();
      const positions: LendingPosition[] = [];

      for (const market of markets) {
        try {
          // Get user position for this market
          const marketId = market.id as `0x${string}`;

          // Morpho Blue returns position data as a single tuple: [supplyShares, borrowShares, collateral]
          const positionData = await this.client.readContract({
            address: this.morphoAddress,
            abi: morphoBlueAbi,
            functionName: 'position',
            args: [marketId, userAddress],
          });

          const supplyShares = positionData[0];
          const borrowShares = positionData[1];
          const collateral = positionData[2];

          // Skip if no position
          if (supplyShares === 0n && borrowShares === 0n && collateral === 0n) {
            continue;
          }

          // Get market state for conversion
          const marketData = await this.client.readContract({
            address: this.morphoAddress,
            abi: morphoBlueAbi,
            functionName: 'market',
            args: [marketId],
          });

          // Convert shares to assets
          const totalSupplyAssets = marketData[0]; // totalSupplyAssets
          const totalSupplyShares = marketData[1]; // totalSupplyShares
          const totalBorrowAssets = marketData[2]; // totalBorrowAssets
          const totalBorrowShares = marketData[3]; // totalBorrowShares

          const supplyBalance = totalSupplyShares > 0n
            ? (supplyShares * totalSupplyAssets) / totalSupplyShares
            : 0n;

          const borrowBalance = totalBorrowShares > 0n
            ? (borrowShares * totalBorrowAssets) / totalBorrowShares
            : 0n;

          // Calculate USD values (simplified - would use oracle prices in production)
          const supplyBalanceUSD = Number(supplyBalance) / 10 ** market.assetDecimals;
          const borrowBalanceUSD = Number(borrowBalance) / 10 ** market.assetDecimals;

          positions.push({
            id: `morpho-${marketId}-${userAddress.toLowerCase()}`,
            protocol: 'morpho',
            marketId: market.id,
            userAddress,
            chainId: this.chainId,

            asset: market.asset,
            assetSymbol: market.assetSymbol,
            assetDecimals: market.assetDecimals,

            supplyBalance,
            supplyBalanceUSD,
            supplyShares,

            borrowBalance,
            borrowBalanceUSD,
            borrowShares,

            // Morpho also tracks collateral separately
            collateralBalance: collateral,

            currentSupplyAPY: market.supplyAPY,
            currentBorrowAPY: market.borrowAPY,

            isCollateralEnabled: collateral > 0n,

            lastUpdated: Date.now(),
          });
        } catch (error) {
          console.warn(`Error fetching position for market ${market.id}:`, error);
        }
      }

      // Calculate health factor for positions with borrows
      for (const position of positions) {
        if (position.borrowBalance > 0n) {
          position.healthFactor = await this.calculatePositionHealthFactor(
            userAddress,
            position.marketId as `0x${string}`
          );
        }
      }

      return positions;
    } catch (error) {
      console.error('Error fetching Morpho user positions:', error);
      return [];
    }
  }

  // ===========================================================================
  // TRANSACTION BUILDING
  // ===========================================================================

  async buildSupply(params: SupplyParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];
    const marketId = params.marketId as `0x${string}`;

    // Get market params
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    // Check and add approval for the loan token
    const approval = await this.buildApprovalIfNeeded(
      marketParams.loanToken,
      params.userAddress,
      this.morphoAddress,
      params.amount
    );
    if (approval) {
      calls.push(approval);
    }

    // Build supply call
    // For Morpho, supply takes: marketParams, assets, shares (0 for asset-based), onBehalf, data
    calls.push({
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'supply',
        args: [
          marketParams,
          params.amount,
          0n, // shares = 0 means we're specifying assets
          params.userAddress,
          '0x', // callback data
        ],
      }),
      description: `Supply ${await this.getTokenSymbol(marketParams.loanToken)} to Morpho`,
    });

    return calls;
  }

  async buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]> {
    const marketId = params.marketId as `0x${string}`;

    // Get market params
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    // For max withdraw, we need to get user's supply shares
    let assets = params.amount;
    let shares = 0n;

    if (params.maxWithdraw) {
      // Get user's supply shares from position data and withdraw all
      const positionData = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'position',
        args: [marketId, params.userAddress],
      });
      shares = positionData[0]; // supplyShares is first element
      assets = 0n; // When specifying shares, set assets to 0
    }

    return [{
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'withdraw',
        args: [
          marketParams,
          assets,
          shares,
          params.userAddress,
          params.userAddress, // receiver
        ],
      }),
      description: `Withdraw ${await this.getTokenSymbol(marketParams.loanToken)} from Morpho`,
    }];
  }

  async buildBorrow(params: BorrowParams): Promise<TransactionCall[]> {
    const marketId = params.marketId as `0x${string}`;

    // Get market params
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    return [{
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'borrow',
        args: [
          marketParams,
          params.amount,
          0n, // shares = 0 means we're specifying assets
          params.userAddress,
          params.userAddress, // receiver
        ],
      }),
      description: `Borrow ${await this.getTokenSymbol(marketParams.loanToken)} from Morpho`,
    }];
  }

  async buildRepay(params: RepayParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];
    const marketId = params.marketId as `0x${string}`;

    // Get market params
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    // For max repay, get user's borrow shares
    let assets = params.amount;
    let shares = 0n;

    if (params.maxRepay) {
      // Get user's borrow shares from position data
      const positionData = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'position',
        args: [marketId, params.userAddress],
      });
      shares = positionData[1]; // borrowShares is second element
      assets = 0n;
    }

    // Check and add approval
    const approvalAmount = params.maxRepay ? 2n ** 256n - 1n : params.amount;
    const approval = await this.buildApprovalIfNeeded(
      marketParams.loanToken,
      params.userAddress,
      this.morphoAddress,
      approvalAmount
    );
    if (approval) {
      calls.push(approval);
    }

    calls.push({
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'repay',
        args: [
          marketParams,
          assets,
          shares,
          params.userAddress,
          '0x', // callback data
        ],
      }),
      description: `Repay ${await this.getTokenSymbol(marketParams.loanToken)} to Morpho`,
    });

    return calls;
  }

  /**
   * For Morpho, "enabling collateral" means supplying collateral to the market.
   * This is different from Aave where collateral is automatically enabled on supply.
   */
  async buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];
    const marketId = params.marketId as `0x${string}`;

    // Get market params
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    if (params.enable) {
      // To enable as collateral in Morpho, user supplies collateral token
      // This requires the user to have the collateral token and specify amount
      // For now, we just build the approval - actual collateral supply is separate
      const approval = await this.buildApprovalIfNeeded(
        marketParams.collateralToken,
        params.userAddress,
        this.morphoAddress,
        2n ** 256n - 1n // Max approval for future deposits
      );
      if (approval) {
        calls.push({
          ...approval,
          description: `Approve ${await this.getTokenSymbol(marketParams.collateralToken)} as collateral for Morpho`,
        });
      }
    }

    // Note: Morpho doesn't have a "disable collateral" like Aave
    // Collateral is withdrawn, not disabled

    return calls;
  }

  /**
   * Build collateral supply transaction (Morpho-specific)
   */
  async buildSupplyCollateral(
    marketId: `0x${string}`,
    amount: bigint,
    userAddress: Address
  ): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];

    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    // Check and add approval
    const approval = await this.buildApprovalIfNeeded(
      marketParams.collateralToken,
      userAddress,
      this.morphoAddress,
      amount
    );
    if (approval) {
      calls.push(approval);
    }

    calls.push({
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'supplyCollateral',
        args: [
          marketParams,
          amount,
          userAddress,
          '0x',
        ],
      }),
      description: `Supply ${await this.getTokenSymbol(marketParams.collateralToken)} as collateral to Morpho`,
    });

    return calls;
  }

  /**
   * Build collateral withdrawal transaction (Morpho-specific)
   */
  async buildWithdrawCollateral(
    marketId: `0x${string}`,
    amount: bigint,
    userAddress: Address
  ): Promise<TransactionCall[]> {
    const marketParams = await this.getMarketParams(marketId);
    if (!marketParams) {
      throw new Error('Market not found');
    }

    return [{
      to: this.morphoAddress,
      data: encodeFunctionData({
        abi: morphoBlueAbi,
        functionName: 'withdrawCollateral',
        args: [
          marketParams,
          amount,
          userAddress,
          userAddress, // receiver
        ],
      }),
      description: `Withdraw ${await this.getTokenSymbol(marketParams.collateralToken)} collateral from Morpho`,
    }];
  }

  // ===========================================================================
  // HEALTH FACTOR
  // ===========================================================================

  async calculateHealthFactor(userAddress: Address): Promise<number> {
    // For Morpho, health factor is per-market, not global
    // Return the minimum health factor across all positions
    const positions = await this.getUserPositions(userAddress);
    const borrowingPositions = positions.filter(p => p.borrowBalance > 0n);

    if (borrowingPositions.length === 0) {
      return Infinity;
    }

    const healthFactors = borrowingPositions.map(p => p.healthFactor || Infinity);
    return Math.min(...healthFactors);
  }

  /**
   * Calculate health factor for a specific market position
   */
  private async calculatePositionHealthFactor(
    userAddress: Address,
    marketId: `0x${string}`
  ): Promise<number> {
    try {
      const marketParams = await this.getMarketParams(marketId);
      if (!marketParams) return Infinity;

      // Get user's position data (supplyShares, borrowShares, collateral)
      const positionData = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'position',
        args: [marketId, userAddress],
      });

      const borrowShares = positionData[1]; // borrowShares is second element
      const collateral = positionData[2]; // collateral is third element

      if (borrowShares === 0n) return Infinity;

      // Get market data for share-to-asset conversion
      const marketData = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'market',
        args: [marketId],
      });

      const totalBorrowAssets = marketData[2];
      const totalBorrowShares = marketData[3];

      const borrowBalance = totalBorrowShares > 0n
        ? (borrowShares * totalBorrowAssets) / totalBorrowShares
        : 0n;

      if (borrowBalance === 0n) return Infinity;

      // Get oracle price
      // collateralValue / borrowValue * LLTV = maxBorrowable
      // HF = collateralValue * LLTV / borrowValue
      const lltv = marketParams.lltv;

      // Simplified HF calculation (assumes 1:1 price ratio for same-decimals assets)
      // In production, would use the oracle for accurate price
      const collateralValue = collateral;
      const borrowValue = borrowBalance;

      // HF = (collateral * lltv) / debt
      const hf = Number(collateralValue * lltv) / (Number(borrowValue) * Number(WAD));

      return hf;
    } catch (error) {
      console.error('Error calculating Morpho health factor:', error);
      return Infinity;
    }
  }

  async simulateHealthFactor(
    userAddress: Address,
    action: LendingActionParams
  ): Promise<number> {
    try {
      // Get current health factor
      const currentHF = await this.calculateHealthFactor(userAddress);

      if (currentHF === Infinity) {
        // No position yet - if borrowing, estimate new HF
        if (action.action === 'borrow') {
          // Would need collateral info to calculate accurately
          return 2.0; // Conservative estimate for new position
        }
        return Infinity;
      }

      // Get user's positions to calculate current state
      const positions = await this.getUserPositions(userAddress);
      const position = positions.find(p => p.marketId === action.marketId);

      if (!position) {
        // Fall back to rough estimate for new positions
        return this.roughEstimateHF(currentHF, action.action);
      }

      const collateralUSD = position.supplyBalanceUSD;
      const debtUSD = position.borrowBalanceUSD;

      // Get action value in USD
      const market = await this.getMarket(action.marketId);
      const actionAmountNum = Number(action.amount) / Math.pow(10, market?.assetDecimals || 18);
      // Calculate asset price from market USD values
      const assetPrice = market && market.totalSupply > 0n
        ? market.totalSupplyUSD / (Number(market.totalSupply) / Math.pow(10, market.assetDecimals))
        : 0;
      const actionValueUSD = actionAmountNum * assetPrice;

      // Calculate new values
      let newCollateral = collateralUSD;
      let newDebt = debtUSD;

      switch (action.action) {
        case 'supply':
          newCollateral += actionValueUSD;
          break;
        case 'withdraw':
          newCollateral = Math.max(0, newCollateral - actionValueUSD);
          break;
        case 'borrow':
          newDebt += actionValueUSD;
          break;
        case 'repay':
          newDebt = Math.max(0, newDebt - actionValueUSD);
          break;
      }

      if (newDebt === 0) return Infinity;

      // Calculate projected HF using market's liquidation threshold
      const liqThreshold = market?.liquidationThreshold || 0.825;
      return (newCollateral * liqThreshold) / newDebt;
    } catch (error) {
      console.warn('Morpho HF simulation failed, using rough estimate:', error);
      const currentHF = await this.calculateHealthFactor(userAddress);
      return this.roughEstimateHF(currentHF, action.action);
    }
  }

  /**
   * Rough health factor estimate as fallback
   */
  private roughEstimateHF(currentHF: number, action: string): number {
    switch (action) {
      case 'withdraw':
        return currentHF * 0.85;
      case 'borrow':
        return currentHF * 0.8;
      case 'supply':
        return currentHF * 1.15;
      case 'repay':
        return currentHF * 1.2;
      default:
        return currentHF;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Get MarketParams struct for a market ID
   */
  private async getMarketParams(marketId: `0x${string}`): Promise<MorphoMarketParams | null> {
    try {
      const result = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'idToMarketParams',
        args: [marketId],
      });

      // Handle case where contract doesn't exist or returns empty data
      if (!result || !Array.isArray(result) || result.length < 5) {
        console.warn(`Morpho market params not found for market ${marketId}`);
        return null;
      }

      const [loanToken, collateralToken, oracle, irm, lltv] = result;

      return {
        loanToken,
        collateralToken,
        oracle,
        irm,
        lltv,
      };
    } catch (error) {
      console.error('Error getting market params:', error);
      return null;
    }
  }

  /**
   * Compute market ID from MarketParams
   */
  private computeMarketId(params: MorphoMarketParams): `0x${string}` {
    const encoded = encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    );
    return keccak256(encoded);
  }

  /**
   * Fetch curated/popular markets
   * In production, this would come from Morpho's API
   */
  private async fetchCuratedMarkets(): Promise<{ id: `0x${string}`; name: string }[]> {
    // These are example popular markets on Base
    // In production, fetch from Morpho API: https://api.morpho.org/graphql
    return [
      // USDC markets (popular lending markets)
      {
        id: '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda' as `0x${string}`,
        name: 'USDC/WETH',
      },
      {
        id: '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49' as `0x${string}`,
        name: 'USDC/cbBTC',
      },
      // Add more curated markets as needed
    ];
  }

  /**
   * Fetch market data from on-chain
   */
  private async fetchMarketData(
    marketConfig: { id: `0x${string}`; name: string }
  ): Promise<LendingMarket | null> {
    try {
      const marketId = marketConfig.id;

      // Get market params
      const marketParams = await this.getMarketParams(marketId);
      if (!marketParams) return null;

      // Get market state
      const marketData = await this.client.readContract({
        address: this.morphoAddress,
        abi: morphoBlueAbi,
        functionName: 'market',
        args: [marketId],
      });

      const totalSupplyAssets = marketData[0];
      const totalSupplyShares = marketData[1];
      const totalBorrowAssets = marketData[2];
      const totalBorrowShares = marketData[3];
      const lastUpdate = marketData[4];
      const fee = marketData[5];

      // Get token info
      const [loanSymbol, loanDecimals, collateralSymbol] = await Promise.all([
        this.getTokenSymbol(marketParams.loanToken),
        this.getTokenDecimals(marketParams.loanToken),
        this.getTokenSymbol(marketParams.collateralToken),
      ]);

      // Calculate utilization
      const utilization = totalSupplyAssets > 0n
        ? Number(totalBorrowAssets) / Number(totalSupplyAssets)
        : 0;

      // Get current rates from IRM
      const { supplyAPY, borrowAPY } = await this.fetchRates(
        marketParams.irm,
        totalBorrowAssets,
        totalSupplyAssets
      );

      // Calculate LTV from LLTV (Morpho uses LLTV - Liquidation LTV)
      const ltv = Number(marketParams.lltv) / Number(WAD);
      const liquidationThreshold = ltv;

      return {
        id: marketId,
        protocol: 'morpho',
        chainId: this.chainId,

        asset: marketParams.loanToken,
        assetSymbol: loanSymbol,
        assetName: marketConfig.name,
        assetDecimals: loanDecimals,
        assetCategory: this.categorizeAsset(loanSymbol),

        // Morpho is loan/collateral pair
        collateralAsset: marketParams.collateralToken,
        collateralSymbol,

        supplyAPY,
        borrowAPY,
        netSupplyAPY: supplyAPY,
        netBorrowAPY: borrowAPY,

        totalSupply: totalSupplyAssets,
        totalSupplyUSD: 0, // Would need oracle for USD value
        totalBorrow: totalBorrowAssets,
        totalBorrowUSD: 0,
        availableLiquidity: totalSupplyAssets - totalBorrowAssets,
        availableLiquidityUSD: 0,
        utilization,

        ltv,
        liquidationThreshold,
        liquidationPenalty: 0, // Morpho liquidation is different

        supplyCap: 0n, // Morpho has no caps
        borrowCap: 0n,

        isActive: true,
        isFrozen: false,
        isPaused: false,
        canSupply: true,
        canBorrow: true,
        canUseAsCollateral: true,

        // Morpho-specific
        morphoMarketParams: marketParams,
        morphoFee: Number(fee) / Number(WAD),

        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching Morpho market data:', error);
      return null;
    }
  }

  /**
   * Fetch interest rates from IRM (Interest Rate Model)
   */
  private async fetchRates(
    irm: Address,
    borrowed: bigint,
    supplied: bigint
  ): Promise<{ supplyAPY: number; borrowAPY: number }> {
    try {
      // Get borrow rate from IRM
      const borrowRatePerSecond = await this.client.readContract({
        address: irm,
        abi: [
          {
            name: 'borrowRate',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'marketParams', type: 'tuple', components: [
                { name: 'loanToken', type: 'address' },
                { name: 'collateralToken', type: 'address' },
                { name: 'oracle', type: 'address' },
                { name: 'irm', type: 'address' },
                { name: 'lltv', type: 'uint256' },
              ]},
              { name: 'market', type: 'tuple', components: [
                { name: 'totalSupplyAssets', type: 'uint128' },
                { name: 'totalSupplyShares', type: 'uint128' },
                { name: 'totalBorrowAssets', type: 'uint128' },
                { name: 'totalBorrowShares', type: 'uint128' },
                { name: 'lastUpdate', type: 'uint128' },
                { name: 'fee', type: 'uint128' },
              ]},
            ],
            outputs: [{ type: 'uint256' }],
          },
        ],
        functionName: 'borrowRate',
        args: [
          { loanToken: '0x' as Address, collateralToken: '0x' as Address, oracle: '0x' as Address, irm, lltv: 0n },
          { totalSupplyAssets: supplied, totalSupplyShares: 0n, totalBorrowAssets: borrowed, totalBorrowShares: 0n, lastUpdate: 0n, fee: 0n },
        ],
      });

      // Convert to APY
      const borrowAPY = this.rateToAPY(borrowRatePerSecond, false);

      // Supply APY = Borrow APY * utilization
      const utilization = supplied > 0n ? Number(borrowed) / Number(supplied) : 0;
      const supplyAPY = borrowAPY * utilization;

      return { supplyAPY, borrowAPY };
    } catch (error) {
      // Fallback to estimated rates
      return { supplyAPY: 3.0, borrowAPY: 5.0 };
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMorphoAdapter(
  client: PublicClient,
  chainId: number = 8453 // Base mainnet
): MorphoAdapter {
  const addresses = BASE_ADDRESSES.morpho;

  return new MorphoAdapter(client, chainId, {
    morpho: addresses.core,
    bundler: addresses.bundler,
  });
}
