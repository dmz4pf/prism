/**
 * Base Lending Adapter
 *
 * Abstract base class that all protocol adapters extend.
 * Provides common functionality and enforces the adapter interface.
 */

import { Address, PublicClient, encodeFunctionData } from 'viem';
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
  ActionError,
  ActionWarning,
  LendingActionParams,
  AssetCategory,
} from '@/types/lending';
import { erc20Abi } from '@/contracts/lending/abis';

// =============================================================================
// ABSTRACT BASE ADAPTER
// =============================================================================

export abstract class BaseLendingAdapter implements LendingAdapter {
  abstract protocol: LendingProtocol;
  abstract chainId: number;

  protected client: PublicClient;
  protected coreAddress: Address;

  constructor(client: PublicClient, coreAddress: Address) {
    this.client = client;
    this.coreAddress = coreAddress;
  }

  // ===========================================================================
  // ABSTRACT METHODS - Must be implemented by each protocol adapter
  // ===========================================================================

  abstract getMarkets(): Promise<LendingMarket[]>;
  abstract getMarket(marketId: string): Promise<LendingMarket | null>;
  abstract getUserPositions(userAddress: Address): Promise<LendingPosition[]>;
  abstract getSupplyRate(marketId: string): Promise<number>;
  abstract getBorrowRate(marketId: string): Promise<number>;

  abstract buildSupply(params: SupplyParams): Promise<TransactionCall[]>;
  abstract buildWithdraw(params: WithdrawParams): Promise<TransactionCall[]>;
  abstract buildBorrow(params: BorrowParams): Promise<TransactionCall[]>;
  abstract buildRepay(params: RepayParams): Promise<TransactionCall[]>;
  abstract buildEnableCollateral(params: EnableCollateralParams): Promise<TransactionCall[]>;

  abstract calculateHealthFactor(userAddress: Address): Promise<number>;
  abstract simulateHealthFactor(userAddress: Address, action: LendingActionParams): Promise<number>;

  // ===========================================================================
  // COMMON VALIDATION METHODS
  // ===========================================================================

