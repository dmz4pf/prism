/**
 * Network Configuration
 * Handles switching between Base Mainnet and Base Sepolia testnet
 */

import { base, baseSepolia } from 'viem/chains';
import {
  BASE_MAINNET_CONTRACTS,
  BASE_CHAIN_ID,
  getExplorerUrl,
  getAddressExplorerUrl as getMainnetAddressExplorerUrl,
} from './base-mainnet';
import {
  BASE_SEPOLIA_CONTRACTS,
  BASE_SEPOLIA_CHAIN_ID,
  getSepoliaExplorerUrl,
  getSepoliaAddressExplorerUrl,
} from './base-sepolia';

export type NetworkMode = 'mainnet' | 'testnet';
export type DataMode = 'live' | 'mock';

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorer: string;
  contracts: typeof BASE_MAINNET_CONTRACTS | typeof BASE_SEPOLIA_CONTRACTS;
  dataMode: DataMode;
  chain: typeof base | typeof baseSepolia;
  getExplorerTxUrl: (txHash: string) => string;
  getExplorerAddressUrl: (address: string) => string;
}

export const NETWORK_CONFIGS: Record<NetworkMode, NetworkConfig> = {
  mainnet: {
    chainId: BASE_CHAIN_ID,
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    contracts: BASE_MAINNET_CONTRACTS,
    dataMode: 'live',
    chain: base,
    getExplorerTxUrl: getExplorerUrl,
    getExplorerAddressUrl: getMainnetAddressExplorerUrl,
  },
  testnet: {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    rpcUrl:
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    contracts: BASE_SEPOLIA_CONTRACTS,
    dataMode: 'mock',
    chain: baseSepolia,
    getExplorerTxUrl: getSepoliaExplorerUrl,
    getExplorerAddressUrl: getSepoliaAddressExplorerUrl,
  },
};

/**
 * Check if we're in testnet mode
 */
export function isTestnet(): boolean {
  return process.env.NEXT_PUBLIC_TESTNET === 'true';
}

/**
 * Get the current network configuration
 */
export function getNetworkConfig(): NetworkConfig {
  return isTestnet() ? NETWORK_CONFIGS.testnet : NETWORK_CONFIGS.mainnet;
}

/**
 * Get the current network's contracts
 */
export function getContracts() {
  return getNetworkConfig().contracts;
}

/**
 * Get the current chain for viem/wagmi
 */
export function getChain() {
  return getNetworkConfig().chain;
}

/**
 * Get explorer URL for a transaction
 */
export function getTxExplorerUrl(txHash: string): string {
  return getNetworkConfig().getExplorerTxUrl(txHash);
}

/**
 * Get explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  return getNetworkConfig().getExplorerAddressUrl(address);
}

/**
 * Check if data should be mocked (testnet mode)
 */
export function shouldUseMockData(): boolean {
  return getNetworkConfig().dataMode === 'mock';
}

/**
 * Check if PRICES should use live data
 * Returns true even on testnet - Chainlink testnets return real prices
 *
 * Can be overridden with NEXT_PUBLIC_FORCE_MOCK_PRICES=true
 */
export function shouldUseLivePrices(): boolean {
  if (process.env.NEXT_PUBLIC_FORCE_MOCK_PRICES === 'true') {
    return false;
  }
  // Always use live prices - Chainlink works on testnet too
  return true;
}

/**
 * Check if POSITIONS should use mock data
 * Positions are mocked on testnet because contracts may not be deployed
 */
export function shouldUseMockPositions(): boolean {
  return getNetworkConfig().dataMode === 'mock';
}

/**
 * Get the RPC URL for the current network
 */
export function getRpcUrl(): string {
  return getNetworkConfig().rpcUrl;
}

/**
 * Get the chain ID for the current network
 */
export function getChainId(): number {
  return getNetworkConfig().chainId;
}

/**
 * Network display info for UI
 */
export function getNetworkDisplayInfo(): {
  name: string;
  isTestnet: boolean;
  badge?: string;
} {
  const config = getNetworkConfig();
  return {
    name: config.name,
    isTestnet: isTestnet(),
    badge: isTestnet() ? 'TESTNET' : undefined,
  };
}
