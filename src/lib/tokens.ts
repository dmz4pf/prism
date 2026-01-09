import type { Address } from 'viem';

// ============================================
// BASE CHAIN TOKEN ADDRESSES
// ============================================

export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;

// Base Mainnet Tokens
export const BASE_TOKENS = {
  ETH: NATIVE_TOKEN_ADDRESS,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as Address,
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' as Address,
} as const;

// Base Sepolia Tokens (Testnet)
export const BASE_SEPOLIA_TOKENS = {
  ETH: NATIVE_TOKEN_ADDRESS,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
} as const;

// ============================================
// TOKEN METADATA
// ============================================

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
}

export const TOKEN_LIST: TokenInfo[] = [
  {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    address: BASE_TOKENS.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    address: BASE_TOKENS.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  {
    address: BASE_TOKENS.USDbC,
    symbol: 'USDbC',
    name: 'USD Base Coin',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  {
    address: BASE_TOKENS.DAI,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
  },
  {
    address: BASE_TOKENS.cbETH,
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
];

/**
 * Get token info by address
 */
export function getTokenInfo(address: Address): TokenInfo | undefined {
  return TOKEN_LIST.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 6
): string {
  if (amount === 0n) return '0';

  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toLocaleString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, maxDecimals).replace(/0+$/, '');

  if (trimmedFractional) {
    return `${integerPart.toLocaleString()}.${trimmedFractional}`;
  }
  return integerPart.toLocaleString();
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount || amount === '0') return 0n;

  const [integer = '0', fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const cleanInteger = integer.replace(/,/g, '');

  return BigInt(cleanInteger + paddedFraction);
}

/**
 * Format USD value
 */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
