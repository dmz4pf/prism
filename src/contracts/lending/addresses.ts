/**
 * Lending Protocol Contract Addresses
 *
 * All contract addresses for lending protocols on supported chains.
 */

import { Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// =============================================================================
// TYPES
// =============================================================================

export interface ProtocolAddresses {
  // Core contracts
  core: Address;

  // Data providers
  dataProvider?: Address;
  uiDataProvider?: Address;
  oracle?: Address;

  // Helpers
  bundler?: Address;
  rewards?: Address;

  // Pool-specific (for pooled protocols)
  poolAddressesProvider?: Address;
}

export interface TokenAddresses {
  underlying: Address;
  aToken?: Address;              // Aave
  variableDebtToken?: Address;   // Aave
  mToken?: Address;              // Moonwell
  symbol: string;
  decimals: number;
}

export interface ChainAddresses {
  // Protocol addresses
  aave: ProtocolAddresses;
  morpho: ProtocolAddresses;
  compound: ProtocolAddresses;
  moonwell: ProtocolAddresses;

  // Common tokens
  tokens: Record<string, TokenAddresses>;

  // Native wrapped token
  weth: Address;
}

// =============================================================================
// BASE MAINNET ADDRESSES
// =============================================================================

export const BASE_ADDRESSES: ChainAddresses = {
  // ---------------------------------------------------------------------------
  // AAVE V3
  // ---------------------------------------------------------------------------
  aave: {
    core: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as Address,               // Pool
    poolAddressesProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D' as Address,
    dataProvider: '0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A' as Address,       // PoolDataProvider
    uiDataProvider: '0x174446a6741300cd2e7c1b1a636fee99c8f83502' as Address,     // UiPoolDataProvider
    oracle: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156' as Address,             // AaveOracle
  },

  // ---------------------------------------------------------------------------
  // MORPHO BLUE
  // ---------------------------------------------------------------------------
  morpho: {
    core: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as Address,               // Morpho Blue
    bundler: '0x23055618898e202386e6c13955a58d3c68200bfb' as Address,            // Chain Agnostic Bundler V2
  },

  // ---------------------------------------------------------------------------
  // COMPOUND III (COMET)
  // ---------------------------------------------------------------------------
  compound: {
    core: '0xb125E6687d4313864e53df431d5425969c15Eb2F' as Address,               // cUSDCv3 (USDC Market)
    rewards: '0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1' as Address,            // CometRewards
  },

  // ---------------------------------------------------------------------------
  // MOONWELL
  // ---------------------------------------------------------------------------
  moonwell: {
    core: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C' as Address,               // Comptroller (Unitroller)
    oracle: '0xEC942bE8A8114bFD0396A5052c36027f2cA6a9d0' as Address,             // ChainlinkOracle
  },

  // ---------------------------------------------------------------------------
  // COMMON TOKENS
  // ---------------------------------------------------------------------------
  tokens: {
    // Stablecoins
    USDC: {
      underlying: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
      aToken: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as Address,
      variableDebtToken: '0x59dca05b6c26dbd64b5381374aAaC5CD05644C28' as Address,
      mToken: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as Address,
      symbol: 'USDC',
      decimals: 6,
    },
    USDbC: {
      underlying: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as Address,
      symbol: 'USDbC',
      decimals: 6,
    },
    DAI: {
      underlying: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
      mToken: '0x628ff693426583D9a7FB391E54366292F509D457' as Address,
      symbol: 'DAI',
      decimals: 18,
    },

    // ETH variants
    WETH: {
      underlying: '0x4200000000000000000000000000000000000006' as Address,
      aToken: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7' as Address,
      variableDebtToken: '0x24e6e0795b3c7c71D965fCc4f371803d1c1DcA1E' as Address,
      mToken: '0x628ff693426583D9a7FB391E54366292F509D457' as Address,
      symbol: 'WETH',
      decimals: 18,
    },
    cbETH: {
      underlying: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEC22' as Address,
      aToken: '0xcf3D55c10DB69f28fD1A75Bd73f3D8A2d9c595ad' as Address,
      variableDebtToken: '0x1DabC36f19909425f654777249815c073E8Fd79F' as Address,
      mToken: '0x3bf93770f2d4a794c3d9EBEfBAeBAE2a8f09A5E5' as Address,
      symbol: 'cbETH',
      decimals: 18,
    },
    wstETH: {
      underlying: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0EE452' as Address,
      aToken: '0x99CBC45ea5bb7eF3a5BC08FB1B7E56bB2442Ef0D' as Address,
      variableDebtToken: '0x41A7C3f5904ad176dACbb1D99101F59ef0811DC1' as Address,
      symbol: 'wstETH',
      decimals: 18,
    },

    // BTC
    cbBTC: {
      underlying: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as Address,
      symbol: 'cbBTC',
      decimals: 8,
    },
    WBTC: {
      underlying: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c' as Address,
      mToken: '0x7f9e5ee9F2Ff5f9d8E0c8a0d6F9D2A6c7a5c3D4b' as Address, // Placeholder
      symbol: 'WBTC',
      decimals: 8,
    },

    // Other
    AERO: {
      underlying: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as Address,
      mToken: '0x73b06D8d18De422E269645eaCe15400DE7462417' as Address,
      symbol: 'AERO',
      decimals: 18,
    },
  },

  // Wrapped native token
  weth: '0x4200000000000000000000000000000000000006' as Address,
};

// =============================================================================
// BASE SEPOLIA TESTNET ADDRESSES
// =============================================================================

export const BASE_SEPOLIA_ADDRESSES: Partial<ChainAddresses> = {
  // Aave V3 Testnet (if available)
  aave: {
    core: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
  },

  // Morpho (no testnet)
  morpho: {
    core: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
  },

  // Compound (no testnet on Base Sepolia)
  compound: {
    core: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
  },

  // Moonwell (no testnet on Base Sepolia)
  moonwell: {
    core: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
  },

  tokens: {},

  weth: '0x4200000000000000000000000000000000000006' as Address,
};

// =============================================================================
// MORPHO POPULAR MARKETS (Base)
// =============================================================================

/**
 * Pre-defined Morpho market configurations for popular markets.
 * These are the markets we'll show by default in the UI.
 */
export interface MorphoMarketConfig {
  id: string;                    // Market ID (bytes32 hex)
  name: string;
  loanToken: Address;
  loanSymbol: string;
  collateralToken: Address;
  collateralSymbol: string;
  oracle: Address;
  irm: Address;
  lltv: bigint;
  curator?: string;              // Vault curator name
}

export const MORPHO_POPULAR_MARKETS: MorphoMarketConfig[] = [
  // USDC/cbBTC (Coinbase BTC-backed loans)
  {
    id: '0x...',  // Fill with actual market ID
    name: 'USDC/cbBTC',
    loanToken: BASE_ADDRESSES.tokens.USDC.underlying,
    loanSymbol: 'USDC',
    collateralToken: BASE_ADDRESSES.tokens.cbBTC.underlying,
    collateralSymbol: 'cbBTC',
    oracle: '0x...' as Address,  // Fill with actual oracle
    irm: '0x...' as Address,     // Fill with actual IRM
    lltv: 860000000000000000n,   // 86%
    curator: 'Gauntlet',
  },
  // USDC/WETH
  {
    id: '0x...',
    name: 'USDC/WETH',
    loanToken: BASE_ADDRESSES.tokens.USDC.underlying,
    loanSymbol: 'USDC',
    collateralToken: BASE_ADDRESSES.tokens.WETH.underlying,
    collateralSymbol: 'WETH',
    oracle: '0x...' as Address,
    irm: '0x...' as Address,
    lltv: 860000000000000000n,
    curator: 'Steakhouse',
  },
  // USDC/wstETH
  {
    id: '0x...',
    name: 'USDC/wstETH',
    loanToken: BASE_ADDRESSES.tokens.USDC.underlying,
    loanSymbol: 'USDC',
    collateralToken: BASE_ADDRESSES.tokens.wstETH.underlying,
    collateralSymbol: 'wstETH',
    oracle: '0x...' as Address,
    irm: '0x...' as Address,
    lltv: 860000000000000000n,
    curator: 'Steakhouse',
  },
];

// =============================================================================
// MOONWELL MARKETS (Base)
// =============================================================================

export interface MoonwellMarketConfig {
  mToken: Address;
  underlying: Address;
  symbol: string;
  name: string;
}

export const MOONWELL_MARKETS: MoonwellMarketConfig[] = [
  {
    mToken: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as Address,
    underlying: BASE_ADDRESSES.tokens.USDC.underlying,
    symbol: 'mUSDC',
    name: 'Moonwell USDC',
  },
  {
    mToken: '0x628ff693426583D9a7FB391E54366292F509D457' as Address,
    underlying: BASE_ADDRESSES.tokens.WETH.underlying,
    symbol: 'mWETH',
    name: 'Moonwell WETH',
  },
  {
    mToken: '0x3bf93770f2d4a794c3d9EBEfBAeBAE2a8f09A5E5' as Address,
    underlying: BASE_ADDRESSES.tokens.cbETH.underlying,
    symbol: 'mcbETH',
    name: 'Moonwell cbETH',
  },
  {
    mToken: '0x73b06D8d18De422E269645eaCe15400DE7462417' as Address,
    underlying: BASE_ADDRESSES.tokens.AERO.underlying,
    symbol: 'mAERO',
    name: 'Moonwell AERO',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get addresses for a specific chain
 */
export function getAddressesForChain(chainId: number): ChainAddresses | null {
  switch (chainId) {
    case base.id:
      return BASE_ADDRESSES;
    case baseSepolia.id:
      return BASE_SEPOLIA_ADDRESSES as ChainAddresses;
    default:
      return null;
  }
}

/**
 * Get protocol addresses for a specific chain and protocol
 */
export function getProtocolAddresses(
  chainId: number,
  protocol: 'aave' | 'morpho' | 'compound' | 'moonwell'
): ProtocolAddresses | null {
  const addresses = getAddressesForChain(chainId);
  if (!addresses) return null;
  return addresses[protocol];
}

/**
 * Get token addresses for a specific chain
 */
export function getTokenAddresses(
  chainId: number,
  symbol: string
): TokenAddresses | null {
  const addresses = getAddressesForChain(chainId);
  if (!addresses) return null;
  return addresses.tokens[symbol] || null;
}

/**
 * Check if a chain is supported for lending
 */
export function isLendingSupported(chainId: number): boolean {
  return chainId === base.id;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SUPPORTED_LENDING_CHAINS = [base.id] as const;

export const DEFAULT_LENDING_CHAIN = base.id;

// Max uint256 for approvals
export const MAX_UINT256 = 2n ** 256n - 1n;

// Common rate scaling factors
export const RAY = 10n ** 27n;              // Aave uses RAY (27 decimals)
export const WAD = 10n ** 18n;              // Morpho uses WAD (18 decimals)
export const SECONDS_PER_YEAR = 31536000n;  // 365 days

// Interest rate conversion helpers
export function rayToPercent(ray: bigint): number {
  return Number(ray) / Number(RAY) * 100;
}

export function wadToPercent(wad: bigint): number {
  return Number(wad) / Number(WAD) * 100;
}

export function percentToRay(percent: number): bigint {
  return BigInt(Math.floor(percent / 100 * Number(RAY)));
}

export function percentToWad(percent: number): bigint {
  return BigInt(Math.floor(percent / 100 * Number(WAD)));
}
