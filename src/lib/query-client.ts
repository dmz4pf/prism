import { QueryClient } from '@tanstack/react-query';
import type { YieldFilters } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query Keys Factory
export const queryKeys = {
  yields: {
    all: ['yields'] as const,
    list: (filters: YieldFilters) => ['yields', 'list', filters] as const,
    detail: (id: string) => ['yields', 'detail', id] as const,
    featured: ['yields', 'featured'] as const,
  },
  positions: {
    all: ['positions'] as const,
    list: (address: string) => ['positions', 'list', address] as const,
    detail: (id: string) => ['positions', 'detail', id] as const,
  },
  points: {
    balance: (address: string) => ['points', 'balance', address] as const,
    leaderboard: ['points', 'leaderboard'] as const,
  },
  alerts: {
    list: (address: string) => ['alerts', 'list', address] as const,
  },
};
