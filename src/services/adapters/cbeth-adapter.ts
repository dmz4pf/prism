/**
 * cbETH (Coinbase) Adapter
 * Handles cbETH liquid staking on Base
 */

import { type Address, encodeFunctionData } from 'viem';
import { BaseProtocolAdapter } from './base-adapter';
import { BASE_MAINNET_CONTRACTS } from '@/contracts/addresses/base-mainnet';
import { ERC20_ABI } from '@/contracts/abis';
import type {
  StakeQuote,
  TransactionFlow,
  StakingPosition,
  StakingType,
  TokenInfo,
} from '@/types/staking';
import { pricesService } from '../prices';
import { yieldsService } from '../yields';
import { aerodromeAdapter } from './aerodrome-adapter';

const WETH_TOKEN: TokenInfo = {
  symbol: 'WETH',
  name: 'Wrapped Ether',
  address: BASE_MAINNET_CONTRACTS.WETH as Address,
  decimals: 18,
};

const CBETH_TOKEN: TokenInfo = {
  symbol: 'cbETH',
  name: 'Coinbase Wrapped Staked ETH',
  address: BASE_MAINNET_CONTRACTS.cbETH as Address,
  decimals: 18,
};

export class CbETHAdapter extends BaseProtocolAdapter {
  name = 'Coinbase';
  type: StakingType = 'liquid-staking';

  /**
   * Get quote for staking ETH to cbETH
   * cbETH is value-accruing (like wstETH), not rebasing
   */
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    // Get cbETH/ETH ratio from price service
    const cbethRatio = await pricesService.getCbETHRatio();

    try {
      // Get actual quote from Aerodrome for accuracy
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        WETH_TOKEN.address,
        CBETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      // Fallback using ratio
      const expectedOutput = (amount * BigInt(Math.floor(cbethRatio * 1e18))) / BigInt(1e18);
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 180000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: WETH_TOKEN.address,
        outputToken: CBETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.1,
        route: ['WETH', 'cbETH'],
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    }
  }

  /**
   * Get quote for unstaking cbETH to ETH
   */
  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    const cbethRatio = await pricesService.getCbETHRatio();

    try {
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        CBETH_TOKEN.address,
        WETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      // Inverse of stake ratio
      const expectedOutput = (amount * BigInt(1e18)) / BigInt(Math.floor(cbethRatio * 1e18));
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 180000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: CBETH_TOKEN.address,
        outputToken: WETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.1,
        route: ['cbETH', 'WETH'],
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    }
  }

  /**
   * Build transaction flow for staking
   */
  async buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const swapFlow = await aerodromeAdapter.buildSwapFlow(
      WETH_TOKEN.address,
      CBETH_TOKEN.address,
      amount,
      recipient,
      slippage
    );

    return {
      ...swapFlow,
      id: this.generateFlowId(),
      protocol: this.name,
      type: 'stake',
    };
  }

  /**
   * Build transaction flow for unstaking
   */
  async buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const swapFlow = await aerodromeAdapter.buildSwapFlow(
      CBETH_TOKEN.address,
      WETH_TOKEN.address,
      amount,
      recipient,
      slippage
    );

    return {
      ...swapFlow,
      id: this.generateFlowId(),
      protocol: this.name,
      type: 'unstake',
    };
  }

  /**
   * Get user's cbETH position
   */
  async getPosition(user: Address): Promise<StakingPosition | null> {
    try {
      const balance = await this.client.readContract({
        address: CBETH_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });

      if (balance === 0n) return null;

      const prices = await pricesService.getAllPrices();
      const cbethPrice = prices['cbETH'];
      const apy = await this.getAPY();

      const balanceFormatted = this.formatAmount(balance, 18);
      const balanceUsd = parseFloat(balanceFormatted) * cbethPrice.priceUsd;

      // Get entry data for earnings calculation
      const entryData = this.getEntryData(user, 'cbeth');
      let earnedTotal = '0';
      let earnedTotalUsd = 0;
      let entryPrice = cbethPrice.priceUsd;
      let entryDate = new Date().toISOString();

      if (entryData) {
        // Calculate earnings since entry
        const earnings = this.calculateEarnings(
          balanceFormatted,
          cbethPrice.priceUsd,
          entryData.price
        );
        earnedTotal = earnings.earnedTotal;
        earnedTotalUsd = earnings.earnedTotalUsd;
        entryPrice = entryData.price;
        entryDate = entryData.date;
      } else {
        // First time seeing this position - store current as entry
        this.storeEntryData(user, 'cbeth', balanceFormatted, cbethPrice.priceUsd);
      }

      return {
        id: `coinbase-cbeth-${user}`,
        protocol: this.name,
        type: this.type,
        token: CBETH_TOKEN,
        balance: balanceFormatted,
        balanceUsd,
        apy,
        earnedTotal,
        earnedTotalUsd,
        entryDate,
        entryPrice,
      };
    } catch (error) {
      console.error('Failed to get cbETH position:', error);
      return null;
    }
  }

  /**
   * Get current APY
   */
  async getAPY(): Promise<number> {
    const option = await yieldsService.getStakingOption('cbeth');
    return option?.apy || 2.78;
  }

  /**
   * Get info about cbETH
   */
  getProtocolInfo(): {
    commission: number;
    native: boolean;
    operator: string;
  } {
    return {
      commission: 0.35, // 35% commission rate
      native: true, // Native to Base (no bridging required)
      operator: 'Coinbase',
    };
  }
}

// Export singleton
export const cbETHAdapter = new CbETHAdapter();
