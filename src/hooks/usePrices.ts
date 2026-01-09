/**
 * usePrices Hook
 * Fetches and manages token prices
 */

import { useState, useEffect, useCallback } from 'react';
import { pricesService } from '@/services/prices';
import type { PriceData } from '@/types/staking';

interface UsePricesResult {
  prices: Record<string, PriceData>;
  ethPrice: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toUSD: (amount: string, tokenSymbol: string) => number;
  fromUSD: (usdAmount: number, tokenSymbol: string) => number;
  cacheInfo: { lastUpdated: Date | null; isValid: boolean };
}

export function usePrices(): UsePricesResult {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [ethPrice, setEthPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [allPrices, eth] = await Promise.all([
        pricesService.getAllPrices(),
        pricesService.getETHPrice(),
      ]);
      setPrices(allPrices);
      setEthPrice(eth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();

    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const refresh = useCallback(async () => {
    await pricesService.refresh();
    await fetchPrices();
  }, [fetchPrices]);

  const toUSD = useCallback(
    (amount: string, tokenSymbol: string) => {
      const price = prices[tokenSymbol];
      if (!price) return 0;
      return parseFloat(amount) * price.priceUsd;
    },
    [prices]
  );

  const fromUSD = useCallback(
    (usdAmount: number, tokenSymbol: string) => {
      const price = prices[tokenSymbol];
      if (!price || price.priceUsd === 0) return 0;
      return usdAmount / price.priceUsd;
    },
    [prices]
  );

  const cacheInfo = pricesService.getCacheInfo();

  return {
    prices,
    ethPrice,
    isLoading,
    error,
    refresh,
    toUSD,
    fromUSD,
    cacheInfo,
  };
}
