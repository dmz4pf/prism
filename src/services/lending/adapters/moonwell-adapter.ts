/**
 * Moonwell Lending Adapter
 *
 * Implements the LendingAdapter interface for Moonwell protocol.
 * Moonwell is a Compound V2 fork on Base with mToken markets.
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
import {
  moonwellComptrollerAbi,
  moonwellMTokenAbi,
  moonwellOracleAbi,
  erc20Abi
} from '@/contracts/lending/abis';
import { BASE_ADDRESSES, MOONWELL_MARKETS, SECONDS_PER_YEAR } from '@/contracts/lending/addresses';
import { rewardAPYService } from '../reward-apy-service';

// =============================================================================
// CONSTANTS
// =============================================================================

// Moonwell uses 1e18 for most calculations (mantissa format)
const MANTISSA = 10n ** 18n;

// Blocks per year for APY calculation (Base has ~2 second blocks)
const SECONDS_PER_YEAR_NUM = 31536000;

// =============================================================================
// MOONWELL ADAPTER
// =============================================================================

export class MoonwellAdapter extends BaseLendingAdapter {
  protocol: LendingProtocol = 'moonwell';
  chainId: number;

  private comptrollerAddress: Address;
  private oracleAddress?: Address;

  constructor(
    client: PublicClient,
    chainId: number,
    addresses: {
      comptroller: Address;
      oracle?: Address;
    }
  ) {
    super(client, addresses.comptroller);
    this.chainId = chainId;
    this.comptrollerAddress = addresses.comptroller;
    this.oracleAddress = addresses.oracle;
  }

  // ===========================================================================
  // MARKET DATA
  // ===========================================================================

  async getMarkets(): Promise<LendingMarket[]> {
    try {
      // Get all mToken markets from comptroller
      const allMarkets = await this.client.readContract({
        address: this.comptrollerAddress,
        abi: moonwellComptrollerAbi,
        functionName: 'getAllMarkets',
      });

      // Get oracle address if not set
      if (!this.oracleAddress) {
        this.oracleAddress = await this.client.readContract({
          address: this.comptrollerAddress,
          abi: moonwellComptrollerAbi,
          functionName: 'oracle',
        });
      }

      const markets: LendingMarket[] = [];

      for (const mTokenAddress of allMarkets) {
        try {
          const market = await this.fetchMarketData(mTokenAddress as Address);
          if (market) {
            markets.push(market);
          }
        } catch (error) {
          console.warn(`Failed to fetch Moonwell market ${mTokenAddress}:`, error);
        }
      }

      // Enrich markets with WELL reward APYs (async, doesn't block)
      this.enrichMarketsWithRewards(markets).catch((err) => {
        console.warn('[MoonwellAdapter] Failed to fetch reward APYs:', err);
      });

      return markets;
    } catch (error) {
      console.error('Error fetching Moonwell markets:', error);
      return [];
    }
  }

  /**
   * Enrich markets with WELL reward APYs
   */
  private async enrichMarketsWithRewards(markets: LendingMarket[]): Promise<void> {
    for (const market of markets) {
      try {
        const reward = await rewardAPYService.getRewardAPY('moonwell', market.assetSymbol);
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
      const markets = await this.getMarkets();
      const positions: LendingPosition[] = [];

      // Get markets user has entered (collateral enabled)
      const enteredMarkets = await this.client.readContract({
        address: this.comptrollerAddress,
        abi: moonwellComptrollerAbi,
        functionName: 'getAssetsIn',
        args: [userAddress],
      });

      const enteredSet = new Set(enteredMarkets.map((m: Address) => m.toLowerCase()));

      for (const market of markets) {
        try {
          const mTokenAddress = market.aTokenAddress as Address; // Using aTokenAddress for mToken

          // Get account snapshot (balance, borrows, exchange rate)
          const [error, mTokenBalance, borrowBalance, exchangeRate] = await this.client.readContract({
            address: mTokenAddress,
            abi: moonwellMTokenAbi,
            functionName: 'getAccountSnapshot',
            args: [userAddress],
          });

          if (error !== 0n) continue;

          // Skip if no position
          if (mTokenBalance === 0n && borrowBalance === 0n) continue;

          // Calculate underlying supply balance
          const supplyBalance = (mTokenBalance * exchangeRate) / MANTISSA;

          // Calculate USD values (simplified)
          const supplyBalanceUSD = Number(supplyBalance) / 10 ** market.assetDecimals;
          const borrowBalanceUSD = Number(borrowBalance) / 10 ** market.assetDecimals;

          const position: LendingPosition = {
            id: `moonwell-${mTokenAddress.toLowerCase()}-${userAddress.toLowerCase()}`,
            protocol: 'moonwell',
            marketId: market.id,
            userAddress,
            chainId: this.chainId,

            asset: market.asset,
            assetSymbol: market.assetSymbol,
            assetDecimals: market.assetDecimals,

            supplyBalance,
            supplyBalanceUSD,
            supplyShares: mTokenBalance, // mToken balance as shares

            borrowBalance,
            borrowBalanceUSD,
            borrowShares: borrowBalance, // Moonwell tracks borrow in underlying

            currentSupplyAPY: market.supplyAPY,
            currentBorrowAPY: market.borrowAPY,

            isCollateralEnabled: enteredSet.has(mTokenAddress.toLowerCase()),

            lastUpdated: Date.now(),
          };

          // Calculate health factor if user has borrows
          if (borrowBalance > 0n) {
            position.healthFactor = await this.calculateHealthFactor(userAddress);
          }

          positions.push(position);
        } catch (error) {
          console.warn(`Error fetching position for market ${market.id}:`, error);
        }
      }

      return positions;
    } catch (error) {
      console.error('Error fetching Moonwell user positions:', error);
      return [];
    }
  }

  // ===========================================================================
  // TRANSACTION BUILDING
  // ===========================================================================

  async buildSupply(params: SupplyParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];

    // Find mToken for this asset
    const market = await this.getMarket(params.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const mTokenAddress = market.aTokenAddress as Address;

    // Check and add approval for underlying token
    const approval = await this.buildApprovalIfNeeded(
      params.asset,
      params.userAddress,
      mTokenAddress,
      params.amount
    );
    if (approval) {
      calls.push(approval);
    }

    // Build mint call (supply underlying, receive mTokens)
    calls.push({
      to: mTokenAddress,
      data: encodeFunctionData({
        abi: moonwellMTokenAbi,
        functionName: 'mint',
        args: [params.amount],
      }),
      description: `Supply ${market.assetSymbol} to Moonwell`,
    });

    return calls;
  }

  async buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]> {
    const market = await this.getMarket(params.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const mTokenAddress = market.aTokenAddress as Address;

    if (params.maxWithdraw) {
      // Redeem all mTokens (redeem by mToken amount)
      const mTokenBalance = await this.client.readContract({
        address: mTokenAddress,
        abi: moonwellMTokenAbi,
        functionName: 'balanceOf',
        args: [params.userAddress],
      });

      return [{
        to: mTokenAddress,
        data: encodeFunctionData({
          abi: moonwellMTokenAbi,
          functionName: 'redeem',
          args: [mTokenBalance],
        }),
        description: `Withdraw all ${market.assetSymbol} from Moonwell`,
      }];
    }

    // Redeem by underlying amount
    return [{
      to: mTokenAddress,
      data: encodeFunctionData({
        abi: moonwellMTokenAbi,
        functionName: 'redeemUnderlying',
        args: [params.amount],
      }),
      description: `Withdraw ${market.assetSymbol} from Moonwell`,
    }];
  }

  async buildBorrow(params: BorrowParams): Promise<TransactionCall[]> {
    const market = await this.getMarket(params.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const mTokenAddress = market.aTokenAddress as Address;

    return [{
      to: mTokenAddress,
      data: encodeFunctionData({
        abi: moonwellMTokenAbi,
        functionName: 'borrow',
        args: [params.amount],
      }),
      description: `Borrow ${market.assetSymbol} from Moonwell`,
    }];
  }

  async buildRepay(params: RepayParams): Promise<TransactionCall[]> {
    const calls: TransactionCall[] = [];

    const market = await this.getMarket(params.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const mTokenAddress = market.aTokenAddress as Address;

    // Get borrow balance for max repay
    let amount = params.amount;
    if (params.maxRepay) {
      // Use max uint256 - 1 for max repay (protocol convention)
      amount = 2n ** 256n - 1n;
    }

    // Check and add approval
    const approval = await this.buildApprovalIfNeeded(
      params.asset,
      params.userAddress,
      mTokenAddress,
      params.maxRepay ? 2n ** 256n - 1n : params.amount
    );
    if (approval) {
      calls.push(approval);
    }

    calls.push({
      to: mTokenAddress,
      data: encodeFunctionData({
        abi: moonwellMTokenAbi,
        functionName: 'repayBorrow',
        args: [amount],
      }),
      description: `Repay ${market.assetSymbol} to Moonwell`,
    });

    return calls;
  }

  async buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]> {
    const market = await this.getMarket(params.marketId);
    if (!market) {
      throw new Error('Market not found');
    }

    const mTokenAddress = market.aTokenAddress as Address;

    if (params.enable) {
      // Enter market (enable as collateral)
      return [{
        to: this.comptrollerAddress,
        data: encodeFunctionData({
          abi: moonwellComptrollerAbi,
          functionName: 'enterMarkets',
          args: [[mTokenAddress]],
        }),
        description: `Enable ${market.assetSymbol} as collateral on Moonwell`,
      }];
    } else {
      // Exit market (disable as collateral)
      return [{
        to: this.comptrollerAddress,
        data: encodeFunctionData({
          abi: moonwellComptrollerAbi,
          functionName: 'exitMarket',
          args: [mTokenAddress],
        }),
        description: `Disable ${market.assetSymbol} as collateral on Moonwell`,
      }];
    }
  }

  // ===========================================================================
  // HEALTH FACTOR
  // ===========================================================================

  async calculateHealthFactor(userAddress: Address): Promise<number> {
    try {
      // Get account liquidity
      const [error, liquidity, shortfall] = await this.client.readContract({
        address: this.comptrollerAddress,
        abi: moonwellComptrollerAbi,
        functionName: 'getAccountLiquidity',
        args: [userAddress],
      });

      if (error !== 0n) {
        console.error('Error getting account liquidity');
        return Infinity;
      }

      // If there's a shortfall, HF < 1
      if (shortfall > 0n) {
        // Rough estimate: HF = 1 - (shortfall / (liquidity + shortfall))
        // Since shortfall means debt > collateral * threshold
        return 0.5; // Approximate - indicates liquidatable
      }

      // If there's liquidity, user is healthy
      if (liquidity > 0n) {
        // Rough HF estimate based on excess liquidity
        // Higher liquidity = higher HF
        // This is a simplification - actual HF would need more data
        return 2.0; // Healthy
      }

      return 1.0; // Borderline
    } catch (error) {
      console.error('Error calculating Moonwell health factor:', error);
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
   * Claim WELL rewards
   */
  async buildClaimRewards(userAddress: Address): Promise<TransactionCall[]> {
    return [{
      to: this.comptrollerAddress,
      data: encodeFunctionData({
        abi: moonwellComptrollerAbi,
        functionName: 'claimReward',
        args: [userAddress],
      }),
      description: 'Claim WELL rewards from Moonwell',
    }];
  }

  /**
   * Get pending WELL rewards
   */
  async getPendingRewards(userAddress: Address): Promise<bigint> {
    try {
      return await this.client.readContract({
        address: this.comptrollerAddress,
        abi: moonwellComptrollerAbi,
        functionName: 'rewardAccrued',
        args: [userAddress],
      });
    } catch (error) {
      return 0n;
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private async fetchMarketData(mTokenAddress: Address): Promise<LendingMarket | null> {
    try {
      // Get mToken metadata
      const [
        underlying,
        symbol,
        name,
        totalSupply,
        totalBorrows,
        totalReserves,
        cash,
        exchangeRate,
        supplyRatePerTimestamp,
        borrowRatePerTimestamp,
      ] = await Promise.all([
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'underlying',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'symbol',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'name',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'totalSupply',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'totalBorrows',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'totalReserves',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'getCash',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'exchangeRateStored',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'supplyRatePerTimestamp',
        }),
        this.client.readContract({
          address: mTokenAddress,
          abi: moonwellMTokenAbi,
          functionName: 'borrowRatePerTimestamp',
        }),
      ]);

      // Get underlying token info
      const [underlyingSymbol, underlyingDecimals] = await Promise.all([
        this.getTokenSymbol(underlying),
        this.getTokenDecimals(underlying),
      ]);

      // Get market config from comptroller
      const [isListed, collateralFactor] = await this.client.readContract({
        address: this.comptrollerAddress,
        abi: moonwellComptrollerAbi,
        functionName: 'markets',
        args: [mTokenAddress],
      });

      if (!isListed) return null;

      // Check pause status
      const [mintPaused, borrowPaused] = await Promise.all([
        this.client.readContract({
          address: this.comptrollerAddress,
          abi: moonwellComptrollerAbi,
          functionName: 'mintGuardianPaused',
          args: [mTokenAddress],
        }),
        this.client.readContract({
          address: this.comptrollerAddress,
          abi: moonwellComptrollerAbi,
          functionName: 'borrowGuardianPaused',
          args: [mTokenAddress],
        }),
      ]);

      // Calculate APY from per-second rate
      const supplyAPY = this.calculateAPY(supplyRatePerTimestamp);
      const borrowAPY = this.calculateAPY(borrowRatePerTimestamp);

      // Calculate total supply in underlying
      const totalSupplyUnderlying = (totalSupply * exchangeRate) / MANTISSA;

      // Utilization
      const utilization = totalSupplyUnderlying > 0n
        ? Number(totalBorrows) / Number(totalSupplyUnderlying)
        : 0;

      return {
        id: mTokenAddress.toLowerCase(),
        protocol: 'moonwell',
        chainId: this.chainId,

        asset: underlying,
        assetSymbol: underlyingSymbol,
        assetName: name,
        assetDecimals: underlyingDecimals,
        assetCategory: this.categorizeAsset(underlyingSymbol),

        supplyAPY,
        borrowAPY,
        netSupplyAPY: supplyAPY, // Will be updated with WELL rewards
        netBorrowAPY: borrowAPY,

        totalSupply: totalSupplyUnderlying,
        totalSupplyUSD: 0, // Would need oracle
        totalBorrow: totalBorrows,
        totalBorrowUSD: 0,
        availableLiquidity: cash,
        availableLiquidityUSD: 0,
        utilization,

        ltv: Number(collateralFactor) / 1e18,
        liquidationThreshold: Number(collateralFactor) / 1e18,
        liquidationPenalty: 0.08, // Moonwell typically uses 8% liquidation incentive

        supplyCap: 0n,
        borrowCap: 0n,

        aTokenAddress: mTokenAddress, // mToken address stored here

        isActive: isListed,
        isFrozen: mintPaused,
        isPaused: mintPaused || borrowPaused,
        canSupply: isListed && !mintPaused,
        canBorrow: isListed && !borrowPaused,
        canUseAsCollateral: Number(collateralFactor) > 0,

        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching Moonwell market data:', error);
      return null;
    }
  }

  private calculateAPY(ratePerTimestamp: bigint): number {
    // Rate is per-second, scaled by 1e18
    // APY = (1 + rate_per_second)^seconds_per_year - 1
    const ratePerSecond = Number(ratePerTimestamp) / 1e18;
    return (Math.pow(1 + ratePerSecond, SECONDS_PER_YEAR_NUM) - 1) * 100;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMoonwellAdapter(
  client: PublicClient,
  chainId: number = 8453 // Base mainnet
): MoonwellAdapter {
  const addresses = BASE_ADDRESSES.moonwell;

  return new MoonwellAdapter(client, chainId, {
    comptroller: addresses.core,
    oracle: addresses.oracle,
  });
}
