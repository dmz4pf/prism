/**
 * Compound III (Comet) Lending Adapter
 *
 * Implements the LendingAdapter interface for Compound III protocol.
 * Compound III uses a single-asset model where one base asset (e.g., USDC)
 * can be borrowed against multiple collateral assets.
 */

import { Address, PublicClient, encodeFunctionData } from 'viem';
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
} from '@/types/lending';
import { compoundCometAbi, compoundRewardsAbi, erc20Abi } from '@/contracts/lending/abis';
import { BASE_ADDRESSES, SECONDS_PER_YEAR } from '@/contracts/lending/addresses';
import { rewardAPYService } from '../reward-apy-service';

// =============================================================================
// TYPES
// =============================================================================

interface CompoundAssetInfo {
  offset: number;
  asset: Address;
  priceFeed: Address;
  scale: bigint;
  borrowCollateralFactor: bigint;
  liquidateCollateralFactor: bigint;
  liquidationFactor: bigint;
  supplyCap: bigint;
}

// =============================================================================
// COMPOUND III ADAPTER
// =============================================================================

export class CompoundAdapter extends BaseLendingAdapter {
  protocol: LendingProtocol = 'compound';
  chainId: number;

  private cometAddress: Address;
  private rewardsAddress?: Address;

  // Base token info (e.g., USDC)
  private baseToken?: Address;
  private baseScale?: bigint;
  private baseDecimals?: number;
  private baseSymbol?: string;

  // Collateral assets cache
  private collateralAssets: CompoundAssetInfo[] = [];

