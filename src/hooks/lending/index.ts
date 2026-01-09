/**
 * Lending Hooks - Index
 *
 * Re-exports all lending-related hooks.
 */

// Market hooks
export {
  useLendingMarkets,
  useLendingMarket,
  type UseLendingMarketsOptions,
  type UseLendingMarketsReturn,
} from './use-lending-markets';

// Position hooks
export {
  useLendingPositions,
  useProtocolPositions,
  usePositionByMarket,
  type UseLendingPositionsOptions,
  type UseLendingPositionsReturn,
} from './use-lending-positions';

// Action hooks
export {
  useLendingActions,
  type LendingActionType,
  type LendingActionState,
  type UseLendingActionsReturn,
} from './use-lending-actions';

// Health factor hooks
export {
  useHealthFactor,
  useSimulateHealthFactor,
  type HealthFactorStatus,
  type UseHealthFactorOptions,
  type UseHealthFactorReturn,
} from './use-health-factor';

// Routing hooks
export {
  useRoutingSuggestion,
  type UseRoutingSuggestionOptions,
  type RoutingOption,
  type UseRoutingSuggestionReturn,
} from './use-routing-suggestion';
