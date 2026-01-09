/**
 * Aerodrome DEX Adapter
 * Handles token swaps on Base via Aerodrome
 */

import { type Address, encodeFunctionData } from 'viem';
import { BaseProtocolAdapter } from './base-adapter';
import { BASE_MAINNET_CONTRACTS } from '@/contracts/addresses/base-mainnet';
import { AERODROME_ROUTER_ABI, AERODROME_POOL_ABI } from '@/contracts/abis';
import { ERC20_ABI } from '@/contracts/abis';
import type {
  StakeQuote,
  TransactionFlow,
  TransactionStep,
  StakingPosition,
  StakingType,
  TokenInfo,
  SwapRoute,
} from '@/types/staking';
import { pricesService } from '../prices';

// Common tokens on Base
const TOKENS: Record<string, TokenInfo> = {
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: BASE_MAINNET_CONTRACTS.WETH as Address,
    decimals: 18,
  },
  wstETH: {
    symbol: 'wstETH',
    name: 'Wrapped Staked ETH',
    address: BASE_MAINNET_CONTRACTS.wstETH as Address,
    decimals: 18,
  },
  cbETH: {
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    address: BASE_MAINNET_CONTRACTS.cbETH as Address,
    decimals: 18,
  },
  superOETHb: {
    symbol: 'superOETHb',
    name: 'Super OETH',
    address: BASE_MAINNET_CONTRACTS.superOETHb as Address,
    decimals: 18,
  },
  weETH: {
    symbol: 'weETH',
    name: 'Wrapped eETH',
    address: BASE_MAINNET_CONTRACTS.weETH as Address,
    decimals: 18,
  },
};

// Aerodrome factory addresses for different pool types
const AERODROME_FACTORIES = {
  volatile: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as Address, // v2
  stable: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A' as Address, // Stable
};

export class AerodromeAdapter extends BaseProtocolAdapter {
  name = 'Aerodrome';
  type: StakingType = 'liquid-staking'; // Used for swaps in staking flows

  /**
   * Get the best route for a swap
   */
  private getSwapRoute(
    tokenIn: Address,
    tokenOut: Address
  ): SwapRoute[] {
    // For ETH derivatives, use stable pools when available
    const isStableSwap = this.isStablePair(tokenIn, tokenOut);

    return [
      {
        from: tokenIn,
        to: tokenOut,
        stable: isStableSwap,
        factory: isStableSwap ? AERODROME_FACTORIES.stable : AERODROME_FACTORIES.volatile,
      },
    ];
  }

  /**
   * Check if pair should use stable pool
   */
  private isStablePair(tokenA: Address, tokenB: Address): boolean {
    const stableTokens = [
      BASE_MAINNET_CONTRACTS.WETH.toLowerCase(),
      BASE_MAINNET_CONTRACTS.wstETH.toLowerCase(),
      BASE_MAINNET_CONTRACTS.cbETH.toLowerCase(),
      BASE_MAINNET_CONTRACTS.superOETHb.toLowerCase(),
      BASE_MAINNET_CONTRACTS.weETH.toLowerCase(),
    ];

    return (
      stableTokens.includes(tokenA.toLowerCase()) &&
      stableTokens.includes(tokenB.toLowerCase())
    );
  }

