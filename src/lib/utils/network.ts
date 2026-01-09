/**
 * Network Utilities
 *
 * Provides helper functions for network detection and switching.
 * Centralizes all network-related logic for consistency.
 */

import { IS_TESTNET, ACTIVE_CHAIN_ID } from '@/lib/smart-wallet';

// =============================================================================
// CONSTANTS
// =============================================================================

export const CHAIN_IDS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;

export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.BASE_MAINNET]: 'Base',
  [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia',
};

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if currently on testnet
 * Uses environment variable, not runtime chain detection
 */
export function isTestnet(): boolean {
  return IS_TESTNET;
}

/**
 * Check if currently on mainnet
 */
export function isMainnet(): boolean {
  return !IS_TESTNET;
}

/**
 * Get current chain ID
 */
export function getChainId(): number {
  return ACTIVE_CHAIN_ID;
}

/**
 * Get current chain name
 */
export function getChainName(): string {
  return CHAIN_NAMES[ACTIVE_CHAIN_ID] || 'Unknown';
}

// =============================================================================
// PROTOCOL SUPPORT
// =============================================================================

/**
 * Protocols available on Base Sepolia testnet
 */
export const TESTNET_SUPPORTED_PROTOCOLS = {
  lending: ['aave'] as const,
  staking: [] as const, // No staking protocols on testnet
  stableYield: ['aave'] as const, // Only Aave for stables
  dex: [] as const, // No DEX on testnet
};

/**
 * Check if a lending protocol is supported on current network
 */
export function isLendingProtocolSupported(protocol: string): boolean {
  if (isMainnet()) return true;
  return TESTNET_SUPPORTED_PROTOCOLS.lending.includes(
    protocol.toLowerCase() as typeof TESTNET_SUPPORTED_PROTOCOLS.lending[number]
  );
}

/**
 * Check if staking is supported on current network
 */
export function isStakingSupported(): boolean {
  if (isMainnet()) return true;
  return TESTNET_SUPPORTED_PROTOCOLS.staking.length > 0;
}

/**
 * Check if a specific staking protocol is supported
 */
export function isStakingProtocolSupported(protocol: string): boolean {
  if (isMainnet()) return true;
  return TESTNET_SUPPORTED_PROTOCOLS.staking.includes(
    protocol.toLowerCase() as typeof TESTNET_SUPPORTED_PROTOCOLS.staking[number]
  );
}

/**
 * Check if DEX swaps are supported on current network
 */
export function isDexSupported(): boolean {
  if (isMainnet()) return true;
  return TESTNET_SUPPORTED_PROTOCOLS.dex.length > 0;
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Get testnet warning message
 */
export function getTestnetWarning(): string {
  return 'You are on Base Sepolia testnet. Data shown is simulated for testing purposes.';
}

/**
 * Get testnet badge text
 */
export function getTestnetBadgeText(): string {
  return 'Testnet';
}

/**
 * Should show mock data indicator
 */
export function shouldShowMockIndicator(): boolean {
  return isTestnet();
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature availability based on network
 */
export const NETWORK_FEATURES = {
  /** Real staking positions from blockchain */
  realStakingPositions: !IS_TESTNET,
  /** Real stable yield positions from blockchain */
  realStablePositions: !IS_TESTNET,
  /** Real lending positions - available on both (Aave) */
  realLendingPositions: true,
  /** Swap functionality */
  swapEnabled: !IS_TESTNET,
  /** Strategy execution */
  strategyExecution: !IS_TESTNET,
  /** Real price feeds */
  realPriceFeeds: !IS_TESTNET,
};

export default {
  isTestnet,
  isMainnet,
  getChainId,
  getChainName,
  isLendingProtocolSupported,
  isStakingSupported,
  isDexSupported,
  getTestnetWarning,
  NETWORK_FEATURES,
};
