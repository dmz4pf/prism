/**
 * Contract Addresses Index
 * Exports all contract addresses and network configuration
 */

// Network-specific addresses (excluding functions that would conflict with network-config)
export {
  BASE_CHAIN_ID,
  BASE_MAINNET_CONTRACTS,
  type BaseMainnetContracts,
  type TokenAddress,
  getExplorerUrl as getMainnetExplorerUrl,
  getAddressExplorerUrl as getMainnetAddressExplorerUrl,
} from './base-mainnet';

export {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CONTRACTS,
  getSepoliaExplorerUrl,
  getSepoliaAddressExplorerUrl,
  TESTNET_FAUCETS,
} from './base-sepolia';

// Network configuration and helpers
export {
  getNetworkConfig,
  getContracts,
  getChain,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  isTestnet,
  shouldUseMockData,
  getRpcUrl,
  getChainId,
  getNetworkDisplayInfo,
  NETWORK_CONFIGS,
  type NetworkConfig,
  type NetworkMode,
  type DataMode,
} from './network-config';
