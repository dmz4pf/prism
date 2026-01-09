import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base, mainnet, arbitrum, optimism } from 'wagmi/chains';
import { http } from 'wagmi';

// Use Base Sepolia for testing, Base mainnet for production
const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';

// Base-first chain configuration for MVP
export const config = getDefaultConfig({
  appName: 'PRISM',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  // Base Sepolia for testing, Base mainnet for production
  chains: IS_TESTNET
    ? [baseSepolia]
    : [base, mainnet, arbitrum, optimism],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth.llamarpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC || 'https://mainnet.optimism.io'),
  },
  ssr: true,
});

// Primary chain for MVP (Base Sepolia for testing)
export const PRIMARY_CHAIN_ID = IS_TESTNET ? baseSepolia.id : base.id;

// Supported chains configuration (Base first)
export const SUPPORTED_CHAINS = IS_TESTNET
  ? [baseSepolia] as const
  : [base, mainnet, arbitrum, optimism] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]['id'];

export const isChainSupported = (chainId: number): chainId is SupportedChainId =>
  SUPPORTED_CHAINS.some((chain) => chain.id === chainId);

export const getChainName = (chainId: number): string => {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  return chain?.name || 'Unknown';
};
