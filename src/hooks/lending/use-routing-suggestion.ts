/**
 * useRoutingSuggestion Hook
 *
 * Provides smart routing suggestions for lending actions.
 * Suggestions are recommendations - users can still choose any option.
 */

import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { useMemo, useState } from 'react';
import { createLendingService } from '@/services/lending';
import { LendingProtocol, RoutingSuggestion, LendingMarket } from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRoutingSuggestionOptions {
  /** Asset symbol to route (e.g., "USDC") */
  assetSymbol: string;
  /** Action type */
  action: 'supply' | 'borrow';
  /** Amount (optional, for liquidity checks) */
  amount?: bigint;
  /** Disable automatic fetching */
  enabled?: boolean;
}

export interface RoutingOption {
  /** Protocol */
  protocol: LendingProtocol;
  /** Market ID */
  marketId: string;
  /** APY (supply APY for supply, borrow APY for borrow) */
  apy: number;
  /** Whether this is the recommended option */
  isRecommended: boolean;
  /** Why this was/wasn't recommended */
  reason: string;
  /** Full market data */
  market: LendingMarket;
}

export interface UseRoutingSuggestionReturn {
  /** Recommended option */
  recommendation: RoutingOption | null;
  /** All available options (including recommended) */
  allOptions: RoutingOption[];
  /** Original suggestion with all metadata */
  suggestion: RoutingSuggestion | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Select an option (for UI state management) */
  selectOption: (protocol: LendingProtocol, marketId: string) => void;
  /** Currently selected option */
  selectedOption: RoutingOption | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useRoutingSuggestion(
  options: UseRoutingSuggestionOptions
): UseRoutingSuggestionReturn {
  const { assetSymbol, action, amount, enabled = true } = options;

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress } = useAccount();

  // Fetch routing suggestion
  const { data, isLoading, error } = useQuery<{
    suggestion: RoutingSuggestion | null;
    markets: LendingMarket[];
  }>({
    queryKey: ['routing-suggestion', assetSymbol, action, amount?.toString(), chainId],
    queryFn: async () => {
      if (!publicClient || !userAddress) {
        throw new Error('Not connected');
      }

      const service = createLendingService(publicClient, chainId);

      // Get all markets for the asset
      const markets = await service.getMarketsForAsset(assetSymbol);

      // Get routing suggestion
      let suggestion: RoutingSuggestion | null = null;

      if (action === 'supply') {
        suggestion = await service.getSupplyRoutingSuggestion(
          assetSymbol,
          amount || 0n,
          userAddress
        );
      } else {
        suggestion = await service.getBorrowRoutingSuggestion(
          assetSymbol,
          amount || 0n,
          userAddress
        );
      }

      return { suggestion, markets };
    },
    enabled: enabled && !!publicClient && !!assetSymbol,
    staleTime: 30000, // 30 seconds
  });

  // Build routing options from markets
  const { allOptions, recommendation } = useMemo(() => {
    if (!data) {
      return { allOptions: [], recommendation: null };
    }

    const { suggestion, markets } = data;

    // Filter markets based on action
    const eligibleMarkets = markets.filter((m) =>
      action === 'supply' ? m.canSupply : m.canBorrow
    );

    // Sort by APY
    const sortedMarkets = [...eligibleMarkets].sort((a, b) => {
      if (action === 'supply') {
        return b.netSupplyAPY - a.netSupplyAPY; // Higher is better
      }
      return a.netBorrowAPY - b.netBorrowAPY; // Lower is better
    });

    // Build options
    const options: RoutingOption[] = sortedMarkets.map((market, index) => {
      const isRecommended =
        suggestion?.recommended === market.protocol &&
        suggestion?.recommendedMarketId === market.id;

      let reason = '';
      if (isRecommended) {
        reason = suggestion?.reasonDetails || 'Best option available';
      } else if (suggestion) {
        const alt = suggestion.alternatives.find(
          (a) => a.protocol === market.protocol && a.marketId === market.id
        );
        reason = alt?.reason || '';
      }

      // If no suggestion, use ranking as reason
      if (!reason) {
        if (index === 0) {
          reason = action === 'supply' ? 'Highest APY' : 'Lowest rate';
        } else {
          const diff =
            action === 'supply'
              ? sortedMarkets[0].netSupplyAPY - market.netSupplyAPY
              : market.netBorrowAPY - sortedMarkets[0].netBorrowAPY;
          reason =
            action === 'supply'
              ? `${diff.toFixed(2)}% lower APY`
              : `${diff.toFixed(2)}% higher rate`;
        }
      }

      return {
        protocol: market.protocol,
        marketId: market.id,
        apy: action === 'supply' ? market.netSupplyAPY : market.netBorrowAPY,
        isRecommended,
        reason,
        market,
      };
    });

    const recommendedOption = options.find((o) => o.isRecommended) || options[0] || null;

    return { allOptions: options, recommendation: recommendedOption };
  }, [data, action]);

  // Selected option state (defaults to recommendation)
  const [selectedProtocol, setSelectedProtocol] = useState<LendingProtocol | null>(
    recommendation?.protocol || null
  );
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    recommendation?.marketId || null
  );

  // Update selected option when recommendation changes
  useMemo(() => {
    if (recommendation && !selectedProtocol) {
      setSelectedProtocol(recommendation.protocol);
      setSelectedMarketId(recommendation.marketId);
    }
  }, [recommendation, selectedProtocol]);

  const selectedOption = useMemo(() => {
    if (!selectedProtocol || !selectedMarketId) return null;
    return (
      allOptions.find(
        (o) => o.protocol === selectedProtocol && o.marketId === selectedMarketId
      ) || null
    );
  }, [allOptions, selectedProtocol, selectedMarketId]);

  const selectOption = (protocol: LendingProtocol, marketId: string) => {
    setSelectedProtocol(protocol);
    setSelectedMarketId(marketId);
  };

  return {
    recommendation,
    allOptions,
    suggestion: data?.suggestion || null,
    isLoading,
    error: error as Error | null,
    selectOption,
    selectedOption,
  };
}
