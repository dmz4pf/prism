/**
 * Aave V3 Protocol Adapter
 * Handles WETH supply/withdraw operations on Base
 */

import { type Address, encodeFunctionData } from 'viem';
import { BaseProtocolAdapter } from './base-adapter';
import { BASE_MAINNET_CONTRACTS } from '@/contracts/addresses/base-mainnet';
import { AAVE_POOL_ABI, AAVE_WETH_GATEWAY_ABI, ERC20_ABI } from '@/contracts/abis';
import type {
  StakeQuote,
  TransactionFlow,
  StakingPosition,
  StakingType,
  TokenInfo,
  AavePosition,
  AaveSupply,
  AaveBorrow,
} from '@/types/staking';
import { pricesService } from '../prices';
import { yieldsService } from '../yields';

const WETH_TOKEN: TokenInfo = {
  symbol: 'WETH',
  name: 'Wrapped Ether',
  address: BASE_MAINNET_CONTRACTS.WETH as Address,
  decimals: 18,
};

const AWETH_TOKEN: TokenInfo = {
  symbol: 'aBasWETH',
  name: 'Aave Base WETH',
  address: BASE_MAINNET_CONTRACTS.aave.aBasWETH as Address,
  decimals: 18,
};

// Aave data types interest rate mode
const VARIABLE_RATE_MODE = 2n;

export class AaveAdapter extends BaseProtocolAdapter {
  name = 'Aave V3';
  type: StakingType = 'lending';

  /**
   * Get quote for supplying WETH to Aave
   * Supply is 1:1, aTokens represent deposit + accrued interest
   */
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    // Aave supply is 1:1 for aTokens
    const expectedOutput = amount;
    const minOutput = amount; // No slippage on supply

    const estimatedGas = 200000n;
    const gasPrice = await this.client.getGasPrice();
    const gasCostWei = estimatedGas * gasPrice;

    const ethPrice = await pricesService.getETHPrice();
    const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

