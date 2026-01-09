import { useState, useCallback } from 'react';
import type { Address } from 'viem';
import { useWalletClient, usePublicClient } from 'wagmi';
import type { SwapQuote, UseSwapReturn } from '@/types/wallet';
import { getSwapQuote, encodeApproval } from '@/services/swap-api';
import { NATIVE_TOKEN_ADDRESS } from '@/lib/tokens';
import { IS_TESTNET } from '@/lib/smart-wallet';
import { useSmartWallet } from './use-smart-wallet';
import { erc20Abi } from 'viem';

// ============================================
// SWAP HOOK
// ============================================

/**
 * Hook to handle token swaps within the smart wallet
 * Uses 0x API for quotes and executes through smart wallet batched transactions
 *
 * On testnet, falls back to direct EOA transactions if smart wallet fails
 */
export function useSwap(): UseSwapReturn {
  const { smartWallet, sendBatchedTransactions } = useSmartWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Get a swap quote from 0x API
   */
  const getQuote = useCallback(async (params: {
    sellToken: Address;
    buyToken: Address;
    sellAmount: bigint;
  }): Promise<SwapQuote> => {
    if (!smartWallet?.address) {
      throw new Error('Smart wallet not initialized');
    }

    if (params.sellAmount <= 0n) {
      throw new Error('Invalid sell amount');
    }

    if (params.sellToken === params.buyToken) {
      throw new Error('Cannot swap token for itself');
    }

    setIsLoadingQuote(true);
    setError(null);

    try {
      const quoteResult = await getSwapQuote({
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        takerAddress: smartWallet.address,
      });

      setQuote(quoteResult);
      return quoteResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get quote');
      setError(error);
      throw error;
    } finally {
      setIsLoadingQuote(false);
    }
  }, [smartWallet?.address]);

  /**
   * Execute swap via direct EOA transaction (fallback for testnet)
   * This bypasses the smart wallet and uses the connected wallet directly
   */
  const executeSwapViaEOA = useCallback(async (swapQuote: SwapQuote): Promise<`0x${string}`> => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet client not available');
    }

    const userAddress = walletClient.account?.address;
    if (!userAddress) {
      throw new Error('No connected account');
    }

    // If selling ERC20 token, check and set approval
    if (swapQuote.sellToken !== NATIVE_TOKEN_ADDRESS) {
      // Check current allowance
      const allowance = await publicClient.readContract({
        address: swapQuote.sellToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, swapQuote.allowanceTarget],
      });

      // If allowance is insufficient, approve
      if (allowance < swapQuote.sellAmount) {
        const approvalData = encodeApproval(
          swapQuote.allowanceTarget,
          BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') // Max approval
        );

        const approvalHash = await walletClient.sendTransaction({
          to: swapQuote.sellToken,
          data: approvalData,
        });

        // Wait for approval to be mined
        await publicClient.waitForTransactionReceipt({
          hash: approvalHash,
          confirmations: 1,
        });
      }
    }

    // Execute the swap transaction
    const txHash = await walletClient.sendTransaction({
      to: swapQuote.transaction.to,
      value: swapQuote.transaction.value,
      data: swapQuote.transaction.data,
    });

    return txHash;
  }, [walletClient, publicClient]);

  /**
   * Execute a swap using the provided quote
   * Handles approval + swap in a single batched transaction
   * Falls back to EOA on testnet if smart wallet fails
   */
  const executeSwap = useCallback(async (swapQuote: SwapQuote): Promise<`0x${string}`> => {
    if (!smartWallet?.address) {
      throw new Error('Smart wallet not initialized');
    }

    setIsExecuting(true);
    setError(null);

    try {
      const transactions: Array<{
        to: Address;
        value?: bigint;
        data?: `0x${string}`;
      }> = [];

      // If selling an ERC20 token (not native ETH), we need to approve first
      if (swapQuote.sellToken !== NATIVE_TOKEN_ADDRESS) {
        // Check if approval is needed
        // For simplicity, we always include approval with max amount
        // In production, check current allowance first
        const approvalData = encodeApproval(
          swapQuote.allowanceTarget,
          swapQuote.sellAmount
        );

        transactions.push({
          to: swapQuote.sellToken,
          data: approvalData,
        });
      }

      // Add the swap transaction
      transactions.push({
        to: swapQuote.transaction.to,
        value: swapQuote.transaction.value,
        data: swapQuote.transaction.data,
      });

      // Try smart wallet batched transaction first
      try {
        const txHash = await sendBatchedTransactions(transactions);
        setQuote(null);
        return txHash;
      } catch (smartWalletError) {
        // On testnet, if smart wallet fails with 400 error, try EOA fallback
        if (IS_TESTNET && smartWalletError instanceof Error &&
            (smartWalletError.message.includes('400') || smartWalletError.message.includes('Status: 400'))) {
          console.log('[useSwap] Smart wallet failed on testnet, trying EOA fallback');

          try {
            const txHash = await executeSwapViaEOA(swapQuote);
            setQuote(null);
            return txHash;
          } catch (eoaError) {
            console.error('[useSwap] EOA fallback also failed:', eoaError);
            throw new Error(
              'Swap failed on testnet. Make sure you have enough ETH for gas and the token balance is correct.'
            );
          }
        }

        // Re-throw non-testnet errors or non-400 errors
        throw smartWalletError;
      }
    } catch (err) {
      let error: Error;

      if (err instanceof Error) {
        // Check for ZeroDev 400 errors (should be handled above for testnet)
        if (err.message.includes('400') || err.message.includes('Status: 400')) {
          if (IS_TESTNET) {
            error = new Error(
              'Swap failed on testnet. This may be a temporary issue. Please try again or use mainnet for full swap functionality.'
            );
          } else {
            error = new Error(
              'Swap transaction was rejected. This may be due to price changes. ' +
              'Please try again or contact support if the issue persists.'
            );
          }
        } else {
          error = err;
        }
      } else {
        error = new Error('Swap failed. Please try again.');
      }

      setError(error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [smartWallet?.address, sendBatchedTransactions, executeSwapViaEOA]);

  return {
    quote,
    isLoadingQuote,
    isExecuting,
    error,
    getQuote,
    executeSwap,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format price for display
 */
export function formatSwapPrice(quote: SwapQuote, sellSymbol: string, buySymbol: string): string {
  const price = parseFloat(quote.price);
  if (price >= 1000) {
    return `1 ${sellSymbol} = ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${buySymbol}`;
  } else if (price >= 1) {
    return `1 ${sellSymbol} = ${price.toFixed(4)} ${buySymbol}`;
  } else {
    return `1 ${sellSymbol} = ${price.toFixed(8)} ${buySymbol}`;
  }
}

/**
 * Format price impact for display
 */
export function formatPriceImpact(priceImpact: number): string {
  if (priceImpact < 0.01) {
    return '<0.01%';
  }
  return `${priceImpact.toFixed(2)}%`;
}

/**
 * Get price impact severity
 */
export function getPriceImpactSeverity(priceImpact: number): 'low' | 'medium' | 'high' {
  if (priceImpact < 1) return 'low';
  if (priceImpact < 3) return 'medium';
  return 'high';
}
