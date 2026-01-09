'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, YieldFilters } from '@/lib/api';
import { useUIStore } from '@/stores/ui-store';
import type { Yield } from '@/types';

// Query keys for consistent cache management
export const yieldsQueryKeys = {
  all: ['yields'] as const,
  list: (filters: YieldFilters) => ['yields', 'list', filters] as const,
  featured: () => ['yields', 'featured'] as const,
  detail: (id: string) => ['yields', 'detail', id] as const,
};

export function useYields(filters?: YieldFilters) {
  const { selectedGoal, selectedChain, selectedCategory } = useUIStore();

  // Build filters from store state if not provided
  const effectiveFilters: YieldFilters = filters ?? {
    category: selectedGoal === 'browse' ? selectedCategory || undefined : selectedGoal,
    chain: selectedChain ? String(selectedChain) : undefined,
  };

  return useQuery({
    queryKey: yieldsQueryKeys.list(effectiveFilters),
    queryFn: () => api.getYields(effectiveFilters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    select: (data) => {
      // Apply goal-based filtering
      if (selectedGoal === 'safe') {
        return data.filter((y) => y.risk <= 3).sort((a, b) => a.risk - b.risk);
      }
      if (selectedGoal === 'max') {
        return data.sort((a, b) => b.apy - a.apy);
      }
      if (selectedGoal === 'stake') {
        return data.filter(
          (y) => y.category === 'staking' || y.category === 'liquid-staking'
        );
      }
      return data;
    },
  });
}

export function useFeaturedYields() {
  return useQuery({
    queryKey: yieldsQueryKeys.featured(),
    queryFn: () => api.getFeaturedYields(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useTopYields(limit = 5) {
  return useQuery({
    queryKey: ['yields', 'top', limit],
    queryFn: async () => {
      const yields = await api.getYields({ sortBy: 'apy' });
      return yields.slice(0, limit);
    },
    staleTime: 30 * 1000,
  });
}

export function useYieldsByProtocol(protocol: string) {
  return useQuery({
    queryKey: ['yields', 'protocol', protocol],
    queryFn: async () => {
      const yields = await api.getYields();
      return yields.filter(
        (y) => y.protocol.toLowerCase() === protocol.toLowerCase()
      );
    },
    enabled: !!protocol,
  });
}

// Hook to invalidate yields cache (useful after deposits)
export function useInvalidateYields() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: yieldsQueryKeys.all }),
    invalidateList: (filters: YieldFilters) =>
      queryClient.invalidateQueries({ queryKey: yieldsQueryKeys.list(filters) }),
  };
}

// Prefetch yields for better UX
export function usePrefetchYields() {
  const queryClient = useQueryClient();

  return {
    prefetch: (filters?: YieldFilters) => {
      queryClient.prefetchQuery({
        queryKey: yieldsQueryKeys.list(filters ?? {}),
        queryFn: () => api.getYields(filters),
        staleTime: 30 * 1000,
      });
    },
    prefetchFeatured: () => {
      queryClient.prefetchQuery({
        queryKey: yieldsQueryKeys.featured(),
        queryFn: () => api.getFeaturedYields(),
        staleTime: 60 * 1000,
      });
    },
  };
}
