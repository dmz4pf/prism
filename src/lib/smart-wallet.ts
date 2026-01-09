import { type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// ============================================
// CONFIGURATION
// ============================================

export const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
export const ACTIVE_CHAIN = IS_TESTNET ? baseSepolia : base;
export const ACTIVE_CHAIN_ID = IS_TESTNET ? baseSepolia.id : base.id;

// ZeroDev Configuration
export const ZERODEV_CONFIG = {
  bundlerUrl: process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL || '',
  paymasterUrl: process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL || '',
};

// ERC-4337 EntryPoint v0.7
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address;

// Kernel Factory (same on all EVM chains)
export const KERNEL_FACTORY_ADDRESS = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3' as Address;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format an address for display (0x1234...5678)
 */
export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get block explorer URL for address
 */
export function getExplorerUrl(address: Address): string {
  const baseUrl = IS_TESTNET
    ? 'https://sepolia.basescan.org'
    : 'https://basescan.org';
  return `${baseUrl}/address/${address}`;
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerTxUrl(hash: `0x${string}`): string {
  const baseUrl = IS_TESTNET
    ? 'https://sepolia.basescan.org'
    : 'https://basescan.org';
  return `${baseUrl}/tx/${hash}`;
}

/**
 * Check if ZeroDev is configured
 */
export function isZeroDevConfigured(): boolean {
  return !!ZERODEV_CONFIG.bundlerUrl && !!ZERODEV_CONFIG.paymasterUrl;
}
