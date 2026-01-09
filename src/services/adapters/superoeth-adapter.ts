/**
 * Super OETH (Origin Protocol) Adapter
 * Handles superOETHb staking on Base
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

const SUPEROETH_TOKEN: TokenInfo = {
  symbol: 'superOETHb',
  name: 'Super OETH',
  address: BASE_MAINNET_CONTRACTS.superOETHb as Address,
  decimals: 18,
};

// Super OETH vault for direct minting (if available)
const SUPEROETH_VAULT = BASE_MAINNET_CONTRACTS.superOETHb as Address;

// superOETH ABI for zapper
const SUPEROETH_ZAPPER_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'depositWETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export class SuperOETHAdapter extends BaseProtocolAdapter {
  name = 'Origin Protocol';
  type: StakingType = 'supercharged-lst';

  /**
   * Get quote for staking ETH to superOETHb
   * superOETHb maintains 1:1 peg with ETH via Aerodrome AMO
   */
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    // superOETHb trades close to 1:1 with WETH
    // Get actual quote from Aerodrome for accuracy
    try {
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        WETH_TOKEN.address,
        SUPEROETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      // Fallback to 1:1 estimate
      const expectedOutput = amount;
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 200000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: WETH_TOKEN.address,
        outputToken: SUPEROETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.1,
        route: ['WETH', 'superOETHb'],
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    }
  }

  /**
   * Get quote for unstaking superOETHb to ETH
   */
  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    try {
      const aeroQuote = await aerodromeAdapter.getSwapQuote(
        SUPEROETH_TOKEN.address,
        WETH_TOKEN.address,
        amount,
        slippage
      );
      return aeroQuote;
    } catch {
      const expectedOutput = amount;
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      const estimatedGas = 200000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: SUPEROETH_TOKEN.address,
        outputToken: WETH_TOKEN.address,
        inputAmount: amount,
        expectedOutput,
        minOutput,
        priceImpact: 0.1,
        route: ['superOETHb', 'WETH'],
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    }
  }

  /**
   * Build transaction flow for staking
   * Flow: Approve WETH -> Swap via Aerodrome to superOETHb
   */
  async buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    // Use Aerodrome for the swap
    const swapFlow = await aerodromeAdapter.buildSwapFlow(
      WETH_TOKEN.address,
      SUPEROETH_TOKEN.address,
      amount,
      recipient,
      slippage
    );

    // Rebrand the flow for Super OETH
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
      SUPEROETH_TOKEN.address,
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
   * Get user's superOETHb position
   */
  async getPosition(user: Address): Promise<StakingPosition | null> {
    try {
      const balance = await this.client.readContract({
        address: SUPEROETH_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });

      if (balance === 0n) return null;

      const prices = await pricesService.getAllPrices();
      const superOethPrice = prices['superOETHb'] || prices['ETH'];
      const apy = await this.getAPY();

      const balanceFormatted = this.formatAmount(balance, 18);
      const balanceUsd = parseFloat(balanceFormatted) * superOethPrice.priceUsd;

      // Get entry data for earnings calculation
      const entryData = this.getEntryData(user, 'superoeth');
      let earnedTotal = '0';
      let earnedTotalUsd = 0;
      let entryPrice = superOethPrice.priceUsd;
      let entryDate = new Date().toISOString();

      if (entryData) {
        // Calculate earnings since entry
        const earnings = this.calculateEarnings(
          balanceFormatted,
          superOethPrice.priceUsd,
          entryData.price
        );
        earnedTotal = earnings.earnedTotal;
        earnedTotalUsd = earnings.earnedTotalUsd;
        entryPrice = entryData.price;
        entryDate = entryData.date;
      } else {
        // First time seeing this position - store current as entry
        this.storeEntryData(user, 'superoeth', balanceFormatted, superOethPrice.priceUsd);
      }

      return {
        id: `origin-superoeth-${user}`,
        protocol: this.name,
        type: this.type,
        token: SUPEROETH_TOKEN,
        balance: balanceFormatted,
        balanceUsd,
        apy,
        earnedTotal,
        earnedTotalUsd,
        entryDate,
        entryPrice,
      };
    } catch (error) {
      console.error('Failed to get Super OETH position:', error);
      return null;
    }
  }

  /**
   * Get current APY
   * superOETHb combines ETH staking yield + Aerodrome LP rewards
   */
  async getAPY(): Promise<number> {
    const option = await yieldsService.getStakingOption('superoethb');
    return option?.apy || 8.0;
  }

  /**
   * Get APY breakdown
   */
  async getAPYBreakdown(): Promise<{ base: number; rewards: number; total: number }> {
    const option = await yieldsService.getStakingOption('superoethb');
    if (option?.apyBreakdown) {
      return {
        base: option.apyBreakdown.base,
        rewards: option.apyBreakdown.rewards || 0,
        total: option.apyBreakdown.total,
      };
    }
    return {
      base: 3.4, // ETH staking
      rewards: 4.6, // Aerodrome incentives
      total: 8.0,
    };
  }
}

// Export singleton
export const superOETHAdapter = new SuperOETHAdapter();
