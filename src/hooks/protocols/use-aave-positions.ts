'use client';

/**
 * useAavePositions - Read user's Aave V3 positions
 *
 * Fetches the user's current supply and borrow positions from Aave V3.
 * Uses the Pool contract's getUserAccountData for aggregate data
 * and reads individual aToken/debtToken balances for breakdown.
 */

import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import {
  AAVE_POOL_ADDRESS,
  AAVE_ATOKENS_BASE,
  BASE_TOKENS,
  PRIMARY_CHAIN_ID,
} from '@/contracts/addresses';
import { AAVE_POOL_ABI, ERC20_ABI } from '@/contracts/abis';
import type { AaveUserPosition, AaveSupplyPosition } from '@/types';

// Base Aave V3 reserve list with their aToken addresses
const AAVE_RESERVES_BASE = [
  {
    symbol: 'WETH',
    asset: BASE_TOKENS.WETH,
    aToken: AAVE_ATOKENS_BASE.aWETH,
    decimals: 18,
  },
  {
    symbol: 'USDC',
    asset: BASE_TOKENS.USDC,
    aToken: AAVE_ATOKENS_BASE.aUSDC,
    decimals: 6,
  },
  {
    symbol: 'cbETH',
    asset: BASE_TOKENS.cbETH,
    aToken: AAVE_ATOKENS_BASE.acbETH,
    decimals: 18,
  },
] as const;

interface UseAavePositionsReturn {
  position: AaveUserPosition | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasPosition: boolean;
}

export function useAavePositions(): UseAavePositionsReturn {
  const { address, chainId } = useAccount();
  const poolAddress = chainId ? AAVE_POOL_ADDRESS[chainId] : undefined;
  const isSupported = chainId === PRIMARY_CHAIN_ID && !!poolAddress;

  // Read aggregate user account data
  const {
    data: accountData,
    isLoading: isLoadingAccount,
    error: accountError,
    refetch: refetchAccount,
  } = useReadContract({
    address: poolAddress,
    abi: AAVE_POOL_ABI,
    functionName: 'getUserAccountData',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isSupported,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  });

  // Build contracts array for reading aToken balances
  const aTokenContracts = useMemo(() => {
    if (!address || !isSupported) return [];

    return AAVE_RESERVES_BASE.filter(r => r.aToken !== '0x0000000000000000000000000000000000000000')
      .map((reserve) => ({
        address: reserve.aToken as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf' as const,
        args: [address] as const,
      }));
  }, [address, isSupported]);

  // Read all aToken balances in a single multicall
  const {
    data: aTokenBalances,
    isLoading: isLoadingBalances,
    refetch: refetchBalances,
  } = useReadContracts({
    contracts: aTokenContracts,
    query: {
      enabled: aTokenContracts.length > 0 && !!address && isSupported,
      staleTime: 30_000,
    },
  });

  // Parse account data
  const parsedAccountData = useMemo(() => {
    if (!accountData) return null;

    // Account data returns in 1e8 (8 decimals) for USD values, 1e18 for health factor
    const [
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    ] = accountData as [bigint, bigint, bigint, bigint, bigint, bigint];

    return {
      totalCollateralUsd: Number(formatUnits(totalCollateralBase, 8)),
      totalDebtUsd: Number(formatUnits(totalDebtBase, 8)),
      availableBorrowsUsd: Number(formatUnits(availableBorrowsBase, 8)),
      currentLiquidationThreshold: Number(currentLiquidationThreshold) / 100, // In percentage
      ltv: Number(ltv) / 100, // In percentage
      healthFactor: totalDebtBase > 0n
        ? Number(formatUnits(healthFactor, 18))
        : Infinity,
    };
  }, [accountData]);

  // Parse aToken balances into supply positions
  const supplies = useMemo((): AaveSupplyPosition[] => {
    if (!aTokenBalances || !parsedAccountData) return [];

    const validReserves = AAVE_RESERVES_BASE.filter(
      r => r.aToken !== '0x0000000000000000000000000000000000000000'
    );

    const positions: AaveSupplyPosition[] = [];

    aTokenBalances.forEach((result, index) => {
      if (result.status !== 'success' || !result.result) return;

      const reserve = validReserves[index];
      if (!reserve) return;

      const balanceRaw = result.result as bigint;
      if (balanceRaw === 0n) return;

      const balance = formatUnits(balanceRaw, reserve.decimals);

      // Estimate USD value (simplified - in production use price oracles)
      let balanceUsd = 0;
      if (reserve.symbol === 'USDC') {
        balanceUsd = parseFloat(balance);
      } else if (reserve.symbol === 'WETH' || reserve.symbol === 'cbETH') {
        // Use approximate ETH price
        balanceUsd = parseFloat(balance) * 3000;
      }

      positions.push({
        asset: reserve.symbol as string,
        assetAddress: reserve.asset,
        aTokenAddress: reserve.aToken,
        balance,
        balanceRaw,
        balanceUsd,
        supplyApy: 0, // Would need to fetch from reserve data
        isCollateral: true, // Simplified - would check user config
      });
    });

    return positions;
  }, [aTokenBalances, parsedAccountData]);

  // Build complete position
  const position = useMemo<AaveUserPosition | null>(() => {
    if (!parsedAccountData) return null;

    return {
      ...parsedAccountData,
      supplies,
      borrows: [], // Would parse debt token balances similarly
    };
  }, [parsedAccountData, supplies]);

  // Check if user has any position
  const hasPosition = useMemo(() => {
    if (!position) return false;
    return position.totalCollateralUsd > 0 || position.totalDebtUsd > 0;
  }, [position]);

  // Combined refetch
  const refetch = () => {
    refetchAccount();
    refetchBalances();
  };

  return {
    position,
    isLoading: isLoadingAccount || isLoadingBalances,
    error: accountError as Error | null,
    refetch,
    hasPosition,
  };
}
