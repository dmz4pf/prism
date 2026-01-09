/**
 * Lido Protocol Adapter
 * Handles wstETH staking operations on Base
 */

import { type Address, encodeFunctionData } from 'viem';
import { BaseProtocolAdapter } from './base-adapter';
import { BASE_MAINNET_CONTRACTS } from '@/contracts/addresses/base-mainnet';
import { LIDO_WSTETH_ABI } from '@/contracts/abis';
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

const WETH_TOKEN: TokenInfo = {
  symbol: 'WETH',
  name: 'Wrapped Ether',
  address: BASE_MAINNET_CONTRACTS.WETH as Address,
  decimals: 18,
};

const WSTETH_TOKEN: TokenInfo = {
  symbol: 'wstETH',
  name: 'Wrapped Staked ETH',
  address: BASE_MAINNET_CONTRACTS.wstETH as Address,
  decimals: 18,
};

export class LidoAdapter extends BaseProtocolAdapter {
  name = 'Lido';
  type: StakingType = 'liquid-staking';

  /**
   * Get quote for staking ETH to wstETH
   * On Base, we swap WETH -> wstETH via Aerodrome
   */
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    // Get wstETH/ETH ratio from price service
    const wstethRatio = await pricesService.getWstETHRatio();

    // Calculate expected output (1 ETH = ~0.85 wstETH due to rebasing)
    const expectedOutput = (amount * BigInt(Math.floor(wstethRatio * 1e18))) / BigInt(1e18);
    const minOutput = this.calculateMinOutput(expectedOutput, slippage);

    // Estimate gas (swap + approval)
    const estimatedGas = 150000n;
    const gasPrice = await this.client.getGasPrice();
    const gasCostWei = estimatedGas * gasPrice;

    const ethPrice = await pricesService.getETHPrice();
    const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

