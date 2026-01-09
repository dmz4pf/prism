/**
 * useHealthFactor Hook
 *
 * Monitors and simulates health factor for lending positions.
 */

import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { createLendingService } from '@/services/lending';
import { LendingProtocol, LendingActionParams } from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export interface HealthFactorStatus {
  /** Health factor value */
  value: number;
  /** Status level */
  status: 'safe' | 'warning' | 'danger' | 'liquidatable';
  /** Color for UI */
  color: string;
  /** User-friendly message */
  message: string;
  /** Whether user should take action */
  actionRequired: boolean;
}

export interface UseHealthFactorOptions {
  /** Specific protocol to monitor */
  protocol?: LendingProtocol;
  /** Alert threshold (default 1.2) */
  warningThreshold?: number;
  /** Danger threshold (default 1.1) */
  dangerThreshold?: number;
  /** Refresh interval in ms */
  refetchInterval?: number;
}

export interface UseHealthFactorReturn {
  /** Health factor for all protocols (lowest) */
  globalHealthFactor: number;
  /** Health factor by protocol */
  byProtocol: Record<LendingProtocol, number>;
  /** Protocol with lowest health factor */
  riskiestProtocol: LendingProtocol | null;
  /** Health factor status */
  status: HealthFactorStatus;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Simulate health factor after an action */
  simulate: (
    protocol: LendingProtocol,
    action: LendingActionParams
  ) => Promise<number>;
}

// =============================================================================
// HELPERS
// =============================================================================

function getHealthFactorStatus(
  hf: number,
  warningThreshold: number,
  dangerThreshold: number
): HealthFactorStatus {
  if (!isFinite(hf) || hf === 0) {
    return {
      value: Infinity,
      status: 'safe',
      color: 'text-gray-400',
      message: 'No borrows',
      actionRequired: false,
    };
  }

  if (hf < 1) {
    return {
      value: hf,
      status: 'liquidatable',
      color: 'text-red-500',
      message: 'Position can be liquidated!',
      actionRequired: true,
    };
  }

  if (hf < dangerThreshold) {
    return {
      value: hf,
      status: 'danger',
      color: 'text-orange-500',
      message: 'High liquidation risk. Add collateral or repay debt.',
      actionRequired: true,
    };
  }

  if (hf < warningThreshold) {
    return {
      value: hf,
      status: 'warning',
      color: 'text-yellow-500',
      message: 'Monitor closely. Consider adding collateral.',
      actionRequired: false,
    };
  }

  return {
    value: hf,
    status: 'safe',
    color: 'text-green-500',
    message: 'Position is healthy.',
    actionRequired: false,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useHealthFactor(
  options: UseHealthFactorOptions = {}
): UseHealthFactorReturn {
  const {
    protocol,
    warningThreshold = 1.5,
    dangerThreshold = 1.2,
    refetchInterval = 15000, // 15 seconds
  } = options;

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress, isConnected } = useAccount();

  // Fetch health factors for all protocols
  const { data, isLoading, error } = useQuery<{
    byProtocol: Record<LendingProtocol, number>;
    lowest: { hf: number; protocol: LendingProtocol | null };
  }>({
    queryKey: ['health-factors', userAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !userAddress) {
        throw new Error('Not connected');
      }

      const service = createLendingService(publicClient, chainId);
      const protocols: LendingProtocol[] = ['aave', 'morpho', 'compound', 'moonwell'];

      const byProtocol: Record<LendingProtocol, number> = {
        aave: Infinity,
        morpho: Infinity,
        compound: Infinity,
        moonwell: Infinity,
      };

      let lowestHF = Infinity;
      let lowestProtocol: LendingProtocol | null = null;

      await Promise.all(
        protocols.map(async (p) => {
          try {
            const hf = await service.getHealthFactor(p, userAddress);
            byProtocol[p] = hf;

            if (hf < lowestHF) {
              lowestHF = hf;
              lowestProtocol = p;
            }
          } catch (err) {
            // Keep Infinity for protocols with errors
          }
        })
      );

      return {
        byProtocol,
        lowest: { hf: lowestHF, protocol: lowestProtocol },
      };
    },
    enabled: !!publicClient && isConnected && !!userAddress,
    staleTime: 10000,
    refetchInterval,
  });

  // Compute status
  const status = useMemo(() => {
    const hf = protocol
      ? data?.byProtocol[protocol] ?? Infinity
      : data?.lowest.hf ?? Infinity;

    return getHealthFactorStatus(hf, warningThreshold, dangerThreshold);
  }, [data, protocol, warningThreshold, dangerThreshold]);

  // Simulate function
  const simulate = async (
    targetProtocol: LendingProtocol,
    action: LendingActionParams
  ): Promise<number> => {
    if (!publicClient || !userAddress) {
      return Infinity;
    }

    const service = createLendingService(publicClient, chainId);
    return service.simulateHealthFactor(targetProtocol, userAddress, action);
  };

  return {
    globalHealthFactor: data?.lowest.hf ?? Infinity,
    byProtocol: data?.byProtocol ?? {
      aave: Infinity,
      morpho: Infinity,
      compound: Infinity,
      moonwell: Infinity,
    },
    riskiestProtocol: data?.lowest.protocol ?? null,
    status,
    isLoading,
    error: error as Error | null,
    simulate,
  };
}

// =============================================================================
// HEALTH FACTOR SIMULATION HOOK
// =============================================================================

export function useSimulateHealthFactor(
  protocol: LendingProtocol,
  action: LendingActionParams | null
): {
  simulatedHF: number | null;
  status: HealthFactorStatus | null;
  isSimulating: boolean;
} {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useQuery<number>({
    queryKey: ['simulate-hf', protocol, action, userAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !userAddress || !action) {
        return Infinity;
      }

      const service = createLendingService(publicClient, chainId);
      return service.simulateHealthFactor(protocol, userAddress, action);
    },
    enabled: !!publicClient && !!userAddress && !!action,
    staleTime: 5000,
  });

  const status = useMemo(() => {
    if (data === undefined) return null;
    return getHealthFactorStatus(data, 1.5, 1.2);
  }, [data]);

  return {
    simulatedHF: data ?? null,
    status,
    isSimulating: isLoading,
  };
}
