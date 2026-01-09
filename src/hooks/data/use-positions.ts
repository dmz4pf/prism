'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import type { Position } from '@/types';

export const positionsQueryKeys = {
  all: ['positions'] as const,
  list: (address: string) => ['positions', 'list', address] as const,
  detail: (id: string) => ['positions', 'detail', id] as const,
};

export function usePositions() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: positionsQueryKeys.list(address ?? ''),
    queryFn: () => api.getPositions(address!),
    enabled: isConnected && !!address,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useActivePositions() {
  const { data: positions, ...rest } = usePositions();

  return {
    ...rest,
    data: positions?.filter((p) => p.status === 'active'),
  };
}

export function usePositionsByChain(chainId: number) {
  const { data: positions, ...rest } = usePositions();

  return {
    ...rest,
    data: positions?.filter((p) => p.chainId === chainId),
  };
}

export function usePositionsByProtocol(protocol: string) {
  const { data: positions, ...rest } = usePositions();

  return {
    ...rest,
    data: positions?.filter(
      (p) => p.protocol.toLowerCase() === protocol.toLowerCase()
    ),
  };
}

interface TrackDepositParams {
  protocol: string;
  chain: string;
  token: string;
  amount: string;
  amountUsd: number;
  depositTxHash: string;
}

export function useTrackDeposit() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (params: TrackDepositParams) => api.trackDeposit(params),
    onSuccess: (newPosition) => {
      // Update positions cache
      if (address) {
        queryClient.setQueryData<Position[]>(
          positionsQueryKeys.list(address),
          (old) => (old ? [...old, newPosition] : [newPosition])
        );
      }
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: positionsQueryKeys.list(address ?? ''),
      });
    },
  });
}

export function useInvalidatePositions() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return {
    invalidate: () => {
      if (address) {
        queryClient.invalidateQueries({
          queryKey: positionsQueryKeys.list(address),
        });
      }
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: positionsQueryKeys.all,
      });
    },
  };
}

// Calculate portfolio metrics from positions
export function usePortfolioMetrics() {
  const { data: positions, isLoading, error } = usePositions();

  const metrics = positions
    ? {
        totalValue: positions.reduce((sum, p) => sum + p.amountUsd, 0),
        totalEarnings: positions.reduce((sum, p) => sum + (p.earnings ?? 0), 0),
        positionsCount: positions.filter((p) => p.status === 'active').length,
        avgApy:
          positions.length > 0
            ? positions.reduce((sum, p) => sum + p.apy, 0) / positions.length
            : 0,
        dailyYield: positions.reduce(
          (sum, p) => sum + (p.amountUsd * p.apy) / 365 / 100,
          0
        ),
        byChain: positions.reduce(
          (acc, p) => {
            if (!acc[p.chainId]) {
              acc[p.chainId] = { count: 0, value: 0 };
            }
            acc[p.chainId].count++;
            acc[p.chainId].value += p.amountUsd;
            return acc;
          },
          {} as Record<number, { count: number; value: number }>
        ),
        byProtocol: positions.reduce(
          (acc, p) => {
            if (!acc[p.protocol]) {
              acc[p.protocol] = { count: 0, value: 0 };
            }
            acc[p.protocol].count++;
            acc[p.protocol].value += p.amountUsd;
            return acc;
          },
          {} as Record<string, { count: number; value: number }>
        ),
      }
    : null;

  return { metrics, isLoading, error };
}
