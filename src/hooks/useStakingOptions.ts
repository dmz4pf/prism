/**
 * useStakingOptions Hook
 * Fetches and manages staking options with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { yieldsService } from '@/services/yields';
import type { StakingOption, RiskLevel } from '@/types/staking';

interface UseStakingOptionsResult {
  options: StakingOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getOptionById: (id: string) => StakingOption | undefined;
  filterByRisk: (maxRisk: RiskLevel) => StakingOption[];
  filterByType: (type: string) => StakingOption[];
  sortByAPY: (ascending?: boolean) => StakingOption[];
  cacheInfo: { lastUpdated: string | null; expiresAt: string | null };
}

const RISK_ORDER: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function useStakingOptions(): UseStakingOptionsResult {
  const [options, setOptions] = useState<StakingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await yieldsService.getStakingOptions(forceRefresh);
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking options');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const refresh = useCallback(async () => {
    await fetchOptions(true);
  }, [fetchOptions]);

  const getOptionById = useCallback(
    (id: string) => {
      return options.find((opt) => opt.id === id);
    },
    [options]
  );

  const filterByRisk = useCallback(
    (maxRisk: RiskLevel) => {
      const maxRiskLevel = RISK_ORDER[maxRisk];
      return options.filter((opt) => RISK_ORDER[opt.risk] <= maxRiskLevel);
    },
    [options]
  );

  const filterByType = useCallback(
    (type: string) => {
      return options.filter((opt) => opt.type === type);
    },
    [options]
  );

  const sortByAPY = useCallback(
    (ascending = false) => {
      return [...options].sort((a, b) =>
        ascending ? a.apy - b.apy : b.apy - a.apy
      );
    },
    [options]
  );

  const cacheInfo = yieldsService.getCacheInfo();

  return {
    options,
    isLoading,
    error,
    refresh,
    getOptionById,
    filterByRisk,
    filterByType,
    sortByAPY,
    cacheInfo,
  };
}
