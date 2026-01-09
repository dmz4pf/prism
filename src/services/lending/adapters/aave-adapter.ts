/**
 * Aave V3 Lending Adapter
 *
 * Implements the LendingAdapter interface for Aave V3 protocol.
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
import { aavePoolAbi, aavePoolDataProviderAbi, aaveUiPoolDataProviderAbi } from '@/contracts/lending/abis';
import { BASE_ADDRESSES, RAY, SECONDS_PER_YEAR } from '@/contracts/lending/addresses';
import { rewardAPYService } from '../reward-apy-service';

// =============================================================================
// AAVE V3 ADAPTER
// =============================================================================

export class AaveAdapter extends BaseLendingAdapter {
  protocol: LendingProtocol = 'aave';
  chainId: number;

  private poolAddress: Address;
  private dataProviderAddress: Address;
  private uiDataProviderAddress: Address;
  private poolAddressesProvider: Address;

  constructor(
    client: PublicClient,
    chainId: number,
    addresses: {
      pool: Address;
      dataProvider: Address;
      uiDataProvider: Address;
      poolAddressesProvider: Address;
    }
  ) {
    super(client, addresses.pool);
    this.chainId = chainId;
    this.poolAddress = addresses.pool;
    this.dataProviderAddress = addresses.dataProvider;
    this.uiDataProviderAddress = addresses.uiDataProvider;
    this.poolAddressesProvider = addresses.poolAddressesProvider;
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  async getMarkets(): Promise<LendingMarket[]> {
    try {
      // Fetch all reserves data in one call
      const [reservesData, baseCurrencyInfo] = await this.client.readContract({
        address: this.uiDataProviderAddress,
        abi: aaveUiPoolDataProviderAbi,
        functionName: 'getReservesData',
        args: [this.poolAddressesProvider],
      });

      const markets: LendingMarket[] = [];

      for (const reserve of reservesData) {
        // Skip inactive or frozen markets for display
        if (!reserve.isActive) continue;

        const supplyAPY = this.calculateAPY(reserve.liquidityRate);
        const borrowAPY = this.calculateAPY(reserve.variableBorrowRate);

        // Calculate total supply and borrow
        const totalSupplyAssets = reserve.availableLiquidity +
          BigInt(reserve.totalPrincipalStableDebt) +
          BigInt(reserve.totalScaledVariableDebt);

        const totalBorrowAssets = BigInt(reserve.totalPrincipalStableDebt) +
          BigInt(reserve.totalScaledVariableDebt);

        // Calculate USD values using price
        const priceUSD = Number(reserve.priceInMarketReferenceCurrency) /
          Number(baseCurrencyInfo.marketReferenceCurrencyUnit);

        const decimals = Number(reserve.decimals);
        const totalSupplyUSD = (Number(totalSupplyAssets) / 10 ** decimals) * priceUSD;
        const totalBorrowUSD = (Number(totalBorrowAssets) / 10 ** decimals) * priceUSD;
        const availableLiquidityUSD = (Number(reserve.availableLiquidity) / 10 ** decimals) * priceUSD;

        // Calculate utilization
        const utilization = totalSupplyAssets > 0n
          ? Number(totalBorrowAssets) / Number(totalSupplyAssets)
          : 0;

        markets.push({
          id: reserve.underlyingAsset.toLowerCase(),
          protocol: 'aave',
          chainId: this.chainId,

          asset: reserve.underlyingAsset as Address,
          assetSymbol: reserve.symbol,
          assetName: reserve.name,
          assetDecimals: decimals,
          assetCategory: this.categorizeAsset(reserve.symbol),

          supplyAPY,
          borrowAPY,
          netSupplyAPY: supplyAPY, // Will be updated with rewards
          netBorrowAPY: borrowAPY,

          totalSupply: totalSupplyAssets,
          totalSupplyUSD,
          totalBorrow: totalBorrowAssets,
          totalBorrowUSD,
          availableLiquidity: reserve.availableLiquidity,
          availableLiquidityUSD,
          utilization,

          ltv: Number(reserve.baseLTVasCollateral) / 10000,
          liquidationThreshold: Number(reserve.reserveLiquidationThreshold) / 10000,
          liquidationPenalty: (Number(reserve.reserveLiquidationBonus) - 10000) / 10000,

          supplyCap: BigInt(reserve.supplyCap) * BigInt(10 ** decimals),
          borrowCap: BigInt(reserve.borrowCap) * BigInt(10 ** decimals),

          aTokenAddress: reserve.aTokenAddress as Address,
          variableDebtTokenAddress: reserve.variableDebtTokenAddress as Address,

          isActive: reserve.isActive,
          isFrozen: reserve.isFrozen,
          isPaused: reserve.isPaused,
          canSupply: reserve.isActive && !reserve.isFrozen && !reserve.isPaused,
          canBorrow: reserve.borrowingEnabled && reserve.isActive && !reserve.isFrozen && !reserve.isPaused,
          canUseAsCollateral: reserve.usageAsCollateralEnabled,

          lastUpdated: Date.now(),
        });
      }

      // Enrich markets with reward APYs (async, doesn't block)
      this.enrichMarketsWithRewards(markets).catch((err) => {
        console.warn('[AaveAdapter] Failed to fetch reward APYs:', err);
      });

      return markets;
    } catch (error) {
      console.error('Error fetching Aave markets:', error);
      return [];
    }
  }

  /**
   * Enrich markets with reward APYs from the reward service
   */
  private async enrichMarketsWithRewards(markets: LendingMarket[]): Promise<void> {
    for (const market of markets) {
      try {
        const reward = await rewardAPYService.getRewardAPY('aave', market.assetSymbol);
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
      // Fetch user reserves data
      const [userReserves] = await this.client.readContract({
        address: this.uiDataProviderAddress,
        abi: aaveUiPoolDataProviderAbi,
        functionName: 'getUserReservesData',
        args: [this.poolAddressesProvider, userAddress],
      });

      // Get markets for additional data
      const markets = await this.getMarkets();
      const marketMap = new Map(markets.map(m => [m.asset.toLowerCase(), m]));

      const positions: LendingPosition[] = [];

      for (const userReserve of userReserves) {
        const market = marketMap.get(userReserve.underlyingAsset.toLowerCase());
        if (!market) continue;

        // Get scaled balances
        const scaledATokenBalance = userReserve.scaledATokenBalance;
        const scaledVariableDebt = userReserve.scaledVariableDebt;

        // Skip if no position
        if (scaledATokenBalance === 0n && scaledVariableDebt === 0n) continue;

        // Get current balances from data provider (more accurate)
        const [
          currentATokenBalance,
          _currentStableDebt,
          currentVariableDebt,
          _principalStableDebt,
          _scaledVarDebt,
          _stableBorrowRate,
          _liquidityRate,
          _stableRateLastUpdated,
          usageAsCollateralEnabled,
        ] = await this.client.readContract({
          address: this.dataProviderAddress,
          abi: aavePoolDataProviderAbi,
          functionName: 'getUserReserveData',
          args: [market.asset, userAddress],
        });

        // Calculate USD values
        const supplyBalanceUSD = (Number(currentATokenBalance) / 10 ** market.assetDecimals) *
          (market.totalSupplyUSD / (Number(market.totalSupply) / 10 ** market.assetDecimals));
        const borrowBalanceUSD = (Number(currentVariableDebt) / 10 ** market.assetDecimals) *
          (market.totalBorrowUSD / (Number(market.totalBorrow) / 10 ** market.assetDecimals || 1));

        positions.push({
          id: `aave-${market.asset.toLowerCase()}-${userAddress.toLowerCase()}`,
          protocol: 'aave',
          marketId: market.id,
          userAddress,
          chainId: this.chainId,

          asset: market.asset,
          assetSymbol: market.assetSymbol,
          assetDecimals: market.assetDecimals,

          supplyBalance: currentATokenBalance,
          supplyBalanceUSD,
          supplyShares: scaledATokenBalance,

          borrowBalance: currentVariableDebt,
          borrowBalanceUSD,
          borrowShares: scaledVariableDebt,

          currentSupplyAPY: market.supplyAPY,
          currentBorrowAPY: market.borrowAPY,

          isCollateralEnabled: usageAsCollateralEnabled,

          lastUpdated: Date.now(),
        });
      }

      // Calculate health factor for positions with borrows
      if (positions.some(p => p.borrowBalance > 0n)) {
        const healthFactor = await this.calculateHealthFactor(userAddress);
        positions.forEach(p => {
          if (p.borrowBalance > 0n) {
            p.healthFactor = healthFactor;
          }
        });
      }

      return positions;
    } catch (error) {
      console.error('Error fetching Aave user positions:', error);
      return [];
    }
  }

  // ===========================================================================
  // TRANSACTION BUILDING
  // ===========================================================================

  async buildSupply(params: SupplyParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];

    // Check and add approval
    const approval = await this.buildApprovalIfNeeded(
      params.asset,
      params.userAddress,
      this.poolAddress,
      params.amount
    );
    if (approval) {
      calls.push(approval);
    }

    // Build supply call
    calls.push({
      to: this.poolAddress,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: 'supply',
        args: [
          params.asset,
          params.amount,
          params.userAddress,
          0, // referralCode
        ],
      }),
      description: `Supply ${await this.getTokenSymbol(params.asset)} to Aave`,
    });

    return calls;
  }

  async buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]> {
    // Use max uint256 for max withdraw
    const amount = params.maxWithdraw
      ? 2n ** 256n - 1n
      : params.amount;

    return [{
      to: this.poolAddress,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: 'withdraw',
        args: [
          params.asset,
          amount,
          params.userAddress,
        ],
      }),
      description: `Withdraw ${await this.getTokenSymbol(params.asset)} from Aave`,
    }];
  }

  async buildBorrow(params: BorrowParams): Promise<TransactionCall[]> {
    return [{
      to: this.poolAddress,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: 'borrow',
        args: [
          params.asset,
          params.amount,
          2n, // Variable rate mode (bigint)
          0, // referralCode
          params.userAddress,
        ],
      }),
      description: `Borrow ${await this.getTokenSymbol(params.asset)} from Aave`,
    }];
  }

  async buildRepay(params: RepayParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];

    // Use max uint256 for max repay
    const amount = params.maxRepay
      ? 2n ** 256n - 1n
      : params.amount;

    // Check and add approval
    const approvalAmount = params.maxRepay
      ? 2n ** 256n - 1n
      : params.amount;
    const approval = await this.buildApprovalIfNeeded(
      params.asset,
      params.userAddress,
      this.poolAddress,
      approvalAmount
    );
    if (approval) {
      calls.push(approval);
    }

    calls.push({
      to: this.poolAddress,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: 'repay',
        args: [
          params.asset,
          amount,
          2n, // Variable rate mode (bigint)
          params.userAddress,
        ],
      }),
      description: `Repay ${await this.getTokenSymbol(params.asset)} to Aave`,
    });

    return calls;
  }

  async buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]> {
    return [{
      to: this.poolAddress,
      data: encodeFunctionData({
        abi: aavePoolAbi,
        functionName: 'setUserUseReserveAsCollateral',
        args: [params.asset, params.enable],
      }),
      description: params.enable
        ? `Enable ${await this.getTokenSymbol(params.asset)} as collateral`
        : `Disable ${await this.getTokenSymbol(params.asset)} as collateral`,
    }];
  }

  // ===========================================================================
  // HEALTH FACTOR
  // ===========================================================================

  async calculateHealthFactor(userAddress: Address): Promise<number> {
    try {
      const [
        _totalCollateralBase,
        _totalDebtBase,
        _availableBorrowsBase,
        _currentLiquidationThreshold,
        _ltv,
        healthFactor,
      ] = await this.client.readContract({
        address: this.poolAddress,
        abi: aavePoolAbi,
        functionName: 'getUserAccountData',
        args: [userAddress],
      });

      // Health factor is in RAY (1e27), convert to number
      if (healthFactor === 2n ** 256n - 1n) {
        return Infinity; // No debt
      }

      return Number(healthFactor) / Number(RAY);
    } catch (error) {
      console.error('Error calculating Aave health factor:', error);
      return Infinity;
    }
  }

  async simulateHealthFactor(
    userAddress: Address,
    action: LendingActionParams
  ): Promise<number> {
    try {
      // Get current account data from Aave
      const [
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThreshold,
        ltv,
        currentHF,
      ] = await this.client.readContract({
        address: this.poolAddress,
        abi: aavePoolAbi,
        functionName: 'getUserAccountData',
        args: [userAddress],
      });

      // If no debt and not borrowing, HF is infinite
      if (totalDebtBase === 0n && action.action !== 'borrow') {
        return Infinity;
      }

      // Get market to find asset price and decimals
      const market = await this.getMarket(action.marketId);
      if (!market) {
        // Fall back to rough estimation
        const hf = await this.calculateHealthFactor(userAddress);
        return this.roughEstimateHF(hf, action.action);
      }

      // Calculate action value in BASE currency (Aave uses 8 decimals for BASE)
      const actionAmountNum = Number(action.amount) / Math.pow(10, market.assetDecimals);
      // Calculate asset price from market USD values
      const assetPrice = market.totalSupply > 0n
        ? market.totalSupplyUSD / (Number(market.totalSupply) / Math.pow(10, market.assetDecimals))
        : 0;
      const actionValueUSD = actionAmountNum * assetPrice;
      // Convert to BASE (8 decimals)
      const actionValueBase = BigInt(Math.floor(actionValueUSD * 1e8));

      // Calculate new values based on action
      let newCollateralBase = totalCollateralBase;
      let newDebtBase = totalDebtBase;

      switch (action.action) {
        case 'supply':
          newCollateralBase = totalCollateralBase + actionValueBase;
          break;
        case 'withdraw':
          newCollateralBase = totalCollateralBase > actionValueBase
            ? totalCollateralBase - actionValueBase
            : 0n;
          break;
        case 'borrow':
          newDebtBase = totalDebtBase + actionValueBase;
          break;
        case 'repay':
          newDebtBase = totalDebtBase > actionValueBase
            ? totalDebtBase - actionValueBase
            : 0n;
          break;
      }

      // If no debt after action, return infinity
      if (newDebtBase === 0n) return Infinity;

      // Calculate projected health factor
      // HF = (collateral * liquidation threshold) / debt
      // liquidation threshold is in basis points (e.g., 8250 = 82.5%)
      const liqThreshold = Number(currentLiquidationThreshold) / 10000;
      const projectedHF = (Number(newCollateralBase) * liqThreshold) / Number(newDebtBase);

      return projectedHF;
    } catch (error) {
      console.warn('Health factor simulation failed, using rough estimate:', error);
      // Fall back to rough estimation
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
        return currentHF * 0.9;
      case 'borrow':
        return currentHF * 0.85;
      case 'supply':
        return currentHF * 1.1;
      case 'repay':
        return currentHF * 1.15;
      default:
        return currentHF;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private calculateAPY(rate: bigint): number {
    // Aave rates are per-second in RAY
    // APY = (1 + rate_per_second)^seconds_per_year - 1
    const ratePerSecond = Number(rate) / Number(RAY);
    const secondsPerYear = Number(SECONDS_PER_YEAR);
    return (Math.pow(1 + ratePerSecond, secondsPerYear) - 1) * 100;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAaveAdapter(
  client: PublicClient,
  chainId: number = 8453 // Base mainnet
): AaveAdapter {
  const addresses = BASE_ADDRESSES.aave;

  return new AaveAdapter(client, chainId, {
    pool: addresses.core,
    dataProvider: addresses.dataProvider!,
    uiDataProvider: addresses.uiDataProvider!,
    poolAddressesProvider: addresses.poolAddressesProvider!,
  });
}
