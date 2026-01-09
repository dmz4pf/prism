'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import type { Alert } from '@/types';

export const alertsQueryKeys = {
  all: ['alerts'] as const,
  list: (address: string) => ['alerts', 'list', address] as const,
};

export function useAlerts() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: alertsQueryKeys.list(address ?? ''),
    queryFn: () => api.getAlerts(address!),
    enabled: isConnected && !!address,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes
  });
}

export function useUnreadAlerts() {
  const { data: alerts, ...rest } = useAlerts();

  return {
    ...rest,
    data: alerts?.filter((a) => !a.read),
    count: alerts?.filter((a) => !a.read).length ?? 0,
  };
}

export function useAlertsByType(type: Alert['type']) {
  const { data: alerts, ...rest } = useAlerts();

  return {
    ...rest,
    data: alerts?.filter((a) => a.type === type),
  };
}

export function useCriticalAlerts() {
  const { data: alerts, ...rest } = useAlerts();

  return {
    ...rest,
    data: alerts?.filter((a) => a.severity === 'critical' && !a.read),
    hasCritical:
      alerts?.some((a) => a.severity === 'critical' && !a.read) ?? false,
  };
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (alertId: string) => api.markAlertRead(alertId),
    onMutate: async (alertId) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: alertsQueryKeys.list(address ?? ''),
      });

      const previousAlerts = queryClient.getQueryData<Alert[]>(
        alertsQueryKeys.list(address ?? '')
      );

      queryClient.setQueryData<Alert[]>(
        alertsQueryKeys.list(address ?? ''),
        (old) =>
          old?.map((alert) =>
            alert.id === alertId ? { ...alert, read: true } : alert
          )
      );

      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(
          alertsQueryKeys.list(address ?? ''),
          context.previousAlerts
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: alertsQueryKeys.list(address ?? ''),
      });
    },
  });
}

export function useMarkAllAlertsRead() {
  const { data: alerts } = useAlerts();
  const markRead = useMarkAlertRead();

  return {
    markAllRead: async () => {
      if (!alerts) return;
      const unread = alerts.filter((a) => !a.read);
      await Promise.all(unread.map((a) => markRead.mutateAsync(a.id)));
    },
    isLoading: markRead.isPending,
  };
}

export function useAlertNotifications() {
  const { data: alerts } = useAlerts();
  const { hasCritical } = useCriticalAlerts();

  const unreadCount = alerts?.filter((a) => !a.read).length ?? 0;

  return {
    unreadCount,
    hasCritical,
    shouldNotify: unreadCount > 0,
    criticalCount: alerts?.filter((a) => a.severity === 'critical' && !a.read).length ?? 0,
    warningCount: alerts?.filter((a) => a.severity === 'warning' && !a.read).length ?? 0,
  };
}

export function useInvalidateAlerts() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return {
    invalidate: () => {
      if (address) {
        queryClient.invalidateQueries({
          queryKey: alertsQueryKeys.list(address),
        });
      }
    },
  };
}