  constructor(
    client: PublicClient,
    chainId: number,
    addresses: {
      comet: Address;
      rewards?: Address;
    }
  ) {
    super(client, addresses.comet);
    this.chainId = chainId;
    this.cometAddress = addresses.comet;
    this.rewardsAddress = addresses.rewards;
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize base token and collateral info
   */
  private async ensureInitialized(): Promise<void> {
    if (this.baseToken) return;

    // Get base token info
    const [baseToken, baseScale] = await Promise.all([
      this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'baseToken',
      }),
      this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'baseScale',
      }),
    ]);

    this.baseToken = baseToken;
    this.baseScale = baseScale;

    // Get base token metadata
    const [symbol, decimals] = await Promise.all([
      this.getTokenSymbol(baseToken),
      this.getTokenDecimals(baseToken),
    ]);

    this.baseSymbol = symbol;
    this.baseDecimals = decimals;

    // Get collateral assets
    const numAssets = await this.client.readContract({
      address: this.cometAddress,
      abi: compoundCometAbi,
      functionName: 'numAssets',
    });

    const assetPromises: Promise<CompoundAssetInfo>[] = [];
    for (let i = 0; i < numAssets; i++) {
      assetPromises.push(
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'getAssetInfo',
          args: [i],
        }).then(info => ({
          offset: info.offset,
          asset: info.asset,
          priceFeed: info.priceFeed,
          scale: info.scale,
          borrowCollateralFactor: info.borrowCollateralFactor,
          liquidateCollateralFactor: info.liquidateCollateralFactor,
          liquidationFactor: info.liquidationFactor,
          supplyCap: info.supplyCap,
        }))
      );
    }

    this.collateralAssets = await Promise.all(assetPromises);
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  async getMarkets(): Promise<LendingMarket[]> {
    try {
      await this.ensureInitialized();

      // Compound III has one "market" per Comet deployment (e.g., cUSDCv3)
      // We return the base asset market
      const [totalSupply, totalBorrow, utilization] = await Promise.all([
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'totalSupply',
        }),
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'totalBorrow',
        }),
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'getUtilization',
        }),
      ]);

      // Get current rates
      const [supplyRate, borrowRate] = await Promise.all([
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'getSupplyRate',
          args: [utilization],
        }),
        this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'getBorrowRate',
          args: [utilization],
        }),
      ]);

      // Convert rates to APY (per-second rate)
      const supplyAPY = this.rateToAPY(supplyRate, false);
      const borrowAPY = this.rateToAPY(borrowRate, false);

      const availableLiquidity = totalSupply - totalBorrow;

      const markets: LendingMarket[] = [{
        id: this.cometAddress.toLowerCase(),
        protocol: 'compound',
        chainId: this.chainId,

        asset: this.baseToken!,
        assetSymbol: this.baseSymbol!,
        assetName: `Compound ${this.baseSymbol}`,
        assetDecimals: this.baseDecimals!,
        assetCategory: this.categorizeAsset(this.baseSymbol!),

        supplyAPY,
        borrowAPY,
        netSupplyAPY: supplyAPY, // Will be updated with COMP rewards
        netBorrowAPY: borrowAPY,

        totalSupply,
        totalSupplyUSD: 0, // Would need price feed
        totalBorrow,
        totalBorrowUSD: 0,
        availableLiquidity,
        availableLiquidityUSD: 0,
        utilization: Number(utilization) / 1e18, // Utilization is scaled by 1e18

        // Compound III uses collateral factors per collateral asset
        // We use the highest as a representative value
        ltv: this.getMaxLTV(),
        liquidationThreshold: this.getMaxLiquidationThreshold(),
        liquidationPenalty: 0.05, // 5% typical

        supplyCap: 0n, // No supply cap for base token
        borrowCap: 0n,

        isActive: true,
        isFrozen: false,
        isPaused: false,
        canSupply: true,
        canBorrow: true,
        canUseAsCollateral: false, // Base token can't be collateral

        // Compound III specific
        collateralAssets: this.collateralAssets.map(a => a.asset),

        lastUpdated: Date.now(),
      }];

      // Enrich markets with COMP reward APYs (async, doesn't block)
      this.enrichMarketsWithRewards(markets).catch((err) => {
        console.warn('[CompoundAdapter] Failed to fetch reward APYs:', err);
      });

      return markets;
    } catch (error) {
      console.error('Error fetching Compound markets:', error);
      return [];
    }
  }

  /**
   * Enrich markets with COMP reward APYs
   */
  private async enrichMarketsWithRewards(markets: LendingMarket[]): Promise<void> {
    for (const market of markets) {
      try {
        const reward = await rewardAPYService.getRewardAPY('compound', market.assetSymbol);
        market.netSupplyAPY = rewardAPYService.calculateNetAPY(
          market.supplyAPY,
          reward.supplyRewardAPY,
          'supply'
        );
        market.netBorrowAPY = rewardAPYService.calculateNetAPY(
          market.borrowAPY,
          reward.borrowRewardAPY,
          'borrow'
        );
      } catch {
        // Keep original values if reward fetch fails
      }
    }
  }

  async getMarket(marketId: string): Promise<LendingMarket | null> {
    const markets = await this.getMarkets();
    return markets.find(m => m.id === marketId.toLowerCase()) || null;
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
      await this.ensureInitialized();

      // Get user's base token balance (positive = supply, negative = borrow)
      const balance = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      // Get borrow balance separately for accuracy
      const borrowBalance = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'borrowBalanceOf',
        args: [userAddress],
      });

      // Get collateral balances
      const collateralBalances: Map<Address, bigint> = new Map();
      for (const asset of this.collateralAssets) {
        const collateralBalance = await this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'collateralBalanceOf',
          args: [userAddress, asset.asset],
        });
        if (collateralBalance > 0n) {
          collateralBalances.set(asset.asset, collateralBalance);
        }
      }

      const positions: LendingPosition[] = [];
      const market = (await this.getMarkets())[0];

      // Supply/borrow position for base token
      if (balance > 0n || borrowBalance > 0n) {
        const supplyBalance = balance > 0n ? BigInt(balance) : 0n;

        positions.push({
          id: `compound-${this.cometAddress.toLowerCase()}-${userAddress.toLowerCase()}`,
          protocol: 'compound',
          marketId: this.cometAddress.toLowerCase(),
          userAddress,
          chainId: this.chainId,

          asset: this.baseToken!,
          assetSymbol: this.baseSymbol!,
          assetDecimals: this.baseDecimals!,

          supplyBalance,
          supplyBalanceUSD: 0, // Would calculate with price
          supplyShares: supplyBalance, // Compound III doesn't use shares for base

          borrowBalance,
          borrowBalanceUSD: 0,
          borrowShares: borrowBalance,

          currentSupplyAPY: market?.supplyAPY || 0,
          currentBorrowAPY: market?.borrowAPY || 0,

          isCollateralEnabled: false, // Base token isn't collateral

          healthFactor: borrowBalance > 0n ? await this.calculateHealthFactor(userAddress) : Infinity,

          lastUpdated: Date.now(),
        });
      }

      // Collateral positions (these don't earn interest, just provide borrowing power)
      for (const [assetAddress, collateralBalance] of collateralBalances) {
        const assetInfo = this.collateralAssets.find(a => a.asset === assetAddress);
        if (!assetInfo) continue;

        const symbol = await this.getTokenSymbol(assetAddress);
        const decimals = await this.getTokenDecimals(assetAddress);

        positions.push({
          id: `compound-collateral-${assetAddress.toLowerCase()}-${userAddress.toLowerCase()}`,
          protocol: 'compound',
          marketId: this.cometAddress.toLowerCase(),
          userAddress,
          chainId: this.chainId,

          asset: assetAddress,
          assetSymbol: symbol,
          assetDecimals: decimals,

          supplyBalance: 0n, // Collateral doesn't count as supply
          supplyBalanceUSD: 0,
          supplyShares: 0n,

          borrowBalance: 0n,
          borrowBalanceUSD: 0,
          borrowShares: 0n,

          collateralBalance,
          collateralBalanceUSD: 0,

          currentSupplyAPY: 0, // Collateral doesn't earn interest in Compound III
          currentBorrowAPY: 0,

          isCollateralEnabled: true,

          lastUpdated: Date.now(),
        });
      }

      return positions;
    } catch (error) {
      console.error('Error fetching Compound user positions:', error);
      return [];
    }
  }

  // ===========================================================================
  // TRANSACTION BUILDING
  // ===========================================================================

  async buildSupply(params: SupplyParams): Promise<TransactionCall[]> {
    await this.ensureInitialized();
    const calls: TransactionCall[] = [];

    // Check if supplying base token or collateral
    const isBaseToken = params.asset.toLowerCase() === this.baseToken!.toLowerCase();

    // Check and add approval
    const approval = await this.buildApprovalIfNeeded(
      params.asset,
      params.userAddress,
      this.cometAddress,
      params.amount
    );
    if (approval) {
      calls.push(approval);
    }

    // Build supply call
    calls.push({
      to: this.cometAddress,
      data: encodeFunctionData({
        abi: compoundCometAbi,
        functionName: 'supply',
        args: [params.asset, params.amount],
      }),
      description: isBaseToken
        ? `Supply ${this.baseSymbol} to Compound (earn interest)`
        : `Supply ${await this.getTokenSymbol(params.asset)} as collateral to Compound`,
    });

    return calls;
  }

  async buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]> {
    await this.ensureInitialized();

    const isBaseToken = params.asset.toLowerCase() === this.baseToken!.toLowerCase();

    // For max withdraw, we need to determine the actual amount
    let amount = params.amount;
    if (params.maxWithdraw) {
      if (isBaseToken) {
        // Get balance for base token
        const balance = await this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'balanceOf',
          args: [params.userAddress],
        });
        amount = balance > 0n ? BigInt(balance) : 0n;
      } else {
        // Get collateral balance
        amount = await this.client.readContract({
          address: this.cometAddress,
          abi: compoundCometAbi,
          functionName: 'collateralBalanceOf',
          args: [params.userAddress, params.asset],
        });
      }
    }

    return [{
      to: this.cometAddress,
      data: encodeFunctionData({
        abi: compoundCometAbi,
        functionName: 'withdraw',
        args: [params.asset, amount],
      }),
      description: isBaseToken
        ? `Withdraw ${this.baseSymbol} from Compound`
        : `Withdraw ${await this.getTokenSymbol(params.asset)} collateral from Compound`,
    }];
  }

  async buildBorrow(params: BorrowParams): Promise<TransactionCall[]> {
    await this.ensureInitialized();

    // In Compound III, borrowing is done by withdrawing more than you supplied
    // So we use the withdraw function with the base token
    return [{
      to: this.cometAddress,
      data: encodeFunctionData({
        abi: compoundCometAbi,
        functionName: 'withdraw',
        args: [this.baseToken!, params.amount],
      }),
      description: `Borrow ${this.baseSymbol} from Compound`,
    }];
  }

  async buildRepay(params: RepayParams): Promise<TransactionCall[]> {
    await this.ensureInitialized();
    const calls: TransactionCall[] = [];

    // Get borrow balance for max repay
    let amount = params.amount;
    if (params.maxRepay) {
      amount = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'borrowBalanceOf',
        args: [params.userAddress],
      });
    }

    // Check and add approval for base token
    const approval = await this.buildApprovalIfNeeded(
      this.baseToken!,
      params.userAddress,
      this.cometAddress,
      amount
    );
    if (approval) {
      calls.push(approval);
    }

    // Repay is done by supplying the base token
    calls.push({
      to: this.cometAddress,
      data: encodeFunctionData({
        abi: compoundCometAbi,
        functionName: 'supply',
        args: [this.baseToken!, amount],
      }),
      description: `Repay ${this.baseSymbol} to Compound`,
    });

    return calls;
  }

  async buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]> {
    // In Compound III, you enable collateral by supplying it
    // There's no separate "enable" action
    // The collateral is automatically used once supplied

    if (params.enable) {
      // Just build approval for future collateral deposits
      const approval = await this.buildApprovalIfNeeded(
        params.asset,
        params.userAddress,
        this.cometAddress,
        2n ** 256n - 1n
      );
      return approval ? [approval] : [];
    }

    // To "disable" collateral, user must withdraw it
    return [];
  }

  // ===========================================================================
  // HEALTH FACTOR
  // ===========================================================================

  async calculateHealthFactor(userAddress: Address): Promise<number> {
    try {
      await this.ensureInitialized();

      // Check if user has borrows
      const borrowBalance = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'borrowBalanceOf',
        args: [userAddress],
      });

      if (borrowBalance === 0n) return Infinity;

      // Check if collateralized
      const isCollateralized = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'isBorrowCollateralized',
        args: [userAddress],
      });

      // Check if liquidatable
      const isLiquidatable = await this.client.readContract({
        address: this.cometAddress,
        abi: compoundCometAbi,
        functionName: 'isLiquidatable',
        args: [userAddress],
      });

      // Rough health factor estimation
      // In Compound III, health factor isn't directly exposed
      // We estimate based on collateralization status
      if (isLiquidatable) return 0.5; // Already liquidatable
      if (!isCollateralized) return 0.8; // Close to liquidation
      return 1.5; // Healthy
    } catch (error) {
      console.error('Error calculating Compound health factor:', error);
      return Infinity;
    }
  }

  async simulateHealthFactor(
    userAddress: Address,
    action: LendingActionParams
  ): Promise<number> {
    const currentHF = await this.calculateHealthFactor(userAddress);

    switch (action.action) {
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
  // REWARDS
  // ===========================================================================

  /**
   * Claim COMP rewards
   */
  async buildClaimRewards(userAddress: Address): Promise<TransactionCall[]> {
    if (!this.rewardsAddress) return [];

    return [{
      to: this.rewardsAddress,
      data: encodeFunctionData({
        abi: compoundRewardsAbi,
        functionName: 'claim',
        args: [this.cometAddress, userAddress, true],
      }),
      description: 'Claim COMP rewards from Compound',
    }];
  }

  /**
   * Get pending rewards
   */
  async getPendingRewards(userAddress: Address): Promise<{ token: Address; amount: bigint }> {
    if (!this.rewardsAddress) return { token: '0x' as Address, amount: 0n };

    try {
      const result = await this.client.readContract({
        address: this.rewardsAddress,
        abi: compoundRewardsAbi,
        functionName: 'getRewardOwed',
        args: [this.cometAddress, userAddress],
      });

      return { token: result.token, amount: result.owed };
    } catch (error) {
      return { token: '0x' as Address, amount: 0n };
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private getMaxLTV(): number {
    if (this.collateralAssets.length === 0) return 0;

    const maxFactor = Math.max(
      ...this.collateralAssets.map(a => Number(a.borrowCollateralFactor))
    );
    return maxFactor / 1e18;
  }

  private getMaxLiquidationThreshold(): number {
    if (this.collateralAssets.length === 0) return 0;

    const maxFactor = Math.max(
      ...this.collateralAssets.map(a => Number(a.liquidateCollateralFactor))
    );
    return maxFactor / 1e18;
  }

  /**
   * Get all supported collateral assets
   */
  async getCollateralAssets(): Promise<{
    asset: Address;
    symbol: string;
    borrowCollateralFactor: number;
    liquidateCollateralFactor: number;
    supplyCap: bigint;
  }[]> {
    await this.ensureInitialized();

    const results = [];
    for (const assetInfo of this.collateralAssets) {
      const symbol = await this.getTokenSymbol(assetInfo.asset);
      results.push({
        asset: assetInfo.asset,
        symbol,
        borrowCollateralFactor: Number(assetInfo.borrowCollateralFactor) / 1e18,
        liquidateCollateralFactor: Number(assetInfo.liquidateCollateralFactor) / 1e18,
        supplyCap: assetInfo.supplyCap,
      });
    }
    return results;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createCompoundAdapter(
  client: PublicClient,
  chainId: number = 8453 // Base mainnet
): CompoundAdapter {
  const addresses = BASE_ADDRESSES.compound;

  return new CompoundAdapter(client, chainId, {
    comet: addresses.core,
    rewards: addresses.rewards,
  });
}
