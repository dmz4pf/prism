/**
 * Testnet Swap API Service
 *
 * Uses the deployed MockAerodromeRouter on Base Sepolia for testing swap functionality.
 * This enables real on-chain swap testing without requiring 0x API or real liquidity.
 */

import { createPublicClient, http, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { Address } from 'viem';
import type { SwapQuote } from '@/types/wallet';
import { BASE_SEPOLIA_CONTRACTS } from '@/contracts/addresses/base-sepolia';
import { AERODROME_ROUTER_ABI } from '@/contracts/abis/aerodrome';
import { NATIVE_TOKEN_ADDRESS } from '@/lib/tokens';

// ============================================
// CONFIGURATION
// ============================================

const MOCK_ROUTER_ADDRESS = BASE_SEPOLIA_CONTRACTS.aerodrome.router;
const WETH_ADDRESS = BASE_SEPOLIA_CONTRACTS.WETH;

// Default factory address (mock router doesn't strictly need this but ABI requires it)
const DEFAULT_FACTORY = '0x0000000000000000000000000000000000000000' as const;

// Create public client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

// ============================================
// TYPES
// ============================================

interface Route {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build a route for the mock router
 */
function buildRoute(fromToken: Address, toToken: Address, isStable: boolean = false): Route {
  return {
    from: fromToken,
    to: toToken,
    stable: isStable,
    factory: DEFAULT_FACTORY,
  };
}

/**
 * Determine if a token pair should use stable pool routing
 */
function isStablePair(tokenA: Address, tokenB: Address): boolean {
  const stablecoins = [
    BASE_SEPOLIA_CONTRACTS.USDC.toLowerCase(),
    BASE_SEPOLIA_CONTRACTS.USDT.toLowerCase(),
    BASE_SEPOLIA_CONTRACTS.DAI.toLowerCase(),
  ];

  return stablecoins.includes(tokenA.toLowerCase()) &&
         stablecoins.includes(tokenB.toLowerCase());
}

/**
 * Get the actual token address (convert native ETH to WETH)
 */
function getActualTokenAddress(token: Address): Address {
  if (token === NATIVE_TOKEN_ADDRESS || token.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return WETH_ADDRESS;
  }
  return token;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get a swap quote from the mock router on testnet
 */
export async function getTestnetSwapQuote(params: {
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
  takerAddress: Address;
  slippagePercentage?: number;
}): Promise<SwapQuote> {
  const { sellToken, buyToken, sellAmount, takerAddress, slippagePercentage = 0.5 } = params;

  // Convert native ETH addresses to WETH for routing
  const actualSellToken = getActualTokenAddress(sellToken);
  const actualBuyToken = getActualTokenAddress(buyToken);

  // Build the route
  const isStable = isStablePair(actualSellToken, actualBuyToken);
  const route = buildRoute(actualSellToken, actualBuyToken, isStable);

  try {
    // Call getAmountsOut on the mock router
    const amounts = await publicClient.readContract({
      address: MOCK_ROUTER_ADDRESS,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [sellAmount, [route]],
    }) as bigint[];

    const buyAmount = amounts[amounts.length - 1];

    // Calculate slippage-adjusted minimum output
    const slippageBps = BigInt(Math.floor(slippagePercentage * 100));
    const minOutput = (buyAmount * (10000n - slippageBps)) / 10000n;

    // Calculate price
    const price = sellAmount > 0n
      ? (Number(buyAmount) / Number(sellAmount)).toString()
      : '0';

    // Determine which swap function to use and build transaction data
    let transactionData: `0x${string}`;
    let transactionValue: bigint = 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

    if (sellToken === NATIVE_TOKEN_ADDRESS) {
      // Selling ETH -> Use swapExactETHForTokens
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [minOutput, [route], takerAddress, deadline],
      });
      transactionValue = sellAmount;
    } else if (buyToken === NATIVE_TOKEN_ADDRESS) {
      // Buying ETH -> Use swapExactTokensForETH
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [sellAmount, minOutput, [route], takerAddress, deadline],
      });
    } else {
      // Token to Token -> Use swapExactTokensForTokens
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [sellAmount, minOutput, [route], takerAddress, deadline],
      });
    }

    return {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      price,
      priceImpact: 0.1, // Mock router has deterministic 0.1% impact
      gasEstimate: 150000n,
      gasEstimateUsd: 0.10, // Very low on testnet
      transaction: {
        to: MOCK_ROUTER_ADDRESS,
        data: transactionData,
        value: transactionValue,
      },
      allowanceTarget: MOCK_ROUTER_ADDRESS, // Approve to mock router
      sources: [{ name: 'MockAerodrome', proportion: '1' }],
    };
  } catch (error) {
    console.error('Testnet swap quote error:', error);

    // Return a fallback mock quote if the contract call fails
    // This handles cases where the token pair might not have an exchange rate set
    const fallbackBuyAmount = sellAmount; // 1:1 fallback
    const minOutput = (fallbackBuyAmount * 9950n) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    const route = buildRoute(actualSellToken, actualBuyToken, false);

    let transactionData: `0x${string}`;
    let transactionValue: bigint = 0n;

    if (sellToken === NATIVE_TOKEN_ADDRESS) {
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [minOutput, [route], takerAddress, deadline],
      });
      transactionValue = sellAmount;
    } else if (buyToken === NATIVE_TOKEN_ADDRESS) {
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [sellAmount, minOutput, [route], takerAddress, deadline],
      });
    } else {
      transactionData = encodeFunctionData({
        abi: AERODROME_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [sellAmount, minOutput, [route], takerAddress, deadline],
      });
    }

    return {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount: fallbackBuyAmount,
      price: '1',
      priceImpact: 0.5,
      gasEstimate: 150000n,
      gasEstimateUsd: 0.10,
      transaction: {
        to: MOCK_ROUTER_ADDRESS,
        data: transactionData,
        value: transactionValue,
      },
      allowanceTarget: MOCK_ROUTER_ADDRESS,
      sources: [{ name: 'MockAerodrome (Fallback)', proportion: '1' }],
    };
  }
}

/**
 * Get testnet token addresses for common symbols
 */
export function getTestnetTokenAddress(symbol: string): Address | null {
  const tokenMap: Record<string, Address> = {
    ETH: NATIVE_TOKEN_ADDRESS,
    WETH: BASE_SEPOLIA_CONTRACTS.WETH,
    USDC: BASE_SEPOLIA_CONTRACTS.USDC,
    USDT: BASE_SEPOLIA_CONTRACTS.USDT,
    DAI: BASE_SEPOLIA_CONTRACTS.DAI,
    wstETH: BASE_SEPOLIA_CONTRACTS.wstETH,
    cbETH: BASE_SEPOLIA_CONTRACTS.cbETH,
    rETH: BASE_SEPOLIA_CONTRACTS.rETH,
    weETH: BASE_SEPOLIA_CONTRACTS.weETH,
    superOETHb: BASE_SEPOLIA_CONTRACTS.superOETHb,
  };

  return tokenMap[symbol] || null;
}
