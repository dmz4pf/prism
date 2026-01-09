'use client';

/**
 * usePrismWallet - Unified Wallet Hook
 *
 * This hook provides a unified interface for wallet functionality in PRISM.
 * It wraps the smart wallet hook and provides backward compatibility.
 *
 * Flow:
 * 1. User connects their EOA (MetaMask, etc.) via RainbowKit/wagmi
 * 2. User clicks "Create PRISM Wallet" to create a smart wallet
 * 3. Smart wallet is created and stored (counterfactual deployment)
 * 4. User can then execute transactions through the smart wallet
 *
 * Until the user creates a smart wallet, they can still view balances
 * and interact with the app in read-only mode.
 */

import { useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { PRIMARY_CHAIN_ID, BASE_TOKENS } from '@/contracts/addresses';
import type { PrismWallet, TokenBalance, PrismSmartWallet } from '@/types';
import { usePrismSmartWallet } from './use-prism-smart-wallet';

export interface UsePrismWalletReturn {
  // EOA State
  wallet: PrismWallet | null;
  prismWalletAddress: Address | null;
  hasWallet: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isPending: boolean;
  chainId: number | undefined;
  isCorrectNetwork: boolean;

  // Smart Wallet State (new)
  smartWallet: PrismSmartWallet | null;
  smartWalletAddress: Address | null;
  hasSmartWallet: boolean;
  isSmartWalletDeployed: boolean;
  isCreatingSmartWallet: boolean;
  smartWalletError: Error | null;

  // Balances
  ethBalance: string;
  ethBalanceRaw: bigint;
  ethBalanceUsd: number;
  tokenBalances: TokenBalance[];
  totalValueUsd: number;

  // Actions
  createWallet: () => Promise<void>;
  createSmartWallet: () => Promise<Address>;
  refetchBalances: () => void;

  // Smart Wallet Actions
  sendTransaction: (to: Address, value: bigint, data: `0x${string}`) => Promise<`0x${string}`>;
  sendBatchedTransactions: (calls: Array<{ to: Address; value: bigint; data: `0x${string}` }>) => Promise<`0x${string}`>;

  // Feature Flags
  supportsGasSponsorship: boolean;
  supportsBatching: boolean;
}

export function usePrismWallet(): UsePrismWalletReturn {
  const { address, isConnected, chainId } = useAccount();

  // Smart wallet hook
  const {
    smartWallet,
    smartWalletAddress,
    hasSmartWallet,
    isDeployed: isSmartWalletDeployed,
    isCreating: isCreatingSmartWallet,
    error: smartWalletError,
    createSmartWallet,
    sendTransaction,
    sendBatchedTransactions,
    supportsGasSponsorship,
    supportsBatching,
  } = usePrismSmartWallet();

  // Check if on correct network
  const isCorrectNetwork = chainId === PRIMARY_CHAIN_ID;

  // Get native ETH balance
  const {
    data: ethBalanceData,
    isLoading: isLoadingEth,
    refetch: refetchEthBalance,
  } = useBalance({
    address,
    query: {
      enabled: !!address && isConnected,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  });

  // Get USDC balance
  const { data: usdcBalanceData, refetch: refetchUsdcBalance } = useBalance({
    address,
    token: BASE_TOKENS.USDC,
    query: {
      enabled: !!address && isConnected && isCorrectNetwork,
      staleTime: 30_000,
    },
  });

  // Get WETH balance
  const { data: wethBalanceData, refetch: refetchWethBalance } = useBalance({
    address,
    token: BASE_TOKENS.WETH,
    query: {
      enabled: !!address && isConnected && isCorrectNetwork,
      staleTime: 30_000,
    },
  });

  // Fetch LIVE ETH price from Chainlink/CoinGecko via LivePriceService
  const { data: ethPrice, isLoading: isPriceLoading } = useQuery({
    queryKey: ['liveEthPrice'],
    queryFn: async () => {
      const { livePriceService } = await import('@/services/live-prices');
      const price = await livePriceService.getEthPrice();
      return price.priceUsd;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  // Calculate balances
  const ethBalance = useMemo(() => {
    if (!ethBalanceData) return '0';
    return ethBalanceData.formatted;
  }, [ethBalanceData]);

  const ethBalanceRaw = useMemo(() => {
    return ethBalanceData?.value ?? 0n;
  }, [ethBalanceData]);

  const ethBalanceUsd = useMemo(() => {
    if (!ethBalanceData || !ethPrice) return 0;
    return parseFloat(ethBalanceData.formatted) * ethPrice;
  }, [ethBalanceData, ethPrice]);

  // Build token balances array
  const tokenBalances = useMemo<TokenBalance[]>(() => {
    const balances: TokenBalance[] = [];

    if (usdcBalanceData && parseFloat(usdcBalanceData.formatted) > 0) {
      balances.push({
        symbol: 'USDC',
        name: 'USD Coin',
        address: BASE_TOKENS.USDC,
        decimals: 6,
        balance: usdcBalanceData.formatted,
        balanceRaw: usdcBalanceData.value,
        balanceUsd: parseFloat(usdcBalanceData.formatted),
        price: 1,
      });
    }

    if (wethBalanceData && parseFloat(wethBalanceData.formatted) > 0 && ethPrice) {
      balances.push({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: BASE_TOKENS.WETH,
        decimals: 18,
        balance: wethBalanceData.formatted,
        balanceRaw: wethBalanceData.value,
        balanceUsd: parseFloat(wethBalanceData.formatted) * ethPrice, // LIVE PRICE
        price: ethPrice, // LIVE PRICE
      });
    }

    return balances;
  }, [usdcBalanceData, wethBalanceData, ethPrice]);

  // Calculate total USD value
  const totalValueUsd = useMemo(() => {
    const ethValue = ethBalanceUsd;
    const tokenValue = tokenBalances.reduce((sum, t) => sum + t.balanceUsd, 0);
    return ethValue + tokenValue;
  }, [ethBalanceUsd, tokenBalances]);

  // Construct wallet object
  // If smart wallet exists, use that address; otherwise fall back to EOA
  const wallet = useMemo<PrismWallet | null>(() => {
    if (!address || !isConnected) return null;

    return {
      address: smartWalletAddress ?? address,
      owner: address,
      createdAt: smartWallet?.createdAt ?? new Date().toISOString(),
      totalValueUsd,
      isDeployed: hasSmartWallet ? isSmartWalletDeployed : true,
    };
  }, [address, isConnected, smartWalletAddress, smartWallet, totalValueUsd, hasSmartWallet, isSmartWalletDeployed]);

  // Refetch all balances
  const refetchBalances = () => {
    refetchEthBalance();
    refetchUsdcBalance();
    refetchWethBalance();
  };

  // Create wallet - now creates a smart wallet
  const createWallet = async () => {
    await createSmartWallet();
  };

  return {
    // EOA State
    wallet,
    prismWalletAddress: smartWalletAddress ?? address ?? null,
    hasWallet: isConnected,
    isConnected,
    isLoading: isLoadingEth,
    isPending: isCreatingSmartWallet,
    chainId,
    isCorrectNetwork,

    // Smart Wallet State
    smartWallet,
    smartWalletAddress,
    hasSmartWallet,
    isSmartWalletDeployed,
    isCreatingSmartWallet,
    smartWalletError,

    // Balances
    ethBalance,
    ethBalanceRaw,
    ethBalanceUsd,
    tokenBalances,
    totalValueUsd,

    // Actions
    createWallet,
    createSmartWallet,
    refetchBalances,

    // Smart Wallet Actions
    sendTransaction,
    sendBatchedTransactions,

    // Feature Flags
    supportsGasSponsorship,
    supportsBatching,
  };
}