    return {
      inputToken: WETH_TOKEN.address,
      outputToken: WSTETH_TOKEN.address,
      inputAmount: amount,
      expectedOutput,
      minOutput,
      priceImpact: 0.1, // Typically very low for wstETH
      route: ['WETH', 'wstETH'],
      estimatedGas,
      estimatedGasUsd: gasCostUsd,
      slippage,
    };
  }

  /**
   * Get quote for unstaking wstETH to ETH
   */
  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    const wstethRatio = await pricesService.getWstETHRatio();

    // Calculate expected output (wstETH -> ETH)
    const expectedOutput = (amount * BigInt(1e18)) / BigInt(Math.floor(wstethRatio * 1e18));
    const minOutput = this.calculateMinOutput(expectedOutput, slippage);

    const estimatedGas = 150000n;
    const gasPrice = await this.client.getGasPrice();
    const gasCostWei = estimatedGas * gasPrice;

    const ethPrice = await pricesService.getETHPrice();
    const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

    return {
      inputToken: WSTETH_TOKEN.address,
      outputToken: WETH_TOKEN.address,
      inputAmount: amount,
      expectedOutput,
      minOutput,
      priceImpact: 0.1,
      route: ['wstETH', 'WETH'],
      estimatedGas,
      estimatedGasUsd: gasCostUsd,
      slippage,
    };
  }

  /**
   * Build transaction flow for staking
   * Flow: Approve WETH -> Swap WETH to wstETH via Aerodrome
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
        ...this.createApprovalStep(WETH_TOKEN, BASE_MAINNET_CONTRACTS.aerodrome.router),
        to: WETH_TOKEN.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BASE_MAINNET_CONTRACTS.aerodrome.router as Address, amount],
        }),
      },
      // Step 2: Swap WETH -> wstETH via Aerodrome
      {
        ...this.createStep(
          'swap',
          'Swap WETH to wstETH',
          `Swap ${this.formatAmount(amount, 18)} WETH for wstETH`
        ),
        to: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        data: encodeFunctionData({
          abi: [{
            name: 'swapExactTokensForTokens',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMin', type: 'uint256' },
              {
                name: 'routes',
                type: 'tuple[]',
                components: [
                  { name: 'from', type: 'address' },
                  { name: 'to', type: 'address' },
                  { name: 'stable', type: 'bool' },
                  { name: 'factory', type: 'address' },
                ],
              },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
          }],
          functionName: 'swapExactTokensForTokens',
          args: [
            amount, // amountIn
            quote.minOutput, // amountOutMin (with slippage protection)
            [
              {
                from: WETH_TOKEN.address,
                to: WSTETH_TOKEN.address,
                stable: true, // wstETH/WETH is a stable pair
                factory: BASE_MAINNET_CONTRACTS.aerodrome.defaultFactory as Address,
              },
            ], // routes
            recipient, // to
            BigInt(Math.floor(Date.now() / 1000) + 1200), // deadline (20 minutes)
          ],
        }),
        value: 0n,
      },
    ];

    return this.createFlow(
      flowId,
      'stake',
      this.name,
      steps,
      this.formatAmount(amount, 18),
      WETH_TOKEN,
      this.formatAmount(quote.expectedOutput, 18),
      WSTETH_TOKEN
    );
  }

  /**
   * Build transaction flow for unstaking
   */
  async buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const quote = await this.getUnstakeQuote(amount, slippage);
    const flowId = this.generateFlowId();

    const steps = [
      // Step 1: Approve wstETH spending
      {
        ...this.createApprovalStep(WSTETH_TOKEN, BASE_MAINNET_CONTRACTS.aerodrome.router),
        to: WSTETH_TOKEN.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BASE_MAINNET_CONTRACTS.aerodrome.router as Address, amount],
        }),
      },
      // Step 2: Swap wstETH -> WETH via Aerodrome
      {
        ...this.createStep(
          'swap',
          'Swap wstETH to WETH',
          `Swap ${this.formatAmount(amount, 18)} wstETH for WETH`
        ),
        to: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        data: encodeFunctionData({
          abi: [{
            name: 'swapExactTokensForTokens',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMin', type: 'uint256' },
              {
                name: 'routes',
                type: 'tuple[]',
                components: [
                  { name: 'from', type: 'address' },
                  { name: 'to', type: 'address' },
                  { name: 'stable', type: 'bool' },
                  { name: 'factory', type: 'address' },
                ],
              },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
          }],
          functionName: 'swapExactTokensForTokens',
          args: [
            amount, // amountIn
            quote.minOutput, // amountOutMin (with slippage protection)
            [
              {
                from: WSTETH_TOKEN.address,
                to: WETH_TOKEN.address,
                stable: true, // wstETH/WETH is a stable pair
                factory: BASE_MAINNET_CONTRACTS.aerodrome.defaultFactory as Address,
              },
            ], // routes
            recipient, // to
            BigInt(Math.floor(Date.now() / 1000) + 1200), // deadline (20 minutes)
          ],
        }),
        value: 0n,
      },
    ];

    return this.createFlow(
      flowId,
      'unstake',
      this.name,
      steps,
      this.formatAmount(amount, 18),
      WSTETH_TOKEN,
      this.formatAmount(quote.expectedOutput, 18),
      WETH_TOKEN
    );
  }

  /**
   * Get user's wstETH position
   */
  async getPosition(user: Address): Promise<StakingPosition | null> {
    try {
      const balance = await this.client.readContract({
        address: WSTETH_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });

      if (balance === 0n) return null;

      const prices = await pricesService.getAllPrices();
      const wstethPrice = prices['wstETH'];
      const apy = await this.getAPY();

      const balanceFormatted = this.formatAmount(balance, 18);
      const balanceUsd = parseFloat(balanceFormatted) * wstethPrice.priceUsd;

      // Get entry data for earnings calculation
      const entryData = this.getEntryData(user, 'lido');
      let earnedTotal = '0';
      let earnedTotalUsd = 0;
      let entryPrice = wstethPrice.priceUsd;
      let entryDate = new Date().toISOString();

      if (entryData) {
        // Calculate earnings since entry
        const earnings = this.calculateEarnings(
          balanceFormatted,
          wstethPrice.priceUsd,
          entryData.price
        );
        earnedTotal = earnings.earnedTotal;
        earnedTotalUsd = earnings.earnedTotalUsd;
        entryPrice = entryData.price;
        entryDate = entryData.date;
      } else {
        // First time seeing this position - store current as entry
        this.storeEntryData(user, 'lido', balanceFormatted, wstethPrice.priceUsd);
      }

      return {
        id: `lido-wsteth-${user}`,
        protocol: this.name,
        type: this.type,
        token: WSTETH_TOKEN,
        balance: balanceFormatted,
        balanceUsd,
        apy,
        earnedTotal,
        earnedTotalUsd,
        entryDate,
        entryPrice,
      };
    } catch (error) {
      console.error('Failed to get Lido position:', error);
      return null;
    }
  }

  /**
   * Get current APY from Lido
   */
  async getAPY(): Promise<number> {
    const option = await yieldsService.getStakingOption('wsteth');
    return option?.apy || 3.4;
  }
}

// Export singleton
export const lidoAdapter = new LidoAdapter();
