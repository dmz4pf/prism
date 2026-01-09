/**
 * Protocol Adapters Index
 * Exports all protocol adapters for ETH staking integration
 */

// Base adapter
export { BaseProtocolAdapter } from './base-adapter';

// Tier 1 Adapters
export { LidoAdapter, lidoAdapter } from './lido-adapter';
export { CbETHAdapter, cbETHAdapter } from './cbeth-adapter';
export { AaveAdapter, aaveAdapter } from './aave-adapter';
export { AerodromeAdapter, aerodromeAdapter } from './aerodrome-adapter';

// Tier 2 Adapters
export { SuperOETHAdapter, superOETHAdapter } from './superoeth-adapter';
export { WeETHAdapter, weETHAdapter } from './weeth-adapter';

// Adapter registry for dynamic lookup
import { lidoAdapter } from './lido-adapter';
import { cbETHAdapter } from './cbeth-adapter';
import { aaveAdapter } from './aave-adapter';
import { superOETHAdapter } from './superoeth-adapter';
import { weETHAdapter } from './weeth-adapter';
import type { ProtocolAdapter } from '@/types/staking';

export const PROTOCOL_ADAPTERS: Record<string, ProtocolAdapter> = {
  wsteth: lidoAdapter,
  lido: lidoAdapter,
  cbeth: cbETHAdapter,
  coinbase: cbETHAdapter,
  'aave-weth': aaveAdapter,
  aave: aaveAdapter,
  superoethb: superOETHAdapter,
  superoeth: superOETHAdapter,
  origin: superOETHAdapter,
  weeth: weETHAdapter,
  etherfi: weETHAdapter,
};

/**
 * Get adapter by protocol ID or name
 */
export function getAdapter(protocolId: string): ProtocolAdapter | null {
  return PROTOCOL_ADAPTERS[protocolId.toLowerCase()] || null;
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): ProtocolAdapter[] {
  return [
    lidoAdapter,
    cbETHAdapter,
    aaveAdapter,
    superOETHAdapter,
    weETHAdapter,
  ];
}

/**
 * Get adapters by type
 */
export function getAdaptersByType(type: string): ProtocolAdapter[] {
  return getAllAdapters().filter((adapter) => adapter.type === type);
}
