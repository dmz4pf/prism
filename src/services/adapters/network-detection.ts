/**
 * Network Detection for Protocol Adapters
 *
 * Determines which protocols are supported on which networks.
 * Prevents errors by skipping unsupported adapters on testnet.
 */

import { IS_TESTNET } from '@/lib/smart-wallet';

// ============================================
// TYPES
// ============================================

export type AdapterId =
  // Lending
  | 'aave'
  | 'morpho'
  | 'moonwell'
  | 'compound'
  // Staking
  | 'lido'
  | 'cbeth'
  | 'weeth'
  | 'superoeth'
  | 'etherfi'
  | 'origin'
  // Stable
  | 'ethena';

// ============================================
// TESTNET SUPPORT MAP
// ============================================

/**
 * Map of which adapters are supported on testnet
 *
 * Base Sepolia (84532) has limited protocol deployments:
 * - Aave V3: ✅ Official deployment
 * - Everything else: ❌ Not deployed
 */
const TESTNET_SUPPORT: Record<AdapterId, boolean> = {
  // Lending protocols
  aave: true,       // ✅ Official Aave V3 deployment on Base Sepolia
  morpho: false,    // ❌ Morpho not deployed on Base Sepolia
  moonwell: false,  // ❌ Moonwell not deployed on Base Sepolia
  compound: false,  // ❌ Compound V3 not deployed on Base Sepolia

  // Staking protocols
  lido: false,      // ❌ wstETH not bridged to Base Sepolia
  cbeth: false,     // ❌ cbETH not available on Base Sepolia
  weeth: false,     // ❌ weETH not bridged to Base Sepolia
  superoeth: false, // ❌ superOETHb not deployed on Base Sepolia
  etherfi: false,   // ❌ Ether.fi not on Base Sepolia
  origin: false,    // ❌ Origin not on Base Sepolia

  // Stable yield
  ethena: false,    // ❌ Ethena sUSDe not on Base Sepolia
};

/**
 * After Phase 2 (mock contract deployment), update to:
 *
 * const TESTNET_SUPPORT_PHASE2: Record<AdapterId, boolean> = {
 *   aave: true,       // ✅ Official
 *   morpho: true,     // ✅ Mock deployed
 *   moonwell: false,  // ❌ Still not deployed
 *   compound: false,  // ❌ Still not deployed
 *   lido: true,       // ✅ Mock wstETH deployed
 *   cbeth: true,      // ✅ Mock cbETH deployed
 *   weeth: true,      // ✅ Mock weETH deployed
 *   superoeth: true,  // ✅ Mock superOETHb deployed
 *   etherfi: true,    // ✅ (same as weETH)
 *   origin: true,     // ✅ (same as superOETHb)
 *   ethena: false,    // ❌ No sUSDe on Base Sepolia
 * };
 */

// ============================================
// FUNCTIONS
// ============================================

/**
 * Check if adapter is supported on current network
 *
 * @param adapterId - Adapter to check
 * @param isTestnet - Optional: override IS_TESTNET flag for testing
 * @returns true if adapter is supported
 */
export function isAdapterSupportedOnNetwork(
  adapterId: AdapterId,
  isTestnet?: boolean
): boolean {
  const testnetMode = isTestnet ?? IS_TESTNET;

  // All adapters work on mainnet
  if (!testnetMode) {
    return true;
  }

  // On testnet, check support map
  const supported = TESTNET_SUPPORT[adapterId] ?? false;

  if (!supported) {
    console.log(
      `[Network Detection] Adapter "${adapterId}" not supported on testnet (Base Sepolia)`
    );
  }

  return supported;
}

/**
 * Get list of supported adapters for current network
 *
 * @returns Array of supported adapter IDs
 */
export function getSupportedAdapters(): AdapterId[] {
  if (!IS_TESTNET) {
    // All adapters supported on mainnet
    return Object.keys(TESTNET_SUPPORT) as AdapterId[];
  }

  // Filter to only supported adapters on testnet
  return (Object.keys(TESTNET_SUPPORT) as AdapterId[]).filter(
    (id) => TESTNET_SUPPORT[id]
  );
}

/**
 * Get supported lending protocols
 */
export function getSupportedLendingProtocols(): AdapterId[] {
  const lendingAdapters: AdapterId[] = ['aave', 'morpho', 'moonwell', 'compound'];
  return lendingAdapters.filter(id => isAdapterSupportedOnNetwork(id));
}

/**
 * Get supported staking protocols
 */
export function getSupportedStakingProtocols(): AdapterId[] {
  const stakingAdapters: AdapterId[] = ['lido', 'cbeth', 'weeth', 'superoeth', 'etherfi', 'origin'];
  return stakingAdapters.filter(id => isAdapterSupportedOnNetwork(id));
}

/**
 * Log network support status (for debugging)
 */
export function logNetworkSupport() {
  const supported = getSupportedAdapters();
  const networkName = IS_TESTNET ? 'Base Sepolia (testnet)' : 'Base Mainnet';

  console.group(`[Network Detection] ${networkName}`);
  console.log('Supported adapters:', supported);
  console.log('Total supported:', supported.length);
  console.groupEnd();
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate network detection configuration
 */
export function validateNetworkDetection(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that at least Aave is supported on testnet
  if (IS_TESTNET && !TESTNET_SUPPORT.aave) {
    errors.push('Aave should be supported on Base Sepolia testnet');
  }

  // Check that all adapters are supported on mainnet
  if (!IS_TESTNET) {
    const supported = getSupportedAdapters();
    const expected = Object.keys(TESTNET_SUPPORT).length;
    if (supported.length !== expected) {
      errors.push(`Expected ${expected} adapters on mainnet, got ${supported.length}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// EXPORTS
// ============================================

export const networkDetection = {
  isSupported: isAdapterSupportedOnNetwork,
  getSupportedAdapters,
  getSupportedLendingProtocols,
  getSupportedStakingProtocols,
  logSupport: logNetworkSupport,
  validate: validateNetworkDetection,
};

export default networkDetection;
