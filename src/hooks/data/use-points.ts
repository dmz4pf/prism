'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import type { PointsBalance, LeaderboardEntry } from '@/types';

export const pointsQueryKeys = {
  all: ['points'] as const,
  balance: (address: string) => ['points', 'balance', address] as const,
  leaderboard: (limit: number) => ['points', 'leaderboard', limit] as const,
  history: (address: string) => ['points', 'history', address] as const,
};

export function usePoints() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: pointsQueryKeys.balance(address ?? ''),
    queryFn: () => api.getPoints(address!),
    enabled: isConnected && !!address,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboard(limit = 100) {
  return useQuery({
    queryKey: pointsQueryKeys.leaderboard(limit),
    queryFn: () => api.getLeaderboard(limit),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUserRank() {
  const { address } = useAccount();
  const { data: leaderboard } = useLeaderboard(1000); // Fetch more to find user

  const userEntry = leaderboard?.find(
    (entry) => entry.address.toLowerCase() === address?.toLowerCase()
  );

  const rank = userEntry
    ? leaderboard!.findIndex(
        (entry) => entry.address.toLowerCase() === address?.toLowerCase()
      ) + 1
    : null;

  return {
    rank,
    entry: userEntry,
    isTopHundred: rank !== null && rank <= 100,
    isTopTen: rank !== null && rank <= 10,
  };
}

export function usePointsBreakdown() {
  const { data: points, isLoading, error } = usePoints();

  if (!points) {
    return { breakdown: null, isLoading, error };
  }

  const breakdown = {
    depositsPoints: points.depositsPoints,
    stakingPoints: points.stakingPoints,
    referralPoints: points.referralPoints,
    bonusPoints: points.bonusPoints,
    total: points.totalPoints,
    percentages: {
      deposits: (points.depositsPoints / points.totalPoints) * 100 || 0,
      staking: (points.stakingPoints / points.totalPoints) * 100 || 0,
      referral: (points.referralPoints / points.totalPoints) * 100 || 0,
      bonus: (points.bonusPoints / points.totalPoints) * 100 || 0,
    },
  };

  return { breakdown, isLoading, error };
}

export function useSeasonInfo() {
  const { data: points } = usePoints();

  if (!points) return null;

  const now = new Date();
  const seasonEnd = new Date(points.seasonEnd);
  const seasonStart = new Date(points.seasonStart);
  const totalDuration = seasonEnd.getTime() - seasonStart.getTime();
  const elapsed = now.getTime() - seasonStart.getTime();
  const remaining = seasonEnd.getTime() - now.getTime();

  return {
    season: points.season,
    multiplier: points.multiplier,
    seasonStart,
    seasonEnd,
    daysRemaining: Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24))),
    progressPercent: Math.min(100, (elapsed / totalDuration) * 100),
    isActive: now >= seasonStart && now <= seasonEnd,
  };
}

export function useInvalidatePoints() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return {
    invalidate: () => {
      if (address) {
        queryClient.invalidateQueries({
          queryKey: pointsQueryKeys.balance(address),
        });
      }
    },
    invalidateLeaderboard: () => {
      queryClient.invalidateQueries({
        queryKey: ['points', 'leaderboard'],
      });
    },
  };
}
