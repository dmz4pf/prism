import type { Address } from 'viem';

// ============================================
// CHAIN IDS
// ============================================

export const CHAIN_IDS = {
  ETHEREUM: 1,
  BASE: 8453,
  BASE_SEPOLIA: 84532,
  ARBITRUM: 42161,
  OPTIMISM: 10,
} as const;

// Primary chain - respects NEXT_PUBLIC_TESTNET env variable
// Base Sepolia (84532) for testing, Base mainnet (8453) for production
const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
export const PRIMARY_CHAIN_ID = IS_TESTNET ? CHAIN_IDS.BASE_SEPOLIA : CHAIN_IDS.BASE;

// ============================================
// AAVE V3 CONTRACTS
// ============================================

export const AAVE_POOL_ADDRESS: Record<number, Address> = {
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Base (PRIMARY)
  1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Ethereum
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Optimism
};

export const AAVE_WETH_GATEWAY: Record<number, Address> = {
  8453: '0x8be473dCfA93132658821E67CbEB684ec8Ea2E74', // Base (PRIMARY)
  1: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
  42161: '0xB5Ee21786D28c5Ba61661550879475976B707099',
  10: '0x76D3030728e52DEB8848d5613aBaDE88441cbc59',
};

// Aave UI Pool Data Provider - for reading reserve/user data
export const AAVE_UI_POOL_DATA_PROVIDER: Record<number, Address> = {
  8453: '0x174446a6741300cD2E7C1b1A636Fee99c8F83502', // Base
  1: '0x91c0eA31b49B69Ea18607702c61C98c97c8a5Ea8', // Ethereum
  42161: '0x145dE30c929a065582da84Cf96F88460dB9745A7', // Arbitrum
  10: '0xbd83DdBE37fc91923d59C8c1E0bDe0CccCa332d5', // Optimism
};

// Aave aToken addresses on Base
export const AAVE_ATOKENS_BASE: Record<string, Address> = {
  aWETH: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7' as Address,
  aUSDbC: '0x0a1d576f3eFeF75b330424287a95A366e8281D54' as Address,
  aDAI: '0x0000000000000000000000000000000000000000' as Address, // TBD
  aUSDC: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as Address,
  acbETH: '0xcf3D55c10DB69f28fD1A75Bd73f3D8A2d9c595ad' as Address,
};

// Base-specific tokens
export const BASE_TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' as Address,
};

// Lido contracts (Ethereum mainnet only)
export const LIDO_CONTRACTS = {
  1: {
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as Address,
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as Address,
    withdrawalQueue: '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1' as Address,
  },
};

// Ethena contracts (Ethereum mainnet only)
export const ETHENA_CONTRACTS = {
  1: {
    USDe: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3' as Address,
    sUSDe: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497' as Address,
  },
};

// Token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
  ETH: 18,
  stETH: 18,
  wstETH: 18,
  USDe: 18,
  sUSDe: 18,
  cbETH: 18,
};

// Get token decimals with fallback
export function getTokenDecimals(token: string): number {
  return TOKEN_DECIMALS[token.toUpperCase()] ?? 18;
}

// ============================================
// ERC-4337 ACCOUNT ABSTRACTION (ZERODEV)
// ============================================

// EntryPoint v0.7 - Standard ERC-4337 contract (same on all chains)
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address;

// ZeroDev Kernel Factory - For creating Kernel smart accounts
export const KERNEL_FACTORY_ADDRESS: Record<number, Address> = {
  8453: '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as Address, // Base Mainnet
  84532: '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as Address, // Base Sepolia
  1: '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as Address, // Ethereum
};

// ZeroDev configuration - Get from dashboard.zerodev.app
export const ZERODEV_CONFIG = {
  // These are placeholder values - replace with actual project values from ZeroDev dashboard
  BASE: {
    bundlerUrl: 'https://rpc.zerodev.app/api/v2/bundler/8453',
    paymasterUrl: 'https://rpc.zerodev.app/api/v2/paymaster/8453',
  },
  BASE_SEPOLIA: {
    bundlerUrl: 'https://rpc.zerodev.app/api/v2/bundler/84532',
    paymasterUrl: 'https://rpc.zerodev.app/api/v2/paymaster/84532',
  },
};

// ============================================
// PRISM SMART WALLET CONTRACTS (DEPRECATED - Using ZeroDev Kernel)
// ============================================

// Note: We now use ZeroDev Kernel accounts instead of custom factory
// Keeping these for backward compatibility during migration
export const PRISM_FACTORY_ADDRESS: Record<number, Address> = {
  8453: '0x0000000000000000000000000000000000000000' as Address, // Deprecated
  84532: '0x0000000000000000000000000000000000000000' as Address, // Deprecated
};

// Prism Router - Routes actions to adapters and vaults
export const PRISM_ROUTER_ADDRESS: Record<number, Address> = {
  8453: '0x0000000000000000000000000000000000000000' as Address, // Base Mainnet - TBD
  84532: '0x0000000000000000000000000000000000000000' as Address, // Base Sepolia - TBD
};

// ============================================
// STRATEGY VAULTS
// ============================================

export const STRATEGY_VAULTS: Record<number, Record<string, Address>> = {
  8453: {
    ETH_MAXIMIZER: '0x0000000000000000000000000000000000000000' as Address, // TBD
    STABLE_YIELD_PLUS: '0x0000000000000000000000000000000000000000' as Address, // TBD
    ETHENA_DELTA_NEUTRAL: '0x0000000000000000000000000000000000000000' as Address, // TBD
  },
  84532: {
    ETH_MAXIMIZER: '0x0000000000000000000000000000000000000000' as Address, // TBD
    STABLE_YIELD_PLUS: '0x0000000000000000000000000000000000000000' as Address, // TBD
    ETHENA_DELTA_NEUTRAL: '0x0000000000000000000000000000000000000000' as Address, // TBD
  },
};

// ============================================
// PROTOCOL ADAPTERS (BASE)
// ============================================

export const PROTOCOL_ADAPTERS: Record<number, Record<string, Address>> = {
  8453: {
    STAKING_ADAPTER: '0x0000000000000000000000000000000000000000' as Address,
    LENDING_ADAPTER: '0x0000000000000000000000000000000000000000' as Address,
    STABLE_ADAPTER: '0x0000000000000000000000000000000000000000' as Address,
  },
};

// ============================================
// ADDITIONAL BASE TOKENS & PROTOCOLS
// ============================================

export const BASE_STAKING_TOKENS = {
  wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452' as Address, // Lido wstETH on Base
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' as Address, // Coinbase ETH
  rETH: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c' as Address, // Rocket Pool ETH
};

export const BASE_YIELD_STABLES = {
  sDAI: '0x0000000000000000000000000000000000000000' as Address, // TBD on Base
  USDY: '0x0000000000000000000000000000000000000000' as Address, // Ondo - TBD on Base
  sUSDe: '0x0000000000000000000000000000000000000000' as Address, // Ethena - TBD on Base
};

// Chainlink Price Feeds on Base
export const CHAINLINK_FEEDS: Record<number, Record<string, Address>> = {
  8453: {
    'ETH/USD': '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as Address,
    'USDC/USD': '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as Address,
    'DAI/USD': '0x591e79239a7d679378eC8c847e5038150364C78F' as Address,
  },
};
