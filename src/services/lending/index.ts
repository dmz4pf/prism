/**
 * Lending Services - Index
 *
 * Re-exports all lending-related services.
 */

// Main service
export {
  LendingService,
  getLendingService,
  createLendingService,
  type AggregatedMarkets,
  type AggregatedPositions,
} from './lending-service';

// Adapters
export {
  BaseLendingAdapter,
  AaveAdapter,
  MorphoAdapter,
  CompoundAdapter,
  MoonwellAdapter,
  createAdapter,
  createAllAdapters,
  createAaveAdapter,
  createMorphoAdapter,
  createCompoundAdapter,
  createMoonwellAdapter,
  SUPPORTED_PROTOCOLS,
  PROTOCOL_INFO,
  isLendingNetworkSupported,
  getSupportedProtocolsForChain,
} from './adapters';
