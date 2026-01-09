/**
 * Base Protocol Adapter
 * Abstract class that all protocol adapters extend
 */

import { createPublicClient, http, type Address, type Hex } from 'viem';
import { base } from 'viem/chains';
import type {
  ProtocolAdapter,
  StakeQuote,
  TransactionFlow,
  TransactionStep,
  StakingPosition,
  StakingType,
  TokenInfo,
} from '@/types/staking';

export abstract class BaseProtocolAdapter implements ProtocolAdapter {
  abstract name: string;
  abstract type: StakingType;

  protected client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  // Abstract methods that each adapter must implement
  abstract getStakeQuote(amount: bigint, slippage: number): Promise<StakeQuote>;
  abstract getUnstakeQuote(amount: bigint, slippage: number): Promise<StakeQuote>;
  abstract buildStakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow>;
  abstract buildUnstakeFlow(
    amount: bigint,
    recipient: Address,
    slippage: number
  ): Promise<TransactionFlow>;
  abstract getPosition(user: Address): Promise<StakingPosition | null>;
  abstract getAPY(): Promise<number>;

  /**
   * Create a transaction step
   */
  protected createStep(
    id: string,
    name: string,
    description: string
  ): TransactionStep {
    return {
      id,
      name,
      description,
      status: 'pending',
    };
  }

  /**
   * Create an approval step
   */
  protected createApprovalStep(
    token: TokenInfo,
    spender: string
  ): TransactionStep {
    return this.createStep(
      'approve',
      `Approve ${token.symbol}`,
      `Allow the protocol to spend your ${token.symbol}`
    );
  }

  /**
   * Create a transaction flow
   */
  protected createFlow(
    id: string,
    type: TransactionFlow['type'],
    protocol: string,
    steps: TransactionStep[],
    inputAmount: string,
    inputToken: TokenInfo,
    expectedOutput?: string,
    outputToken?: TokenInfo
  ): TransactionFlow {
    return {
      id,
      type,
      protocol,
      steps,
      currentStep: 0,
      status: 'idle',
      inputAmount,
      inputToken,
      expectedOutput,
      outputToken,
    };
  }

  /**
   * Calculate minimum output with slippage
   */
  protected calculateMinOutput(amount: bigint, slippage: number): bigint {
    const slippageBps = BigInt(Math.floor(slippage * 10000));
    return (amount * (10000n - slippageBps)) / 10000n;
  }

  /**
   * Store entry data for position tracking
   * Saves the initial stake details to localStorage for earnings calculation
   */
  protected storeEntryData(
    user: Address,
    protocol: string,
    amount: string,
    price: number
  ): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `position_entry_${user}_${protocol}`;
      const data = {
        amount,
        price,
        date: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store entry data:', error);
    }
  }

  /**
   * Get entry data for earnings calculation
   * Retrieves the initial stake details from localStorage
   */
  protected getEntryData(
    user: Address,
    protocol: string
  ): { amount: string; price: number; date: string } | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = `position_entry_${user}_${protocol}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to get entry data:', error);
      return null;
    }
  }

  /**
   * Calculate earnings based on entry vs current price
   * Returns the profit/loss since the initial stake
   */
  protected calculateEarnings(
    balance: string,
    currentPrice: number,
    entryPrice: number
  ): { earnedTotal: string; earnedTotalUsd: number } {
    const balanceNum = parseFloat(balance);
    const priceDiff = currentPrice - entryPrice;
    const earnedUsd = balanceNum * priceDiff;

    // Only show positive earnings (no negative for now)
    const earnedTotal = earnedUsd > 0 ? (earnedUsd / currentPrice).toFixed(6) : '0';

    return {
      earnedTotal,
      earnedTotalUsd: Math.max(0, earnedUsd),
    };
  }

  /**
   * Format amount for display
   */
  protected formatAmount(amount: bigint, decimals: number): string {
    const divisor = 10n ** BigInt(decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    return `${integerPart}.${fractionalStr.slice(0, 6)}`;
  }

  /**
   * Parse amount from string
   */
  protected parseAmount(amount: string, decimals: number): bigint {
    const [integer, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
  }

  /**
   * Generate unique flow ID
   */
  protected generateFlowId(): string {
    return `flow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
