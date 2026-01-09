/**
 * Activity Service
 * Fetches real transaction history from Alchemy API
 */

import type { Address } from 'viem';
import { getRpcUrl, isTestnet } from '@/contracts/addresses/network-config';
import { livePriceService } from '@/services/live-prices';

// Cached ETH price for USD value estimation
let cachedEthPrice = 2500; // Fallback value
let lastPriceFetch = 0;
const PRICE_CACHE_TTL = 60000; // 1 minute

/**
 * Refresh cached ETH price if stale
 */
async function refreshEthPriceIfNeeded(): Promise<void> {
  if (Date.now() - lastPriceFetch < PRICE_CACHE_TTL) {
    return;
  }
  try {
    const priceData = await livePriceService.getEthPrice();
    cachedEthPrice = priceData.priceUsd;
    lastPriceFetch = Date.now();
  } catch (error) {
    console.warn('[ActivityService] Failed to fetch ETH price, using cached value:', error);
  }
}

// Known protocol addresses for categorization (Base Mainnet)
const PROTOCOL_ADDRESSES: Record<string, { name: string; type: string }> = {
  // Aave V3
  '0xa238dd80c259a72e81d7e4664a9801593f98d1c5': { name: 'Aave V3', type: 'lending' },
  // Morpho
  '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb': { name: 'Morpho Blue', type: 'lending' },
  // Moonwell
  '0xfbb21d0380bee3312b33c4353c8936a0f13ef26c': { name: 'Moonwell', type: 'lending' },
  '0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22': { name: 'Moonwell', type: 'lending' }, // mUSDC
  // Compound
  '0xb125e6687d4313864e53df431d5425969c15eb2f': { name: 'Compound V3', type: 'lending' },
  // Lido / wstETH
  '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': { name: 'Lido', type: 'staking' },
  // Aerodrome Router
  '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43': { name: 'Aerodrome', type: 'swap' },
  // Uniswap Router
  '0x2626664c2603336e57b271c5c0b26f421741e481': { name: 'Uniswap', type: 'swap' },
};

// Token addresses for identifying transfers (Base)
const TOKEN_SYMBOLS: Record<string, string> = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  '0x4200000000000000000000000000000000000006': 'WETH',
  '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': 'wstETH',
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
  '0x04c0599ae5a44757c0af6f9ec3b93da8976c150a': 'weETH',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'USDbC',
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
  '0xdbfefd2e8460a6ee4955a68582f85708baea60a3': 'superOETHb',
};

export interface Activity {
  id: string;
  type: 'stake' | 'supply' | 'borrow' | 'withdraw' | 'repay' | 'swap' | 'transfer' | 'unknown';
  action: string;
  amount: string;
  valueUsd: number;
  protocol: string;
  tokenSymbol: string;
  received: string | null;
  time: string;
  timestamp: string;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber: number;
}

interface AlchemyTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string;
  category: string;
  rawContract: {
    address: string;
    decimal: string;
    value: string;
  };
  metadata?: {
    blockTimestamp: string;
  };
}

interface AlchemyResponse {
  result: {
    transfers: AlchemyTransfer[];
    pageKey?: string;
  };
}

/**
 * Fetch transaction history from Alchemy
 */
