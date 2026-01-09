/**
 * useLivePrice Hook
 *
 * React hook for fetching live prices from Chainlink/CoinGecko.
 * Works on both mainnet and testnet.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { livePriceService, type LivePrice } from '@/services/live-prices';

// ============================================
// TYPES
// ============================================

export interface UseLivePriceResult {
  price: LivePrice | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseLivePricesResult {
  prices: Record<string, LivePrice>;
  ethPrice: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  toUsd: (amount: number, symbol: string) => number;
  getPrice: (symbol: string) => number;
}

// ============================================
// HOOKS
// ============================================

/**
 * Get live price for a single token
 */
export function useLivePrice(symbol: string): UseLivePriceResult {
  const queryClient = useQueryClient();

  const {
    data: price,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['livePrice', symbol],
    queryFn: () => livePriceService.getTokenPrice(symbol),
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval: 60_000, // Auto-refresh every minute
    retry: 2,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['livePrice', symbol] });
  }, [queryClient, symbol]);

  return {
    price: price ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Get live ETH price specifically
 */
export function useLiveEthPrice(): {
  ethPrice: number;
  isLoading: boolean;
  isError: boolean;
  source: string;
  refetch: () => Promise<void>;
} {
  const { price, isLoading, isError, refetch } = useLivePrice('ETH');

  return {
    ethPrice: price?.priceUsd ?? 0,
    isLoading,
    isError,
    source: price?.source ?? 'unknown',
    refetch,
  };
}

/**
 * Get all live prices at once
 */
export function useLivePrices(): UseLivePricesResult {
  const queryClient = useQueryClient();

  const {
    data: prices,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['livePrices', 'all'],
    queryFn: () => livePriceService.getAllPrices(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['livePrices'] });
  }, [queryClient]);

  const toUsd = useCallback(
    (amount: number, symbol: string): number => {
      if (!prices) return 0;
      const price = prices[symbol];
      if (!price) return 0;
      return amount * price.priceUsd;
    },
    [prices]
  );

  const getPrice = useCallback(
    (symbol: string): number => {
      if (!prices) return 0;
      return prices[symbol]?.priceUsd ?? 0;
    },
    [prices]
  );

  return {
    prices: prices ?? {},
    ethPrice: prices?.ETH?.priceUsd ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    toUsd,
    getPrice,
  };
}

/**
 * Get price with formatted USD string
 */
export function useLivePriceFormatted(symbol: string): {
  price: number;
  formatted: string;
  isLoading: boolean;
} {
  const { price, isLoading } = useLivePrice(symbol);

  const priceUsd = price?.priceUsd ?? 0;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceUsd);

  return {
    price: priceUsd,
    formatted,
    isLoading,
  };
}