  async validateSupply(params: SupplyParams): Promise<ValidationResult> {
    const errors: ActionError[] = [];
    const warnings: ActionWarning[] = [];

    // Check user has enough balance
    const balance = await this.getTokenBalance(params.asset, params.userAddress);
    if (balance < params.amount) {
      errors.push({
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. You have ${this.formatAmount(balance, params.asset)} but trying to supply ${this.formatAmount(params.amount, params.asset)}`,
      });
    }

    // Check market is active
    const market = await this.getMarket(params.marketId);
    if (!market) {
      errors.push({
        code: 'MARKET_NOT_FOUND',
        message: 'Market not found',
      });
    } else if (!market.canSupply) {
      errors.push({
        code: 'SUPPLY_DISABLED',
        message: 'Supply is currently disabled for this market',
      });
    } else if (market.isFrozen) {
      errors.push({
        code: 'MARKET_FROZEN',
        message: 'Market is frozen',
      });
    }

    // Check supply cap
    if (market?.supplyCap && market.supplyCap > 0n) {
      const remainingCap = market.supplyCap - market.totalSupply;
      if (params.amount > remainingCap) {
        errors.push({
          code: 'EXCEEDS_SUPPLY_CAP',
          message: `Amount exceeds supply cap. Maximum: ${this.formatAmount(remainingCap, params.asset)}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      insufficientBalance: balance < params.amount,
      exceedsCap: market?.supplyCap ? params.amount > (market.supplyCap - market.totalSupply) : false,
    };
  }

  async validateWithdraw(params: WithdrawParams): Promise<ValidationResult> {
    const errors: ActionError[] = [];
    const warnings: ActionWarning[] = [];

    // Get user position
    const positions = await this.getUserPositions(params.userAddress);
    const position = positions.find(p => p.marketId === params.marketId);

    if (!position) {
      errors.push({
        code: 'NO_POSITION',
        message: 'You have no supply position in this market',
      });
      return { valid: false, errors, warnings };
    }

    // Check withdrawal amount
    const maxWithdraw = params.maxWithdraw ? position.supplyBalance : params.amount;
    if (maxWithdraw > position.supplyBalance) {
      errors.push({
        code: 'INSUFFICIENT_SUPPLY',
        message: `Insufficient supply balance. You have ${this.formatAmount(position.supplyBalance, params.asset)}`,
      });
    }

    // Check health factor impact if user has borrows
    if (position.borrowBalance > 0n) {
      const projectedHF = await this.simulateHealthFactor(params.userAddress, {
        protocol: this.protocol,
        action: 'withdraw',
        marketId: params.marketId,
        asset: params.asset,
        amount: maxWithdraw,
      });

      if (projectedHF < 1) {
        errors.push({
          code: 'WOULD_CAUSE_LIQUIDATION',
          message: 'This withdrawal would cause your position to be liquidated',
        });
      } else if (projectedHF < 1.1) {
        warnings.push({
          code: 'LOW_HEALTH_FACTOR',
          message: `Health factor would drop to ${projectedHF.toFixed(2)}. Consider a smaller withdrawal.`,
          severity: 'high',
        });
      } else if (projectedHF < 1.5) {
        warnings.push({
          code: 'MODERATE_HEALTH_FACTOR',
          message: `Health factor would drop to ${projectedHF.toFixed(2)}`,
          severity: 'medium',
        });
      }
    }

    // Check available liquidity
    const market = await this.getMarket(params.marketId);
    if (market && maxWithdraw > market.availableLiquidity) {
      errors.push({
        code: 'INSUFFICIENT_LIQUIDITY',
        message: `Insufficient market liquidity. Available: ${this.formatAmount(market.availableLiquidity, params.asset)}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      insufficientLiquidity: market ? maxWithdraw > market.availableLiquidity : false,
      wouldCauseLiquidation: errors.some(e => e.code === 'WOULD_CAUSE_LIQUIDATION'),
    };
  }

  async validateBorrow(params: BorrowParams): Promise<ValidationResult> {
    const errors: ActionError[] = [];
    const warnings: ActionWarning[] = [];

    // Check market allows borrowing
    const market = await this.getMarket(params.marketId);
    if (!market) {
      errors.push({
        code: 'MARKET_NOT_FOUND',
        message: 'Market not found',
      });
      return { valid: false, errors, warnings };
    }

    if (!market.canBorrow) {
      errors.push({
        code: 'BORROW_DISABLED',
        message: 'Borrowing is disabled for this market',
      });
    }

    // Check available liquidity
    if (params.amount > market.availableLiquidity) {
      errors.push({
        code: 'INSUFFICIENT_LIQUIDITY',
        message: `Insufficient market liquidity. Available: ${this.formatAmount(market.availableLiquidity, params.asset)}`,
      });
    }

    // Check borrow cap
    if (market.borrowCap && market.borrowCap > 0n) {
      const remainingCap = market.borrowCap - market.totalBorrow;
      if (params.amount > remainingCap) {
        errors.push({
          code: 'EXCEEDS_BORROW_CAP',
          message: `Amount exceeds borrow cap. Maximum: ${this.formatAmount(remainingCap, params.asset)}`,
        });
      }
    }

    // Check LTV utilization
    try {
      const positions = await this.getUserPositions(params.userAddress);
      const allMarkets = await this.getMarkets();

      // Calculate current borrow capacity
      let totalCollateralUSD = 0;
      let weightedLTV = 0;
      let currentBorrowUSD = 0;

      for (const position of positions) {
        currentBorrowUSD += position.borrowBalanceUSD;

        if (!position.isCollateralEnabled) continue;

        const posMarket = allMarkets.find((m: LendingMarket) => m.id === position.marketId);
        if (!posMarket) continue;

        totalCollateralUSD += position.supplyBalanceUSD;
        weightedLTV += position.supplyBalanceUSD * posMarket.ltv;
      }

      const avgLTV = totalCollateralUSD > 0 ? weightedLTV / totalCollateralUSD : 0;
      const maxBorrowUSD = totalCollateralUSD * avgLTV;
      const availableBorrowUSD = Math.max(0, maxBorrowUSD - currentBorrowUSD);

      // Get borrow amount in USD (calculate price from market USD values)
      const borrowAmountNum = Number(params.amount) / Math.pow(10, market.assetDecimals);
      const assetPrice = market.totalSupply > 0n
        ? market.totalSupplyUSD / (Number(market.totalSupply) / Math.pow(10, market.assetDecimals))
        : 0;
      const borrowAmountUSD = borrowAmountNum * assetPrice;

      if (borrowAmountUSD > availableBorrowUSD) {
        errors.push({
          code: 'EXCEEDS_LTV_LIMIT',
          message: `Borrow exceeds your LTV limit. Maximum available: $${availableBorrowUSD.toFixed(2)}`,
        });
      }

      // Warn if using high percentage of borrow capacity
      const newUtilization = maxBorrowUSD > 0
        ? ((currentBorrowUSD + borrowAmountUSD) / maxBorrowUSD) * 100
        : 100;

      if (newUtilization > 80 && newUtilization <= 100 && errors.length === 0) {
        warnings.push({
          code: 'HIGH_LTV_UTILIZATION',
          message: `This borrow would use ${newUtilization.toFixed(0)}% of your borrow capacity. Consider a smaller amount.`,
          severity: 'high',
        });
      } else if (newUtilization > 60 && newUtilization <= 80) {
        warnings.push({
          code: 'MODERATE_LTV_UTILIZATION',
          message: `This borrow would use ${newUtilization.toFixed(0)}% of your borrow capacity.`,
          severity: 'medium',
        });
      }
    } catch (error) {
      // LTV check failed, continue without it
      console.warn('LTV validation check failed:', error);
    }

    // Check health factor after borrow
    const projectedHF = await this.simulateHealthFactor(params.userAddress, {
      protocol: this.protocol,
      action: 'borrow',
      marketId: params.marketId,
      asset: params.asset,
      amount: params.amount,
    });

    if (projectedHF < 1) {
      errors.push({
        code: 'WOULD_CAUSE_LIQUIDATION',
        message: 'This borrow would cause immediate liquidation. Add more collateral first.',
      });
    } else if (projectedHF < 1.1) {
      warnings.push({
        code: 'LOW_HEALTH_FACTOR',
        message: `Health factor would be ${projectedHF.toFixed(2)}. This is very risky.`,
        severity: 'high',
      });
    } else if (projectedHF < 1.5) {
      warnings.push({
        code: 'MODERATE_HEALTH_FACTOR',
        message: `Health factor would be ${projectedHF.toFixed(2)}. Consider borrowing less.`,
        severity: 'medium',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      insufficientLiquidity: params.amount > market.availableLiquidity,
      exceedsCap: market.borrowCap ? params.amount > (market.borrowCap - market.totalBorrow) : false,
      wouldCauseLiquidation: projectedHF < 1,
    };
  }

  async validateRepay(params: RepayParams): Promise<ValidationResult> {
    const errors: ActionError[] = [];
    const warnings: ActionWarning[] = [];

    // Get user position
    const positions = await this.getUserPositions(params.userAddress);
    const position = positions.find(p => p.marketId === params.marketId);

    if (!position || position.borrowBalance === 0n) {
      errors.push({
        code: 'NO_BORROW',
        message: 'You have no borrow position in this market',
      });
      return { valid: false, errors, warnings };
    }

    // Check user has enough to repay
    const balance = await this.getTokenBalance(params.asset, params.userAddress);
    const repayAmount = params.maxRepay ? position.borrowBalance : params.amount;

    if (repayAmount > balance) {
      errors.push({
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. You have ${this.formatAmount(balance, params.asset)} but trying to repay ${this.formatAmount(repayAmount, params.asset)}`,
      });
    }

    // Warn if repaying more than debt
    if (!params.maxRepay && params.amount > position.borrowBalance) {
      warnings.push({
        code: 'OVERPAY',
        message: `You're trying to repay more than your debt. Only ${this.formatAmount(position.borrowBalance, params.asset)} will be repaid.`,
        severity: 'low',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      insufficientBalance: repayAmount > balance,
    };
  }

  // ===========================================================================
  // COMMON HELPER METHODS
  // ===========================================================================

  /**
   * Build approval transaction if needed
   */
  protected async buildApprovalIfNeeded(
    token: Address,
    owner: Address,
    spender: Address,
    amount: bigint
  ): Promise<TransactionCall | null> {
    const allowance = await this.client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, spender],
    });

    if (allowance >= amount) {
      return null;
    }

    // Approve max uint256 for better UX (fewer approval txs)
    const MAX_UINT256 = 2n ** 256n - 1n;

    return {
      to: token,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, MAX_UINT256],
      }),
      description: `Approve ${await this.getTokenSymbol(token)} for ${this.protocol}`,
    };
  }

  /**
   * Get token balance for user
   */
  protected async getTokenBalance(token: Address, user: Address): Promise<bigint> {
    return await this.client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [user],
    });
  }

  /**
   * Get token decimals
   */
  protected async getTokenDecimals(token: Address): Promise<number> {
    return await this.client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'decimals',
    });
  }

  /**
   * Get token symbol
   */
  protected async getTokenSymbol(token: Address): Promise<string> {
    try {
      return await this.client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'symbol',
      });
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Format amount for display (utility)
   */
  protected formatAmount(amount: bigint, _token: Address): string {
    // This is a simplified version - in production, use token decimals
    return (Number(amount) / 1e18).toFixed(4);
  }

  /**
   * Categorize asset type
   */
  protected categorizeAsset(symbol: string): AssetCategory {
    const lowerSymbol = symbol.toLowerCase();

    if (['usdc', 'usdt', 'dai', 'usds', 'frax', 'lusd', 'gusd', 'susd'].some(s => lowerSymbol.includes(s))) {
      return 'stablecoin';
    }
    if (['wsteth', 'cbeth', 'reth', 'steth', 'weeth', 'oeth'].some(s => lowerSymbol.includes(s))) {
      return 'lsd';
    }
    if (['eth', 'weth'].some(s => lowerSymbol === s)) {
      return 'eth';
    }
    if (['wbtc', 'btc', 'cbbtc', 'tbtc'].some(s => lowerSymbol.includes(s))) {
      return 'wrapped';
    }
    return 'other';
  }

  /**
   * Convert annual rate to APY (for compound interest)
   */
  protected rateToAPY(ratePerSecond: bigint, rayPrecision: boolean = true): number {
    const scale = rayPrecision ? 1e27 : 1e18;
    const rate = Number(ratePerSecond) / scale;
    const secondsPerYear = 31536000;

    // APY = (1 + rate)^seconds - 1
    return (Math.pow(1 + rate, secondsPerYear) - 1) * 100;
  }

  /**
   * Convert APR to APY
   */
  protected aprToApy(apr: number): number {
    // APY = (1 + APR/n)^n - 1, where n = compounding periods
    // For continuous compounding: APY = e^APR - 1
    return (Math.exp(apr / 100) - 1) * 100;
  }
}
