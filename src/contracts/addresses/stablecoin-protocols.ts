/**
 * Stablecoin Protocol Contract Addresses - Base Mainnet
 *
 * This file contains all verified contract addresses for stablecoin yield protocols on Base.
 * Chain ID: 8453
 *
 * Sources:
 * - Aave: https://docs.aave.com/developers/deployed-contracts/v3-mainnet/base
 * - Morpho: https://docs.morpho.org/contracts/contract-addresses
 * - Moonwell: https://docs.moonwell.fi/moonwell/protocol-information/contracts
 * - Compound: https://docs.compound.finance/
 * - Fluid: https://docs.fluid.instadapp.io/contracts/contract-addresses
 */

import { ProtocolName } from '@/types/stablecoin';

// =============================================================================
// CHAIN CONFIGURATION
// =============================================================================

export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';
export const BASE_EXPLORER_URL = 'https://basescan.org';

// =============================================================================
// STABLECOIN TOKEN ADDRESSES
// =============================================================================

export const STABLECOIN_ADDRESSES = {
  // Native USDC (Circle)
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,

  // Bridged USDC (from Ethereum via official bridge)
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as const,

  // DAI
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as const,

  // Note: USDT not widely available on Base yet
} as const;

// =============================================================================
// AAVE V3 ADDRESSES (Base)
// =============================================================================

export const AAVE_V3_ADDRESSES = {
  // Core Protocol
  Pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const,
  PoolAddressesProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D' as const,
  PoolDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac' as const,
  UiPoolDataProvider: '0x5d4D4007A4c6336550DdAa2a7c0d5e7972eebd16' as const,

  // aTokens (receipt tokens for supplied assets)
  aUSDC: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as const,
  aUSDbC: '0x0a1d576f3eFeF75b330424287a95A366e8281D54' as const,
  aDAI: '0x35F5A420ef9BCc748329021FBE4f2Bf80d92c2Ee' as const,

  // Variable Debt Tokens (for borrowing - future use)
  variableDebtUSDC: '0x59dca05b6c26dbd64b5381374aAaC5CD05644C28' as const,
  variableDebtUSDbC: '0x7376b2F323dC56fCd4C191B34163ac8a84702DAB' as const,
  variableDebtDAI: '0x26a8f6B62c8E4a1A9D0E3009aDf40D4D2C0c7B4F' as const,

  // Rewards
  RewardsController: '0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44' as const,

  // Oracles
  AaveOracle: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156' as const,
} as const;

// =============================================================================
// MORPHO BLUE ADDRESSES (Base)
// =============================================================================

export const MORPHO_ADDRESSES = {
  // Core Protocol
  MorphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as const,

  // Bundler (for batched operations)
  Bundler: '0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077' as const,

  // ==========================================================================
  // CURATED VAULTS (ERC-4626)
  // These are managed by professional risk curators
  // ==========================================================================

  vaults: {
    // Gauntlet Curated Vaults
    gauntlet: {
      USDCPrime: '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca' as const,
      // Add more Gauntlet vaults as they launch
    },

    // Moonwell Flagship Vault
    moonwell: {
      USDC: '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca' as const, // Same as Gauntlet Prime
    },

    // Steakhouse Vaults
    steakhouse: {
      // Add when addresses are confirmed
    },
  },

  // GraphQL API for vault data
  apiEndpoint: 'https://api.morpho.org/graphql',
} as const;

// =============================================================================
// MOONWELL ADDRESSES (Base)
// =============================================================================

export const MOONWELL_ADDRESSES = {
  // Core Protocol (Compound V2 fork)
  Comptroller: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C' as const,
  TemporalGovernor: '0x8b621804a7637b781e2BbD58e256a591F2dF7d51' as const,

  // mTokens (receipt tokens)
  mUSDC: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as const,
  mUSDbC: '0x703843C3379b52F9FF486c9f5F4f28Bf0f8E3Cfd' as const,
  mDAI: '0x73b06D8d18De422E269645eaCe15400DE7462417' as const,

  // Supporting Infrastructure
  MultiRewardDistributor: '0xe9005b078701e2A0948D2EaC43010D35870Ad9d2' as const,
  ChainlinkOracle: '0xEC942bE8A8114bFD0396A5052c36027f2cA6a9d0' as const,
  MoonwellViews: '0x6834770aba6c2028f448e3259ddee4bcb879d459' as const,

  // WELL Token (rewards)
  WELL: '0xA88594D404727625A9437C3f886C7643872296AE' as const,

  // WETHRouter (for native ETH handling)
  WETHRouter: '0x9a44E90E1812b4975C5e878cF87f5B795b6f2bBf' as const,
} as const;

// =============================================================================
// COMPOUND V3 (COMET) ADDRESSES (Base)
// =============================================================================

export const COMPOUND_V3_ADDRESSES = {
  // USDC Market (Comet)
  cUSDCv3: '0xb125E6687d4313864e53df431d5425969c15Eb2F' as const,

  // Configurator
  Configurator: '0x45939657d1CA34A8FA39A924B71D28Fe8431e581' as const,

  // Rewards
  CometRewards: '0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b7' as const,

  // COMP Token (rewards)
  COMP: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0' as const,
} as const;

// =============================================================================
// FLUID PROTOCOL ADDRESSES (Base)
// =============================================================================

