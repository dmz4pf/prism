/**
 * Lending Adapters - Index
 *
 * Re-exports all protocol adapters and provides factory functions.
 */

import { PublicClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { LendingAdapter, LendingProtocol } from '@/types/lending';
import { IS_TESTNET } from '@/lib/smart-wallet';
import { getSupportedLendingProtocols, isAdapterSupportedOnNetwork } from '@/services/adapters/network-detection';

// Adapter exports
export { BaseLendingAdapter } from './base-adapter';
export { AaveAdapter, createAaveAdapter } from './aave-adapter';
export { MorphoAdapter, createMorphoAdapter } from './morpho-adapter';
export { CompoundAdapter, createCompoundAdapter } from './compound-adapter';
export { MoonwellAdapter, createMoonwellAdapter } from './moonwell-adapter';

// Re-export factory functions
import { createAaveAdapter } from './aave-adapter';
import { createMorphoAdapter } from './morpho-adapter';
import { createCompoundAdapter } from './compound-adapter';
import { createMoonwellAdapter } from './moonwell-adapter';

// =============================================================================
// NETWORK SUPPORT
// =============================================================================

/**
 * Lending protocols have different support across networks:
 * - Base Mainnet (8453): All protocols supported
 * - Base Sepolia (84532): Only Aave V3 officially deployed
 */
export function isLendingNetworkSupported(chainId: number): boolean {
  return chainId === base.id || chainId === baseSepolia.id;
}

/**
 * Get list of protocols supported on a given chain
 */
export function getSupportedProtocolsForChain(chainId: number): LendingProtocol[] {
  // Base Mainnet - all protocols
  if (chainId === base.id) {
    return ['aave', 'morpho', 'compound', 'moonwell'];
  }

  // Base Sepolia - only Aave V3
  if (chainId === baseSepolia.id) {
    const supportedIds = getSupportedLendingProtocols();
    return supportedIds as LendingProtocol[];
  }

  // Unsupported network
  return [];
}

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

/**
 * Create an adapter for a specific protocol
 * Returns null if the protocol isn't supported on the given chain
 */
export function createAdapter(
  protocol: LendingProtocol,
  client: PublicClient,
  chainId: number = 8453
): LendingAdapter | null {
  // Check if lending is supported on this chain
  if (!isLendingNetworkSupported(chainId)) {
    console.log(`Lending not supported on chainId ${chainId}.`);
    return null;
  }

  // Check if this specific protocol is supported
  const supportedProtocols = getSupportedProtocolsForChain(chainId);
  if (!supportedProtocols.includes(protocol)) {
    console.log(`Protocol ${protocol} not supported on chainId ${chainId}.`);
    return null;
  }

  switch (protocol) {
    case 'aave':
      return createAaveAdapter(client, chainId);
    case 'morpho':
      return createMorphoAdapter(client, chainId);
    case 'compound':
      return createCompoundAdapter(client, chainId);
    case 'moonwell':
      return createMoonwellAdapter(client, chainId);
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

/**
 * Create adapters for all supported protocols on the given chain
 * On Base Mainnet: Creates adapters for all protocols
 * On Base Sepolia: Creates adapter for Aave V3 only
 */
export function createAllAdapters(
  client: PublicClient,
  chainId: number = 8453
): Map<LendingProtocol, LendingAdapter> {
  const adapters = new Map<LendingProtocol, LendingAdapter>();

  // Get protocols supported on this chain
  const protocols = getSupportedProtocolsForChain(chainId);

  if (protocols.length === 0) {
    const networkName = chainId === baseSepolia.id ? 'Base Sepolia' : `chainId ${chainId}`;
    console.log(`No lending protocols available on ${networkName}.`);
    return adapters;
  }

  const networkName = chainId === base.id ? 'Base Mainnet' : chainId === baseSepolia.id ? 'Base Sepolia' : `chainId ${chainId}`;
  console.log(`[Lending Adapters] Creating ${protocols.length} adapter(s) for ${networkName}:`, protocols);

  for (const protocol of protocols) {
    try {
      const adapter = createAdapter(protocol, client, chainId);
      if (adapter) {
        adapters.set(protocol, adapter);
        console.log(`[Lending Adapters] ✓ ${protocol} adapter created`);
      }
    } catch (error) {
      console.warn(`[Lending Adapters] ✗ Failed to create adapter for ${protocol}:`, error);
    }
  }

  return adapters;
}

/**
 * List of all supported protocols
 */
export const SUPPORTED_PROTOCOLS: LendingProtocol[] = [
  'aave',
  'morpho',
  'compound',
  'moonwell',
];

/**
 * Protocol metadata
 */
export const PROTOCOL_INFO: Record<LendingProtocol, {
  name: string;
  description: string;
  tier: 1 | 2;
  website: string;
  logoUrl: string;
}> = {
  aave: {
    name: 'Aave V3',
    description: 'The largest DeFi lending protocol with pooled liquidity',
    tier: 1,
    website: 'https://aave.com',
    logoUrl: '/images/protocols/aave.svg',
  },
  morpho: {
    name: 'Morpho Blue',
    description: 'Isolated lending markets with optimized rates',
    tier: 1,
    website: 'https://morpho.org',
    logoUrl: '/images/protocols/morpho.svg',
  },
  compound: {
    name: 'Compound III',
    description: 'Single-asset lending with multiple collaterals',
    tier: 2,
    website: 'https://compound.finance',
    logoUrl: '/images/protocols/compound.svg',
  },
  moonwell: {
    name: 'Moonwell',
    description: 'Native Base lending protocol with WELL rewards',
    tier: 2,
    website: 'https://moonwell.fi',
    logoUrl: '/images/protocols/moonwell.svg',
  },
};