  /**
   * Get swap quote
   */
  async getSwapQuote(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    slippage: number
  ): Promise<StakeQuote> {
    const routes = this.getSwapRoute(tokenIn, tokenOut);

    try {
      // Get amounts out from router
      const amountsOut = await this.client.readContract({
        address: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        abi: AERODROME_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, routes],
      });

      const expectedOutput = (amountsOut as bigint[])[amountsOut.length - 1];
      const minOutput = this.calculateMinOutput(expectedOutput, slippage);

      // Calculate price impact
      const priceImpact = await this.calculatePriceImpact(
        tokenIn,
        tokenOut,
        amountIn,
        expectedOutput
      );

      const estimatedGas = 200000n;
      const gasPrice = await this.client.getGasPrice();
      const gasCostWei = estimatedGas * gasPrice;

      const ethPrice = await pricesService.getETHPrice();
      const gasCostUsd = Number(gasCostWei) / 1e18 * ethPrice;

      return {
        inputToken: tokenIn,
        outputToken: tokenOut,
        inputAmount: amountIn,
        expectedOutput,
        minOutput,
        priceImpact,
        route: routes.map((r) => this.getTokenSymbol(r.from)),
        estimatedGas,
        estimatedGasUsd: gasCostUsd,
        slippage,
      };
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw error;
    }
  }

  /**
   * Calculate price impact
   */
  private async calculatePriceImpact(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOut: bigint
  ): Promise<number> {
    try {
      // Get small quote to establish "spot" price
      const smallAmount = amountIn / 1000n || 1n;
      const routes = this.getSwapRoute(tokenIn, tokenOut);

      const smallAmountsOut = await this.client.readContract({
        address: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        abi: AERODROME_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [smallAmount, routes],
      });

      const smallOutput = (smallAmountsOut as bigint[])[smallAmountsOut.length - 1];

      // Calculate expected output at spot rate
      const spotRate = Number(smallOutput) / Number(smallAmount);
      const expectedAtSpot = Number(amountIn) * spotRate;
      const actualOutput = Number(amountOut);

      // Price impact = (expected - actual) / expected * 100
      const priceImpact = ((expectedAtSpot - actualOutput) / expectedAtSpot) * 100;
      return Math.max(0, priceImpact);
    } catch {
      return 0.1; // Default small impact
    }
  }

  /**
   * Get token symbol from address
   */
  private getTokenSymbol(address: Address): string {
    for (const [symbol, token] of Object.entries(TOKENS)) {
      if (token.address.toLowerCase() === address.toLowerCase()) {
        return symbol;
      }
    }
    return address.slice(0, 8);
  }

  /**
   * Get token info from address
   */
  getTokenInfo(address: Address): TokenInfo | null {
    for (const token of Object.values(TOKENS)) {
      if (token.address.toLowerCase() === address.toLowerCase()) {
        return token;
      }
    }
    return null;
  }

  // Required interface methods (delegated to swap methods)
  async getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    return this.getSwapQuote(
      TOKENS.WETH.address,
      TOKENS.wstETH.address,
      amount,
      slippage
    );
  }

  async getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote> {
    return this.getSwapQuote(
      TOKENS.wstETH.address,
      TOKENS.WETH.address,
      amount,
      slippage
    );
  }

  /**
   * Build swap transaction flow
   */
  async buildSwapFlow(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    const quote = await this.getSwapQuote(tokenIn, tokenOut, amountIn, slippage);
    const flowId = this.generateFlowId();
    const routes = this.getSwapRoute(tokenIn, tokenOut);

    const tokenInInfo = this.getTokenInfo(tokenIn) || TOKENS.WETH;
    const tokenOutInfo = this.getTokenInfo(tokenOut) || TOKENS.wstETH;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

    const steps: TransactionStep[] = [
      // Step 1: Approve token spending
      {
        ...this.createApprovalStep(tokenInInfo, BASE_MAINNET_CONTRACTS.aerodrome.router),
        to: tokenIn,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BASE_MAINNET_CONTRACTS.aerodrome.router as Address, amountIn],
        }),
      },
      // Step 2: Execute swap
      {
        ...this.createStep(
          'swap',
          `Swap ${tokenInInfo.symbol} to ${tokenOutInfo.symbol}`,
          `Swap ${this.formatAmount(amountIn, tokenInInfo.decimals)} ${tokenInInfo.symbol} for ${tokenOutInfo.symbol}`
        ),
        to: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        data: encodeFunctionData({
          abi: AERODROME_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountIn, quote.minOutput, routes, recipient, deadline],
        }),
      },
    ];

    return this.createFlow(
      flowId,
      'stake', // Swap in context of staking
      this.name,
      steps,
      this.formatAmount(amountIn, tokenInInfo.decimals),
      tokenInInfo,
      this.formatAmount(quote.expectedOutput, tokenOutInfo.decimals),
      tokenOutInfo
    );
  }

  async buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    return this.buildSwapFlow(
      TOKENS.WETH.address,
      TOKENS.wstETH.address,
      amount,
      recipient,
      slippage
    );
  }

  async buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow> {
    return this.buildSwapFlow(
      TOKENS.wstETH.address,
      TOKENS.WETH.address,
      amount,
      recipient,
      slippage
    );
  }

  /**
   * Get pool reserves
   */
  async getPoolReserves(
    tokenA: Address,
    tokenB: Address,
    stable: boolean
  ): Promise<{ reserveA: bigint; reserveB: bigint }> {
    try {
      const factory = stable ? AERODROME_FACTORIES.stable : AERODROME_FACTORIES.volatile;

      // Get pool address
      const poolAddress = await this.client.readContract({
        address: BASE_MAINNET_CONTRACTS.aerodrome.router as Address,
        abi: AERODROME_ROUTER_ABI,
        functionName: 'poolFor',
        args: [tokenA, tokenB, stable, factory],
      });

      // Get reserves
      const reserves = await this.client.readContract({
        address: poolAddress as Address,
        abi: AERODROME_POOL_ABI,
        functionName: 'getReserves',
      });

      const [reserve0, reserve1] = reserves as [bigint, bigint, bigint];

      // Determine order
      const token0 = await this.client.readContract({
        address: poolAddress as Address,
        abi: AERODROME_POOL_ABI,
        functionName: 'token0',
      });

      if ((token0 as Address).toLowerCase() === tokenA.toLowerCase()) {
        return { reserveA: reserve0, reserveB: reserve1 };
      }
      return { reserveA: reserve1, reserveB: reserve0 };
    } catch (error) {
      console.error('Failed to get pool reserves:', error);
      return { reserveA: 0n, reserveB: 0n };
    }
  }

  // Not applicable for DEX
  async getPosition(_user: Address): Promise<StakingPosition | null> {
    return null;
  }

  async getAPY(): Promise<number> {
    return 0; // DEX doesn't have APY in this context
  }
}

// Export singleton
export const aerodromeAdapter = new AerodromeAdapter();