export async function fetchTransactionHistory(
  address: Address,
  options?: { limit?: number; pageKey?: string }
): Promise<{ transfers: AlchemyTransfer[]; pageKey?: string }> {
  const rpcUrl = getRpcUrl();
  const limit = options?.limit || 100;

  // Build params for both incoming and outgoing transfers
  const baseParams = {
    category: ['external', 'internal', 'erc20'],
    withMetadata: true,
    excludeZeroValue: true,
    maxCount: `0x${Math.floor(limit / 2).toString(16)}`,
  };

  try {
    // Fetch both outgoing and incoming transfers in parallel
    const [outgoingResponse, incomingResponse] = await Promise.all([
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{ ...baseParams, fromAddress: address }],
          id: 1,
        }),
      }),
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{ ...baseParams, toAddress: address }],
          id: 2,
        }),
      }),
    ]);

    if (!outgoingResponse.ok || !incomingResponse.ok) {
      throw new Error('Alchemy API error');
    }

    const outgoingData: AlchemyResponse = await outgoingResponse.json();
    const incomingData: AlchemyResponse = await incomingResponse.json();

    // Merge and dedupe transfers
    const allTransfers = [
      ...(outgoingData.result?.transfers || []),
      ...(incomingData.result?.transfers || []),
    ];

    // Dedupe by hash
    const seen = new Set<string>();
    const uniqueTransfers = allTransfers.filter((t) => {
      const key = `${t.hash}-${t.from}-${t.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by block number descending
    uniqueTransfers.sort((a, b) => {
      const blockA = parseInt(a.blockNum, 16);
      const blockB = parseInt(b.blockNum, 16);
      return blockB - blockA;
    });

    return {
      transfers: uniqueTransfers.slice(0, limit),
      pageKey: outgoingData.result?.pageKey || incomingData.result?.pageKey,
    };
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    return { transfers: [] };
  }
}

/**
 * Parse raw transfer into Activity
 */
function parseTransfer(transfer: AlchemyTransfer, userAddress: string): Activity {
  const isOutgoing = transfer.from.toLowerCase() === userAddress.toLowerCase();
  const counterparty = isOutgoing ? transfer.to : transfer.from;
  const protocol = PROTOCOL_ADDRESSES[counterparty.toLowerCase()];

  // Determine activity type
  let type: Activity['type'] = 'transfer';
  let action = isOutgoing ? 'Send' : 'Receive';

  if (protocol) {
    if (protocol.type === 'lending') {
      if (isOutgoing) {
        type = 'supply';
        action = `Supply to ${protocol.name}`;
      } else {
        type = 'withdraw';
        action = `Withdraw from ${protocol.name}`;
      }
    } else if (protocol.type === 'staking') {
      if (isOutgoing) {
        type = 'stake';
        action = `Stake with ${protocol.name}`;
      } else {
        type = 'withdraw';
        action = `Unstake from ${protocol.name}`;
      }
    } else if (protocol.type === 'swap') {
      type = 'swap';
      action = `Swap on ${protocol.name}`;
    }
  }

  // Get token symbol
  const tokenAddress = transfer.rawContract?.address?.toLowerCase();
  const tokenSymbol = tokenAddress
    ? TOKEN_SYMBOLS[tokenAddress] || transfer.asset || 'ETH'
    : transfer.asset || 'ETH';

  // Format amount
  const rawValue = transfer.rawContract?.value;
  const decimals = parseInt(transfer.rawContract?.decimal || '18');
  let amount = '0';
  if (rawValue) {
    const value = BigInt(rawValue);
    const numValue = Number(value) / Math.pow(10, decimals);
    amount = numValue.toFixed(numValue < 0.01 ? 6 : 4);
  } else if (transfer.value) {
    amount = transfer.value.toFixed(4);
  }

  // Estimate USD value using cached ETH price
  const numAmount = parseFloat(amount);
  const isStablecoin = ['USDC', 'USDT', 'DAI', 'USDbC'].includes(tokenSymbol);
  const valueUsd = isStablecoin ? numAmount : numAmount * cachedEthPrice;

  // Get timestamp
  const blockNum = parseInt(transfer.blockNum, 16);
  const timestamp = transfer.metadata?.blockTimestamp || new Date().toISOString();

  return {
    id: `${transfer.hash}-${transfer.from.slice(0, 8)}-${transfer.to.slice(0, 8)}`,
    type,
    action,
    amount: `${parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tokenSymbol}`,
    valueUsd,
    protocol: protocol?.name || 'Wallet',
    tokenSymbol,
    received: null,
    time: getRelativeTime(timestamp),
    timestamp,
    txHash: transfer.hash,
    status: 'confirmed',
    blockNumber: blockNum,
  };
}

/**
 * Fetch and parse user activity
 */
export async function fetchUserActivity(
  address: Address,
  options?: { limit?: number }
): Promise<Activity[]> {
  // Refresh ETH price for accurate USD estimates
  await refreshEthPriceIfNeeded();

  const { transfers } = await fetchTransactionHistory(address, options);

  // Parse transfers into activities
  const activities = transfers
    .map((t) => parseTransfer(t, address))
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return activities;
}

/**
 * Get relative time string
 */
export function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Filter activities by type
 */
export function filterActivities(activities: Activity[], filter: string): Activity[] {
  if (filter === 'all') return activities;
  return activities.filter((a) => a.type === filter);
}

/**
 * Search activities
 */
export function searchActivities(activities: Activity[], query: string): Activity[] {
  if (!query.trim()) return activities;
  const q = query.toLowerCase();
  return activities.filter(
    (a) =>
      a.action.toLowerCase().includes(q) ||
      a.protocol.toLowerCase().includes(q) ||
      a.txHash.toLowerCase().includes(q) ||
      a.tokenSymbol.toLowerCase().includes(q)
  );
}