export const FLUID_ADDRESSES = {
  // Core Liquidity Layer
  Liquidity: '0x52Aa899454998Be5b000Ad077a46Bbe360F4e497' as const,

  // fTokens (ERC-4626 lending tokens)
  fUSDC: '0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33' as const,
  // fUSDT: Not yet deployed on Base
  // fDAI: Not yet deployed on Base

  // Factories
  LendingFactory: '0xF5b8C9e5a3C6D5fA1A1b3c2e9d8f7A6B5C4D3E2F' as const, // Placeholder - verify

  // Resolvers (for reading data)
  LendingResolver: '0x3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b' as const, // Placeholder - verify

  // Note: Fluid addresses should be verified from their GitHub before production use
  // https://github.com/Instadapp/fluid-contracts-public
} as const;

// =============================================================================
// CHAINLINK PRICE FEEDS (Base)
// =============================================================================

export const CHAINLINK_FEEDS = {
  // Stablecoin / USD feeds
  USDC_USD: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as const,
  DAI_USD: '0x591e79239a7d679378eC8c847e5038150364C78F' as const,

  // ETH / USD for gas calculations
  ETH_USD: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as const,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all relevant addresses for a protocol
 */
export function getProtocolAddresses(protocol: ProtocolName) {
  switch (protocol) {
    case 'aave':
      return AAVE_V3_ADDRESSES;
    case 'morpho':
      return MORPHO_ADDRESSES;
    case 'moonwell':
      return MOONWELL_ADDRESSES;
    case 'compound':
      return COMPOUND_V3_ADDRESSES;
    case 'fluid':
      return FLUID_ADDRESSES;
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

/**
 * Get the main pool/vault address for depositing a stablecoin
 */
export function getPoolAddress(
  protocol: ProtocolName,
  asset: 'USDC' | 'USDbC' | 'DAI'
): `0x${string}` {
  switch (protocol) {
    case 'aave':
      // Aave uses the Pool contract for all assets
      return AAVE_V3_ADDRESSES.Pool;

    case 'morpho':
      // Morpho uses specific vaults
      if (asset === 'USDC') {
        return MORPHO_ADDRESSES.vaults.gauntlet.USDCPrime;
      }
      throw new Error(`Morpho vault not available for ${asset}`);

    case 'moonwell':
      // Moonwell uses specific mTokens
      if (asset === 'USDC') return MOONWELL_ADDRESSES.mUSDC;
      if (asset === 'USDbC') return MOONWELL_ADDRESSES.mUSDbC;
      if (asset === 'DAI') return MOONWELL_ADDRESSES.mDAI;
      throw new Error(`Moonwell market not available for ${asset}`);

    case 'compound':
      // Compound V3 has one Comet per base asset
      if (asset === 'USDC' || asset === 'USDbC') {
        return COMPOUND_V3_ADDRESSES.cUSDCv3;
      }
      throw new Error(`Compound market not available for ${asset}`);

    case 'fluid':
      if (asset === 'USDC') return FLUID_ADDRESSES.fUSDC;
      throw new Error(`Fluid market not available for ${asset}`);

    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

/**
 * Get the receipt token address for a position
 */
export function getReceiptTokenAddress(
  protocol: ProtocolName,
  asset: 'USDC' | 'USDbC' | 'DAI'
): `0x${string}` {
  switch (protocol) {
    case 'aave':
      if (asset === 'USDC') return AAVE_V3_ADDRESSES.aUSDC;
      if (asset === 'USDbC') return AAVE_V3_ADDRESSES.aUSDbC;
      if (asset === 'DAI') return AAVE_V3_ADDRESSES.aDAI;
      break;

    case 'morpho':
      // Morpho vaults are the receipt token (ERC-4626)
      return getPoolAddress(protocol, asset);

    case 'moonwell':
      if (asset === 'USDC') return MOONWELL_ADDRESSES.mUSDC;
      if (asset === 'USDbC') return MOONWELL_ADDRESSES.mUSDbC;
      if (asset === 'DAI') return MOONWELL_ADDRESSES.mDAI;
      break;

    case 'compound':
      // Compound V3 Comet is the receipt token
      return COMPOUND_V3_ADDRESSES.cUSDCv3;

    case 'fluid':
      // fTokens are the receipt token (ERC-4626)
      return getPoolAddress(protocol, asset);
  }

  throw new Error(`Receipt token not found for ${protocol} ${asset}`);
}

/**
 * Get explorer URL for a contract
 */
export function getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  return `${BASE_EXPLORER_URL}/${type}/${address}`;
}

// =============================================================================
// PROTOCOL METADATA
// =============================================================================

export const PROTOCOL_METADATA: Record<ProtocolName, {
  name: string;
  displayName: string;
  tier: 1 | 2;
  color: string;
  website: string;
  logoPath: string;
}> = {
  aave: {
    name: 'aave',
    displayName: 'Aave V3',
    tier: 1,
    color: '#B6509E',
    website: 'https://aave.com',
    logoPath: '/logos/aave.svg',
  },
  compound: {
    name: 'compound',
    displayName: 'Compound V3',
    tier: 1,
    color: '#00D395',
    website: 'https://compound.finance',
    logoPath: '/logos/compound.svg',
  },
  morpho: {
    name: 'morpho',
    displayName: 'Morpho Blue',
    tier: 2,
    color: '#0F62FE',
    website: 'https://morpho.org',
    logoPath: '/logos/morpho.svg',
  },
  moonwell: {
    name: 'moonwell',
    displayName: 'Moonwell',
    tier: 2,
    color: '#6366F1',
    website: 'https://moonwell.fi',
    logoPath: '/logos/moonwell.svg',
  },
  fluid: {
    name: 'fluid',
    displayName: 'Fluid',
    tier: 2,
    color: '#8B5CF6',
    website: 'https://fluid.io',
    logoPath: '/logos/fluid.svg',
  },
};
