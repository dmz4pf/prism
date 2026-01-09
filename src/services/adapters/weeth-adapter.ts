/**
 * weETH (Ether.fi) Adapter
 * Handles weETH liquid restaking on Base
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

const WEETH_TOKEN: TokenInfo = {
  symbol: 'weETH',
  name: 'Wrapped eETH',
  address: BASE_MAINNET_CONTRACTS.weETH as Address,
  decimals: 18,
};

export class WeETHAdapter extends BaseProtocolAdapter {
  name = 'Ether.fi';
  type: StakingType = 'liquid-restaking';

  /**
   * Get quote for staking ETH to weETH
   * weETH trades at a slight premium to ETH due to restaking rewards
   */
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    try {
      // Get quote from Aerodrome
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        WETH_TOKEN.address,
        WEETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      // Fallback: weETH typically trades ~2% premium
      const ratio = 0.98; // 1 ETH = ~0.98 weETH
      const expectedOutput = BigInt(Math.floor(Number(amount) * ratio));
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 200000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: WETH_TOKEN.address,
        outputToken: WEETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.15,
        route: ['WETH', 'weETH'],
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    }
  }

  /**
   * Get quote for unstaking weETH to ETH
   */
  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    try {
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        WEETH_TOKEN.address,
        WETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      // Fallback: inverse of stake ratio
      const ratio = 1.02; // 1 weETH = ~1.02 ETH
      const expectedOutput = BigInt(Math.floor(Number(amount) * ratio));
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 200000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: WEETH_TOKEN.address,
        outputToken: WETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.15,
        route: ['weETH', 'WETH'],
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
      WEETH_TOKEN.address,
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
      WEETH_TOKEN.address,
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
   * Get user's weETH position
   */
  async getPosition(user: Address): Promise<StakingPosition | null> {
    try {
      const balance = await this.client.readContract({
        address: WEETH_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });

      if (balance === 0n) return null;

      const prices = await pricesService.getAllPrices();
      const weethPrice = prices['weETH'] || prices['ETH'];
      const apy = await this.getAPY();

      const balanceFormatted = this.formatAmount(balance, 18);
      const balanceUsd = parseFloat(balanceFormatted) * weethPrice.priceUsd;

      // Get entry data for earnings calculation
      const entryData = this.getEntryData(user, 'weeth');
      let earnedTotal = '0';
      let earnedTotalUsd = 0;
      let entryPrice = weethPrice.priceUsd;
      let entryDate = new Date().toISOString();

      if (entryData) {
        // Calculate earnings since entry
        const earnings = this.calculateEarnings(
          balanceFormatted,
          weethPrice.priceUsd,
          entryData.price
        );
        earnedTotal = earnings.earnedTotal;
        earnedTotalUsd = earnings.earnedTotalUsd;
        entryPrice = entryData.price;
        entryDate = entryData.date;
      } else {
        // First time seeing this position - store current as entry
        this.storeEntryData(user, 'weeth', balanceFormatted, weethPrice.priceUsd);
      }

      return {
        id: `etherfi-weeth-${user}`,
        protocol: this.name,
        type: this.type,
        token: WEETH_TOKEN,
        balance: balanceFormatted,
        balanceUsd,
        apy,
        earnedTotal,
        earnedTotalUsd,
        entryDate,
        entryPrice,
      };
    } catch (error) {
      console.error('Failed to get weETH position:', error);
      return null;
    }
  }

  /**
   * Get current APY
   * weETH combines ETH staking + EigenLayer restaking rewards
   */
  async getAPY(): Promise<number> {
    const option = await yieldsService.getStakingOption('weeth');
    return option?.apy || 4.5;
  }

  /**
   * Get APY breakdown
   */
  async getAPYBreakdown(): Promise<{ base: number; rewards: number; total: number }> {
    const option = await yieldsService.getStakingOption('weeth');
    if (option?.apyBreakdown) {
      return {
        base: option.apyBreakdown.base,
        rewards: option.apyBreakdown.rewards || 0,
        total: option.apyBreakdown.total,
      };
    }
    return {
      base: 3.4, // ETH staking
      rewards: 1.1, // EigenLayer restaking
      total: 4.5,
    };
  }

  /**
   * Get info about withdrawal period
   * weETH has a 7-day unbonding period for direct withdrawals
   */
  getWithdrawalInfo(): { unbondingPeriod: string; instantExit: boolean } {
    return {
      unbondingPeriod: '7 days',
      instantExit: true, // Can swap instantly via Aerodrome
    };
  }
}

// Export singleton
export const weETHAdapter = new WeETHAdapter();
