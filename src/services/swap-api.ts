import type { Address } from 'viem';
import type { SwapQuote } from '@/types/wallet';
import { ACTIVE_CHAIN_ID, IS_TESTNET } from '@/lib/smart-wallet';
import { NATIVE_TOKEN_ADDRESS } from '@/lib/tokens';
import { fetchEthPrice } from './alchemy';
import { getTestnetSwapQuote } from './testnet-swap-api';

// ============================================
// 0x SWAP API CLIENT
// ============================================

const ZERO_X_API_URL = 'https://api.0x.org';
const ZERO_X_API_KEY = process.env.NEXT_PUBLIC_0X_API_KEY || '';

// Note: 0x API may not support Base Sepolia testnet
// In testnet mode, we return mock quotes for testing

interface ZeroXQuoteResponse {
  price: string;
  estimatedPriceImpact: string;
  buyAmount: string;
  sellAmount: string;
  estimatedGas: string;
  allowanceTarget: string;
  sources: Array<{ name: string; proportion: string }>;
  transaction: {
    to: string;
    data: string;
    value: string;
  };
}

// ============================================
// SWAP FUNCTIONS
// ============================================

/**
 * Get a swap quote
 */
export async function getSwapQuote(params: {
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
  takerAddress: Address;
  slippagePercentage?: number;
}): Promise<SwapQuote> {
  const { sellToken, buyToken, sellAmount, takerAddress, slippagePercentage = 0.5 } = params;

  // In testnet mode, use the mock router for real on-chain swaps
  if (IS_TESTNET) {
    return getTestnetSwapQuote(params);
  }

  // Check if 0x API is configured
  if (!ZERO_X_API_KEY) {
    throw new Error('0x API key not configured');
  }

  const queryParams = new URLSearchParams({
    chainId: ACTIVE_CHAIN_ID.toString(),
    sellToken: sellToken === NATIVE_TOKEN_ADDRESS ? 'ETH' : sellToken,
    buyToken: buyToken === NATIVE_TOKEN_ADDRESS ? 'ETH' : buyToken,
    sellAmount: sellAmount.toString(),
    takerAddress,
    slippagePercentage: (slippagePercentage / 100).toString(),
  });

  const response = await fetch(
    `${ZERO_X_API_URL}/swap/allowance-holder/quote?${queryParams}`,
    {
      headers: {
        '0x-api-key': ZERO_X_API_KEY,
        '0x-version': 'v2',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.reason || `Swap quote failed: ${response.status}`);
  }

  const data: ZeroXQuoteResponse = await response.json();
  const ethPrice = await fetchEthPrice();

  return {
    sellToken,
    buyToken,
    sellAmount: BigInt(data.sellAmount),
    buyAmount: BigInt(data.buyAmount),
    price: data.price,
    priceImpact: parseFloat(data.estimatedPriceImpact || '0'),
    gasEstimate: BigInt(data.estimatedGas || '200000'),
    gasEstimateUsd: (Number(data.estimatedGas || '200000') * 0.1e9 / 1e18) * ethPrice,
    transaction: {
      to: data.transaction.to as Address,
      data: data.transaction.data as `0x${string}`,
      value: BigInt(data.transaction.value || '0'),
    },
    allowanceTarget: data.allowanceTarget as Address,
    sources: data.sources,
  };
}

/**
 * Get a mock quote for testnet
 */
function getMockQuote(params: {
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
  takerAddress: Address;
}): SwapQuote {
  const { sellToken, buyToken, sellAmount, takerAddress } = params;

  // Simple mock: 1 ETH = 3000 USDC (approximately)
  let buyAmount: bigint;
  let price: string;

  if (sellToken === NATIVE_TOKEN_ADDRESS) {
    // Selling ETH for tokens (assume buying stablecoin)
    buyAmount = (sellAmount * 3000n) / BigInt(1e12); // Adjust for decimal difference (18 -> 6)
    price = '3000';
  } else {
    // Selling tokens for ETH
    buyAmount = (sellAmount * BigInt(1e12)) / 3000n;
    price = '0.000333';
  }

  return {
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    price,
    priceImpact: 0.1,
    gasEstimate: 200000n,
    gasEstimateUsd: 0.50,
    transaction: {
      to: takerAddress, // Mock - would be 0x router in production
      data: '0x' as `0x${string}`,
      value: sellToken === NATIVE_TOKEN_ADDRESS ? sellAmount : 0n,
    },
    allowanceTarget: '0x0000000000000000000000000000000000000000' as Address,
    sources: [{ name: 'Mock', proportion: '1' }],
  };
}

/**
 * Encode ERC20 approve function call
 */
export function encodeApproval(
  spender: Address,
  amount: bigint
): `0x${string}` {
  // ERC20 approve(address spender, uint256 amount)
  // Function selector: 0x095ea7b3
  const selector = '0x095ea7b3';
  const spenderPadded = spender.slice(2).toLowerCase().padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `${selector}${spenderPadded}${amountHex}` as `0x${string}`;
}

/**
 * Encode ERC20 transfer function call
 */
export function encodeTransfer(
  to: Address,
  amount: bigint
): `0x${string}` {
  // ERC20 transfer(address to, uint256 amount)
  // Function selector: 0xa9059cbb
  const selector = '0xa9059cbb';
  const toPadded = to.slice(2).toLowerCase().padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `${selector}${toPadded}${amountHex}` as `0x${string}`;
}
