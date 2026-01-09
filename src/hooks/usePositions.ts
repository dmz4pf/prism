/**
 * usePositions Hook
 * Fetches and manages user's staking positions across all protocols
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { StakingPosition, AavePosition } from '@/types/staking';
import { getAllAdapters } from '@/services/adapters';
import { aaveAdapter } from '@/services/adapters';

interface UsePositionsResult {
  positions: StakingPosition[];
  aavePosition: AavePosition | null;
  totalValueUsd: number;
  totalEarnedUsd: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getPositionById: (id: string) => StakingPosition | undefined;
  getPositionByProtocol: (protocol: string) => StakingPosition | undefined;
}

export function usePositions(): UsePositionsResult {
  const { address } = useAccount();
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [aavePosition, setAavePosition] = useState<AavePosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setAavePosition(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const adapters = getAllAdapters();

      // Fetch positions from all adapters in parallel
      const positionPromises = adapters.map(async (adapter) => {
        try {
          return await adapter.getPosition(address);
        } catch {
          console.warn(`Failed to fetch position from ${adapter.name}`);
          return null;
        }
      });

      const results = await Promise.all(positionPromises);
      const validPositions = results.filter(
        (pos): pos is StakingPosition => pos !== null
      );

      setPositions(validPositions);

      // Get detailed Aave position separately
      try {
        const aave = await aaveAdapter.getPosition(address);
        setAavePosition(aave as AavePosition | null);
      } catch {
        console.warn('Failed to fetch Aave position');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const refresh = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  const getPositionById = useCallback(
    (id: string) => {
      return positions.find((pos) => pos.id === id);
    },
    [positions]
  );

  const getPositionByProtocol = useCallback(
    (protocol: string) => {
      return positions.find(
        (pos) => pos.protocol.toLowerCase() === protocol.toLowerCase()
      );
    },
    [positions]
  );

  // Calculate totals
  const totalValueUsd = positions.reduce((sum, pos) => sum + pos.balanceUsd, 0);
  const totalEarnedUsd = positions.reduce(
    (sum, pos) => sum + pos.earnedTotalUsd,
    0
  );

  return {
    positions,
    aavePosition,
    totalValueUsd,
    totalEarnedUsd,
    isLoading,
    error,
    refresh,
    getPositionById,
    getPositionByProtocol,
  };
}
