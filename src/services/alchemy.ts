import type { Address } from 'viem';
import type { TokenBalance } from '@/types/wallet';
import { NATIVE_TOKEN_ADDRESS, formatTokenAmount, getTokenInfo } from '@/lib/tokens';
import { IS_TESTNET } from '@/lib/smart-wallet';

// ============================================
// ALCHEMY API CLIENT
// ============================================

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_URL = IS_TESTNET
  ? `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// ============================================
// TOKEN BALANCE FETCHING
// ============================================

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

/**
 * Fetch native ETH balance
 */
async function fetchEthBalance(address: Address): Promise<bigint> {
  const response = await fetch(ALCHEMY_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });

  const data = await response.json();
  return BigInt(data.result || '0');
}

/**
 * Fetch all ERC20 token balances
 */
async function fetchERC20Balances(address: Address): Promise<AlchemyTokenBalance[]> {
  const response = await fetch(ALCHEMY_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenBalances',
      params: [address, 'erc20'],
    }),
  });

  const data = await response.json();
  return data.result?.tokenBalances || [];
}

/**
 * Fetch token metadata
 */
async function fetchTokenMetadata(contractAddress: string): Promise<AlchemyTokenMetadata> {
  const response = await fetch(ALCHEMY_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenMetadata',
      params: [contractAddress],
    }),
  });

  const data = await response.json();
  return data.result || {};
}

/**
 * Fetch ETH price using LivePriceService (Chainlink + CoinGecko fallback)
 *
 * This function now uses the unified LivePriceService which:
 * 1. Tries Chainlink oracle first (most accurate)
 * 2. Falls back to CoinGecko API
 * 3. Uses cached values if both fail
 */
export async function fetchEthPrice(): Promise<number> {
  try {
    const { livePriceService } = await import('./live-prices');
    const price = await livePriceService.getEthPrice();
    return price.priceUsd;
  } catch (error) {
    console.warn('[alchemy] LivePriceService failed, using direct CoinGecko:', error);

    // Direct fallback to CoinGecko if LivePriceService fails
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      const data = await response.json();
      return data.ethereum?.usd || 2500; // Conservative fallback
    } catch {
      return 2500; // Conservative fallback if everything fails
    }
  }
}

/**
 * Fetch all token balances for a wallet
 */
export async function fetchAllTokenBalances(
  walletAddress: Address
): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];

  // Check if Alchemy is configured
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not configured');
    return balances;
  }

  try {
    // 1. Fetch ETH price first (needed for calculations)
    const ethPrice = await fetchEthPrice();

    // 2. Fetch native ETH balance
    const ethBalanceRaw = await fetchEthBalance(walletAddress);
    const ethBalanceFormatted = formatTokenAmount(ethBalanceRaw, 18);
    const ethBalanceNum = Number(ethBalanceRaw) / 1e18;
    const ethBalanceUsd = ethBalanceNum * ethPrice;

    balances.push({
      address: null, // Native ETH has no contract address
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balanceRaw: ethBalanceRaw,
      balance: ethBalanceFormatted,
      balanceUsd: ethBalanceUsd,
      priceUsd: ethPrice,
      logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      isSpam: false,
    });

    // 3. Fetch all ERC20 token balances
    const tokenBalances = await fetchERC20Balances(walletAddress);

    // 4. Process each token with non-zero balance
    for (const token of tokenBalances) {
      const balanceRaw = BigInt(token.tokenBalance || '0');

      // Skip zero balances
      if (balanceRaw === 0n) continue;

      try {
        // Check if we have local metadata first
        const localInfo = getTokenInfo(token.contractAddress as Address);

        let metadata: AlchemyTokenMetadata;
        if (localInfo) {
          metadata = {
            name: localInfo.name,
            symbol: localInfo.symbol,
            decimals: localInfo.decimals,
            logo: localInfo.logoUrl,
          };
        } else {
          // Fetch from Alchemy
          metadata = await fetchTokenMetadata(token.contractAddress);
        }

        // Skip tokens without proper metadata
        if (!metadata.symbol || !metadata.decimals) continue;

        const balanceFormatted = formatTokenAmount(balanceRaw, metadata.decimals);
        const balanceNum = Number(balanceRaw) / Math.pow(10, metadata.decimals);

        // For non-ETH tokens, estimate price (simplified)
        // In production, use a price API
        let priceUsd = 0;
        if (metadata.symbol === 'USDC' || metadata.symbol === 'USDbC' || metadata.symbol === 'DAI') {
          priceUsd = 1;
        } else if (metadata.symbol === 'WETH' || metadata.symbol === 'cbETH') {
          priceUsd = ethPrice;
        }

        const balanceUsd = balanceNum * priceUsd;

        // Filter out dust (less than $0.01) for non-stablecoins
        if (balanceUsd < 0.01 && priceUsd !== 1) continue;

        balances.push({
          address: token.contractAddress as Address,
          symbol: metadata.symbol,
          name: metadata.name || metadata.symbol,
          decimals: metadata.decimals,
          balanceRaw,
          balance: balanceFormatted,
          balanceUsd,
          priceUsd,
          logoUrl: localInfo?.logoUrl || metadata.logo || undefined,
          isSpam: false,
        });
      } catch (error) {
        console.warn(`Failed to process token ${token.contractAddress}:`, error);
      }
    }

    // Sort by USD value (highest first), then by symbol
    balances.sort((a, b) => {
      if (b.balanceUsd !== a.balanceUsd) {
        return b.balanceUsd - a.balanceUsd;
      }
      return a.symbol.localeCompare(b.symbol);
    });

    return balances;
  } catch (error) {
    console.error('Failed to fetch token balances:', error);
    return balances;
  }
}

/**
 * Check if an address has any code (is deployed)
 */
export async function checkIsDeployed(address: Address): Promise<boolean> {
  if (!ALCHEMY_API_KEY) return false;

  try {
    const response = await fetch(ALCHEMY_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [address, 'latest'],
      }),
    });

    const data = await response.json();
    const code = data.result;
    return code && code !== '0x' && code !== '0x0';
  } catch {
    return false;
  }
}