    return {
      inputToken: WETH_TOKEN.address,
      outputToken: AWETH_TOKEN.address,
      inputAmount: amount,
      expectedOutput,
      minOutput,
      priceImpact: 0,
      route: ['WETH', 'aBasWETH'],
      estimatedGas,
      estimatedGasUsd: gasCostUsd,
      slippage: 0, // No slippage on Aave supply
    };
  }

  /**
   * Get quote for withdrawing WETH from Aave
   */
  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    // Withdraw is 1:1 for aTokens
    const expectedOutput = amount;
    const minOutput = amount;

    const estimatedGas = 250000n;
    const gasPrice = await this.client.getGasPrice();
    const gasCostWei = estimatedGas * gasPrice;

    const ethPrice = await pricesService.getETHPrice();
    const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

    return {
      inputToken: AWETH_TOKEN.address,
      outputToken: WETH_TOKEN.address,
      inputAmount: amount,
      expectedOutput,
      minOutput,
      priceImpact: 0,
      route: ['aBasWETH', 'WETH'],
      estimatedGas,
      estimatedGasUsd: gasCostUsd,
      slippage: 0,
    };
  }

  /**
   * Build transaction flow for supplying WETH
   * Flow: Approve WETH -> Supply to Aave Pool
   */
  async buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const quote = await this.getStakeQuote(amount, slippage);
    const flowId = this.generateFlowId();

    const steps = [
      // Step 1: Approve WETH spending
      {
        ...this.createApprovalStep(WETH_TOKEN, BASE_MAINNET_CONTRACTS.aave.pool),
        to: WETH_TOKEN.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BASE_MAINNET_CONTRACTS.aave.pool as Address, amount],
        }),
      },
      // Step 2: Supply WETH to Aave
      {
        ...this.createStep(
          'supply',
          'Supply WETH to Aave',
          `Supply ${this.formatAmount(amount, 18)} WETH to Aave V3`
        ),
        to: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'supply',
          args: [WETH_TOKEN.address, amount, recipient, 0],
        }),
      },
    ];

    return this.createFlow(
      flowId,
      'supply',
      this.name,
      steps,
      this.formatAmount(amount, 18),
      WETH_TOKEN,
      this.formatAmount(quote.expectedOutput, 18),
      AWETH_TOKEN
    );
  }

  /**
   * Build transaction flow for withdrawing WETH
   */
  async buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const quote = await this.getUnstakeQuote(amount, slippage);
    const flowId = this.generateFlowId();

    // Max uint256 to withdraw all
    const withdrawAmount = amount === 0n
      ? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      : amount;

    const steps = [
      // Single step: Withdraw from Aave
      {
        ...this.createStep(
          'withdraw',
          'Withdraw WETH from Aave',
          `Withdraw ${amount === 0n ? 'all' : this.formatAmount(amount, 18)} WETH from Aave V3`
        ),
        to: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'withdraw',
          args: [WETH_TOKEN.address, withdrawAmount, recipient],
        }),
      },
    ];

    return this.createFlow(
      flowId,
      'withdraw',
      this.name,
      steps,
      this.formatAmount(amount, 18),
      AWETH_TOKEN,
      this.formatAmount(quote.expectedOutput, 18),
      WETH_TOKEN
    );
  }

  /**
   * Build borrow transaction flow
   */
  async buildBorrowFlow(
    amount: bigint,
    recipient: Address,
    interestRateMode: bigint = VARIABLE_RATE_MODE
  ): Promise<TransactionFlow> {
    const flowId = this.generateFlowId();

    const steps = [
      {
        ...this.createStep(
          'borrow',
          'Borrow WETH from Aave',
          `Borrow ${this.formatAmount(amount, 18)} WETH from Aave V3`
        ),
        to: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'borrow',
          args: [WETH_TOKEN.address, amount, interestRateMode, 0, recipient],
        }),
      },
    ];

    return this.createFlow(
      flowId,
      'withdraw', // Using withdraw type for borrow
      this.name,
      steps,
      this.formatAmount(amount, 18),
      AWETH_TOKEN,
      this.formatAmount(amount, 18),
      WETH_TOKEN
    );
  }

  /**
   * Build repay transaction flow
   */
  async buildRepayFlow(
    amount: bigint,
    recipient: Address,
    interestRateMode: bigint = VARIABLE_RATE_MODE
  ): Promise<TransactionFlow> {
    const flowId = this.generateFlowId();

    const steps = [
      // Step 1: Approve WETH
      {
        ...this.createApprovalStep(WETH_TOKEN, BASE_MAINNET_CONTRACTS.aave.pool),
        to: WETH_TOKEN.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BASE_MAINNET_CONTRACTS.aave.pool as Address, amount],
        }),
      },
      // Step 2: Repay
      {
        ...this.createStep(
          'repay',
          'Repay WETH to Aave',
          `Repay ${this.formatAmount(amount, 18)} WETH to Aave V3`
        ),
        to: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'repay',
          args: [WETH_TOKEN.address, amount, interestRateMode, recipient],
        }),
      },
    ];

    return this.createFlow(
      flowId,
      'supply', // Using supply type for repay
      this.name,
      steps,
      this.formatAmount(amount, 18),
      WETH_TOKEN,
      '0',
      WETH_TOKEN
    );
  }

  /**
   * Get user's Aave position including supplies and borrows
   */
  async getPosition(user: Address): Promise<AavePosition | null> {
    try {
      // Get user account data from Aave
      const accountData = await this.client.readContract({
        address: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [user],
      });

      const [
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThreshold,
        ltv,
        healthFactor,
      ] = accountData as [bigint, bigint, bigint, bigint, bigint, bigint];

      // If no collateral, return null
      if (totalCollateralBase === 0n) return null;

      // Get aWETH balance
      const aWethBalance = await this.client.readContract({
        address: AWETH_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });

      const prices = await pricesService.getAllPrices();
      const ethPrice = prices['ETH'].priceUsd;
      const apy = await this.getAPY();

      const balanceFormatted = this.formatAmount(aWethBalance, 18);
      const balanceUsd = parseFloat(balanceFormatted) * ethPrice;

      // Build supplies array
      const supplies: AaveSupply[] = [];
      if (aWethBalance > 0n) {
        supplies.push({
          token: AWETH_TOKEN,
          balance: balanceFormatted,
          balanceUsd,
          apy,
          isCollateral: true,
        });
      }

      // Build borrows array (simplified - would need to check debt tokens)
      const borrows: AaveBorrow[] = [];
      if (totalDebtBase > 0n) {
        const debtUsd = Number(totalDebtBase) / 1e8; // Base currency is USD with 8 decimals
        borrows.push({
          token: WETH_TOKEN,
          balance: (debtUsd / ethPrice).toFixed(6),
          balanceUsd: debtUsd,
          apy: 3.5, // Approximate borrow APY
          rateMode: 'variable',
        });
      }

      return {
        id: `aave-weth-${user}`,
        protocol: this.name,
        type: this.type,
        token: AWETH_TOKEN,
        balance: balanceFormatted,
        balanceUsd,
        apy,
        earnedTotal: '0',
        earnedTotalUsd: 0,
        entryDate: new Date().toISOString(),
        entryPrice: ethPrice,
        supplies,
        borrows,
        healthFactor: Number(healthFactor) / 1e18,
        availableBorrows: Number(availableBorrowsBase) / 1e8,
        ltv: Number(ltv) / 100,
        liquidationThreshold: Number(currentLiquidationThreshold) / 100,
        collateralValue: Number(totalCollateralBase) / 1e8,
        debtValue: Number(totalDebtBase) / 1e8,
      };
    } catch (error) {
      console.error('Failed to get Aave position:', error);
      return null;
    }
  }

  /**
   * Get user's health factor
   */
  async getHealthFactor(user: Address): Promise<number> {
    try {
      const accountData = await this.client.readContract({
        address: BASE_MAINNET_CONTRACTS.aave.pool as Address,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [user],
      });

      const healthFactor = (accountData as [bigint, bigint, bigint, bigint, bigint, bigint])[5];
      return Number(healthFactor) / 1e18;
    } catch (error) {
      console.error('Failed to get health factor:', error);
      return 0;
    }
  }

  /**
   * Get current supply APY
   */
  async getAPY(): Promise<number> {
    const option = await yieldsService.getStakingOption('aave-weth');
    return option?.apy || 1.5;
  }
}

// Export singleton
export const aaveAdapter = new AaveAdapter();
