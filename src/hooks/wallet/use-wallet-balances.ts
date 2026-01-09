'use client';

/**
 * useWalletBalances - Token Balance Hook for Smart Wallet
 *
 * Uses wagmi's useBalance hook with smart wallet address explicitly passed.
 * This ensures we get the smart wallet's balance, not the EOA's balance.
 *
 * NOW USES LIVE PRICES from Chainlink/CoinGecko instead of hardcoded values.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBalance, usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import type { TokenBalance, UseWalletBalancesReturn } from '@/types/wallet';
import { useSmartWallet } from './use-smart-wallet';
import { formatTokenAmount } from '@/lib/tokens';
import { useLiveEthPrice } from '@/hooks/useLivePrice';

// Base chain token addresses for balance checking
const BASE_TOKENS_TO_CHECK = [
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as Address, symbol: 'USDbC', name: 'USD Base Coin', decimals: 6 },
  { address: '0x4200000000000000000000000000000000000006' as Address, symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address, symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
];

// REMOVED: const ETH_PRICE_USD = 3500;
// Now using useLiveEthPrice() hook for real-time prices

/**
 * Hook to fetch and manage token balances for the smart wallet
 * Uses wagmi's useBalance for reliable balance fetching
 * Uses LIVE ETH prices from Chainlink/CoinGecko
 */
export function useWalletBalances(): UseWalletBalancesReturn {
  const { smartWallet } = useSmartWallet();
  const publicClient = usePublicClient();

  // Get LIVE ETH price from Chainlink/CoinGecko
  const { ethPrice, isLoading: isPriceLoading } = useLiveEthPrice();

  // Fetch native ETH balance for the smart wallet address
  const {
    data: ethBalanceData,
    isLoading: isLoadingEth,
    refetch: refetchEth,
  } = useBalance({
    address: smartWallet?.address,
    query: {
      enabled: !!smartWallet?.address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // State for ERC20 balances
  const [erc20Balances, setErc20Balances] = useState<TokenBalance[]>([]);
  const [isLoadingErc20, setIsLoadingErc20] = useState(false);

  // Fetch ERC20 balances using public client
  const fetchErc20Balances = useCallback(async () => {
    if (!smartWallet?.address || !publicClient) return;

    setIsLoadingErc20(true);
    const balances: TokenBalance[] = [];

    try {
      for (const token of BASE_TOKENS_TO_CHECK) {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ type: 'uint256' }],
              stateMutability: 'view',
            }],
            functionName: 'balanceOf',
            args: [smartWallet.address],
          });

          const balanceRaw = balance as bigint;
          if (balanceRaw > 0n) {
            const balanceNum = Number(balanceRaw) / Math.pow(10, token.decimals);

            // Use LIVE prices - stablecoins are $1, WETH uses live ETH price
            let priceUsd = 0;
            if (token.symbol === 'USDC' || token.symbol === 'USDbC' || token.symbol === 'DAI') {
              priceUsd = 1;
            } else if (token.symbol === 'WETH') {
              priceUsd = ethPrice || 0; // LIVE ETH PRICE
            }

            balances.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              balanceRaw,
              balance: formatTokenAmount(balanceRaw, token.decimals),
              balanceUsd: balanceNum * priceUsd,
              priceUsd,
            });
          }
        } catch (err) {
          // Token might not exist on this chain, skip
          console.debug(`Failed to fetch ${token.symbol} balance:`, err);
        }
      }

      setErc20Balances(balances);
    } catch (err) {
      console.error('Failed to fetch ERC20 balances:', err);
    } finally {
      setIsLoadingErc20(false);
    }
  }, [smartWallet?.address, publicClient, ethPrice]);

  // Fetch ERC20 balances when smart wallet changes OR when ETH price updates
  useEffect(() => {
    if (ethPrice > 0) {
      fetchErc20Balances();
    }
  }, [fetchErc20Balances, ethPrice]);

  // Combine ETH and ERC20 balances
  const balances = useMemo<TokenBalance[]>(() => {
    const result: TokenBalance[] = [];

    // Add ETH balance with LIVE price
    if (ethBalanceData && ethPrice > 0) {
      const ethBalanceNum = Number(ethBalanceData.value) / 1e18;
      result.push({
        address: null,
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        balanceRaw: ethBalanceData.value,
        balance: formatTokenAmount(ethBalanceData.value, 18),
        balanceUsd: ethBalanceNum * ethPrice, // LIVE PRICE
        priceUsd: ethPrice, // LIVE PRICE
      });
    }

    // Add ERC20 balances
    result.push(...erc20Balances);

    // Sort by USD value
    result.sort((a, b) => b.balanceUsd - a.balanceUsd);

    return result;
  }, [ethBalanceData, erc20Balances, ethPrice]);

  // Calculate total value
  const totalValueUsd = useMemo(() => {
    return balances.reduce((sum, b) => sum + b.balanceUsd, 0);
  }, [balances]);

  // Refetch all balances
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchEth(),
      fetchErc20Balances(),
    ]);
  }, [refetchEth, fetchErc20Balances]);

  return {
    balances,
    totalValueUsd,
    isLoading: isLoadingEth || isLoadingErc20 || isPriceLoading,
    error: null,
    refetch,
  };
}

/**
 * Get a specific token balance by address
 */
export function useTokenBalance(tokenAddress: Address | null): TokenBalance | undefined {
  const { balances } = useWalletBalances();

  return balances.find((b) =>
    tokenAddress === null
      ? b.address === null
      : b.address?.toLowerCase() === tokenAddress.toLowerCase()
  );
}

/**
 * Get ETH balance specifically
 */
export function useEthBalance(): TokenBalance | undefined {
  return useTokenBalance(null);
}
