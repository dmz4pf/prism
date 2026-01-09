'use client';

/**
 * useNetworkSwitch - Handle network switching for PRISM
 *
 * This hook provides utilities for checking if the user is on
 * the correct network and prompting them to switch if not.
 */

import { useCallback, useMemo } from 'react';
import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { base, baseSepolia, mainnet, arbitrum, optimism } from 'wagmi/chains';
import { PRIMARY_CHAIN_ID, CHAIN_IDS } from '@/contracts/addresses';
import type { SupportedNetwork } from '@/types';

// Network configurations
const NETWORKS: Record<number, SupportedNetwork> = {
  [base.id]: {
    chainId: base.id,
    name: 'Base',
    shortName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    isTestnet: false,
  },
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'Base Sep',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
  [mainnet.id]: {
    chainId: mainnet.id,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false,
  },
  [arbitrum.id]: {
    chainId: arbitrum.id,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorerUrl: 'https://arbiscan.io',
    isTestnet: false,
  },
  [optimism.id]: {
    chainId: optimism.id,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
  },
};

interface UseNetworkSwitchReturn {
  // Current state
  currentChainId: number | undefined;
  currentNetwork: SupportedNetwork | null;
  isCorrectNetwork: boolean;
  isConnected: boolean;

  // Target network
  targetNetwork: SupportedNetwork;
  targetChainId: number;

  // Switch action
  switchToTarget: () => Promise<void>;
  switchToChain: (chainId: number) => Promise<void>;
  isSwitching: boolean;
  error: Error | null;

  // Utilities
  getNetworkName: (chainId: number) => string;
  getBlockExplorerUrl: (chainId: number, type: 'tx' | 'address', hash: string) => string;
  supportedNetworks: SupportedNetwork[];
}

export function useNetworkSwitch(): UseNetworkSwitchReturn {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending, error } = useSwitchChain();

  // Get current network info
  const currentNetwork = useMemo(() => {
    if (!chainId) return null;
    return NETWORKS[chainId] || null;
  }, [chainId]);

  // Get target network (primary network for PRISM)
  const targetNetwork = useMemo(() => {
    return NETWORKS[PRIMARY_CHAIN_ID];
  }, []);

  // Check if on correct network
  const isCorrectNetwork = chainId === PRIMARY_CHAIN_ID;

  // Switch to target network
  const switchToTarget = useCallback(async () => {
    if (!switchChainAsync) {
      console.error('switchChainAsync not available');
      return;
    }
    try {
      await switchChainAsync({ chainId: PRIMARY_CHAIN_ID });
    } catch (err) {
      console.error('Failed to switch network:', err);
      throw err;
    }
  }, [switchChainAsync]);

  // Switch to specific chain
  const switchToChain = useCallback(async (targetChainId: number) => {
    if (!switchChainAsync) return;
    await switchChainAsync({ chainId: targetChainId });
  }, [switchChainAsync]);

  // Get network name by chain ID
  const getNetworkName = useCallback((id: number): string => {
    return NETWORKS[id]?.name || 'Unknown Network';
  }, []);

  // Build block explorer URL
  const getBlockExplorerUrl = useCallback(
    (id: number, type: 'tx' | 'address', hash: string): string => {
      const network = NETWORKS[id];
      if (!network) return '#';
      const prefix = type === 'tx' ? 'tx' : 'address';
      return `${network.blockExplorerUrl}/${prefix}/${hash}`;
    },
    []
  );

  // List of supported networks
  const supportedNetworks = useMemo(() => {
    return Object.values(NETWORKS).filter((n) => !n.isTestnet);
  }, []);

  return {
    currentChainId: chainId,
    currentNetwork,
    isCorrectNetwork,
    isConnected,
    targetNetwork,
    targetChainId: PRIMARY_CHAIN_ID,
    switchToTarget,
    switchToChain,
    isSwitching: isPending,
    error: error as Error | null,
    getNetworkName,
    getBlockExplorerUrl,
    supportedNetworks,
  };
}
