'use client';

/**
 * usePrismSmartWallet - Smart Wallet Hook for PRISM
 *
 * This hook implements the "Connect Wallet → Sign In → Create Smart Wallet" flow
 * using ZeroDev's Kernel smart account (ERC-4337).
 *
 * Flow:
 * 1. User connects their EOA (MetaMask, etc.) via RainbowKit/wagmi
 * 2. User clicks "Create PRISM Wallet"
 * 3. PRISM creates a Kernel smart account owned by the EOA
 * 4. Smart wallet address is computed counterfactually (no gas until first tx)
 * 5. User can now execute batched transactions, enjoy gas sponsorship, etc.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { type Address, createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { SmartWalletCreationStep, SmartWalletCall, PrismSmartWallet } from '@/types';
import { ZERODEV_CONFIG, CHAIN_IDS } from '@/contracts/addresses';

// ============================================
// CONFIGURATION
// ============================================

const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
const ACTIVE_CHAIN = IS_TESTNET ? baseSepolia : base;
const ACTIVE_CHAIN_ID = IS_TESTNET ? CHAIN_IDS.BASE_SEPOLIA : CHAIN_IDS.BASE;

// Get ZeroDev URLs from config or environment
const ZERODEV_BUNDLER_URL =
  process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL ||
  (IS_TESTNET ? ZERODEV_CONFIG.BASE_SEPOLIA.bundlerUrl : ZERODEV_CONFIG.BASE.bundlerUrl);

const ZERODEV_PAYMASTER_URL =
  process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL ||
  (IS_TESTNET ? ZERODEV_CONFIG.BASE_SEPOLIA.paymasterUrl : ZERODEV_CONFIG.BASE.paymasterUrl);

// Storage key for persisting smart wallet addresses
const STORAGE_KEY_PREFIX = 'prism_smart_wallet_';

// ============================================
// TYPES
// ============================================

interface SmartWalletState {
  address: Address | null;
  isDeployed: boolean;
  kernelClient: unknown | null; // KernelAccountClient type from ZeroDev
  createdAt: string | null;
}

interface UsePrismSmartWalletReturn {
  // EOA State
  eoaAddress: Address | undefined;
  isConnected: boolean;

  // Smart Wallet State
  smartWallet: PrismSmartWallet | null;
  smartWalletAddress: Address | null;
  hasSmartWallet: boolean;
  isDeployed: boolean;

  // Creation State
  creationStep: SmartWalletCreationStep;
  isCreating: boolean;
  error: Error | null;

  // Actions
  createSmartWallet: () => Promise<Address>;
  sendTransaction: (to: Address, value: bigint, data: `0x${string}`) => Promise<`0x${string}`>;
  sendBatchedTransactions: (calls: SmartWalletCall[]) => Promise<`0x${string}`>;
  resetError: () => void;

  // Feature Flags
  isSmartWalletAvailable: boolean;
  supportsGasSponsorship: boolean;
  supportsBatching: boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function usePrismSmartWallet(): UsePrismSmartWalletReturn {
  const { address: eoaAddress, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Smart wallet state
  const [state, setState] = useState<SmartWalletState>({
    address: null,
    isDeployed: false,
    kernelClient: null,
    createdAt: null,
  });

  // Creation flow state
  const [creationStep, setCreationStep] = useState<SmartWalletCreationStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Check if we're on the correct chain
  const isCorrectChain = chainId === ACTIVE_CHAIN_ID;

  // ============================================
  // PERSISTENCE
  // ============================================

  // Load saved smart wallet address on connect
  useEffect(() => {
    if (eoaAddress && isConnected) {
      const storageKey = `${STORAGE_KEY_PREFIX}${eoaAddress.toLowerCase()}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setState((prev) => ({
            ...prev,
            address: parsed.address as Address,
            createdAt: parsed.createdAt,
          }));

          // Check if deployed (in background)
          checkDeploymentStatus(parsed.address as Address);
        } catch {
          // Invalid saved data, ignore
        }
      }
    } else {
      // Reset state when disconnected
      setState({
        address: null,
        isDeployed: false,
        kernelClient: null,
        createdAt: null,
      });
    }
  }, [eoaAddress, isConnected]);

  // Check if smart wallet is deployed on-chain
  const checkDeploymentStatus = useCallback(
    async (address: Address) => {
      if (!publicClient) return;

      try {
        const code = await publicClient.getBytecode({ address });
        const deployed = !!code && code !== '0x';
        setState((prev) => ({ ...prev, isDeployed: deployed }));
      } catch {
        // Network error, assume not deployed
      }
    },
    [publicClient]
  );

  // ============================================
  // SMART WALLET CREATION
  // ============================================

  /**
   * Create a new smart wallet for the connected EOA
   *
   * This uses ZeroDev's SDK to create a Kernel account.
   * The wallet address is computed counterfactually and stored locally.
   * The actual deployment happens on the first transaction.
   */
  const createSmartWallet = useCallback(async (): Promise<Address> => {
    if (!walletClient || !eoaAddress) {
      throw new Error('Please connect your wallet first');
    }

    if (!isCorrectChain) {
      throw new Error(`Please switch to ${IS_TESTNET ? 'Base Sepolia' : 'Base'} network`);
    }

    setCreationStep('connecting');
    setError(null);

    try {
      setCreationStep('signing');

      // Dynamic imports to reduce bundle size and avoid SSR issues
      const [
        { signerToEcdsaValidator },
        { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient },
        zerodevConstants,
      ] = await Promise.all([
        import('@zerodev/ecdsa-validator'),
        import('@zerodev/sdk'),
        import('@zerodev/sdk/constants'),
      ]);

      const { KERNEL_V3_1, getEntryPoint } = zerodevConstants;
      const entryPoint = getEntryPoint('0.7');

      setCreationStep('creating');

      // Create a public client using native RPC (not ZeroDev to avoid rate limits)
      const nativeRpcUrl = IS_TESTNET
        ? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC
        : process.env.NEXT_PUBLIC_BASE_RPC;

      const zerodevPublicClient = createPublicClient({
        chain: ACTIVE_CHAIN,
        transport: http(nativeRpcUrl || ACTIVE_CHAIN.rpcUrls.default.http[0]),
      });

      // Create ECDSA validator (validates signatures from EOA)
      // walletClient can be used directly as the signer
      const ecdsaValidator = await signerToEcdsaValidator(zerodevPublicClient, {
        signer: walletClient,
        entryPoint,
        kernelVersion: KERNEL_V3_1,
      });

      // Create Kernel account (smart wallet)
      const kernelAccount = await createKernelAccount(zerodevPublicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion: KERNEL_V3_1,
      });

      // Create paymaster client for gas sponsorship
      const paymasterClient = createZeroDevPaymasterClient({
        chain: ACTIVE_CHAIN,
        transport: http(ZERODEV_PAYMASTER_URL),
      });

      // Create kernel account client (for sending UserOperations)
      const kernelAccountClient = createKernelAccountClient({
        account: kernelAccount,
        chain: ACTIVE_CHAIN,
        bundlerTransport: http(ZERODEV_BUNDLER_URL),
        paymaster: paymasterClient,
      });

      const smartWalletAddress = kernelAccount.address;
      const createdAt = new Date().toISOString();

      // Check deployment status
      const code = await zerodevPublicClient.getBytecode({ address: smartWalletAddress });
      const isDeployed = !!code && code !== '0x';

      // Update state
      setState({
        address: smartWalletAddress,
        isDeployed,
        kernelClient: kernelAccountClient,
        createdAt,
      });

      // Persist to localStorage
      const storageKey = `${STORAGE_KEY_PREFIX}${eoaAddress.toLowerCase()}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          address: smartWalletAddress,
          createdAt,
          owner: eoaAddress,
        })
      );

      setCreationStep('success');
      return smartWalletAddress;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setCreationStep('error');
      throw error;
    }
  }, [walletClient, eoaAddress, isCorrectChain]);

  // ============================================
  // TRANSACTION METHODS
  // ============================================

  /**
   * Send a single transaction through the smart wallet
   */
  const sendTransaction = useCallback(
    async (to: Address, value: bigint, data: `0x${string}`): Promise<`0x${string}`> => {
      if (!state.kernelClient) {
        // If no kernel client, try to recreate it
        if (state.address && walletClient) {
          await createSmartWallet();
        } else {
          throw new Error('Smart wallet not initialized. Please create a wallet first.');
        }
      }

      const client = state.kernelClient as {
        sendTransaction: (args: { to: Address; value: bigint; data: `0x${string}` }) => Promise<`0x${string}`>;
      };

      const txHash = await client.sendTransaction({
        to,
        value,
        data,
      });

      // Mark as deployed after first tx
      setState((prev) => ({ ...prev, isDeployed: true }));

      return txHash;
    },
    [state.kernelClient, state.address, walletClient, createSmartWallet]
  );

  /**
   * Send batched transactions through the smart wallet
   * This is one of the main benefits of smart wallets - multiple ops in one tx
   */
  const sendBatchedTransactions = useCallback(
    async (calls: SmartWalletCall[]): Promise<`0x${string}`> => {
      if (!state.kernelClient) {
        if (state.address && walletClient) {
          await createSmartWallet();
        } else {
          throw new Error('Smart wallet not initialized. Please create a wallet first.');
        }
      }

      const client = state.kernelClient as {
        sendTransactions: (args: { transactions: SmartWalletCall[] }) => Promise<`0x${string}`>;
      };

      const txHash = await client.sendTransactions({
        transactions: calls,
      });

      // Mark as deployed after first tx
      setState((prev) => ({ ...prev, isDeployed: true }));

      return txHash;
    },
    [state.kernelClient, state.address, walletClient, createSmartWallet]
  );

  // ============================================
  // RESET HELPERS
  // ============================================

  const resetError = useCallback(() => {
    setError(null);
    setCreationStep('idle');
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Build smart wallet object
  const smartWallet = useMemo<PrismSmartWallet | null>(() => {
    if (!state.address || !eoaAddress) return null;

    return {
      address: state.address,
      owner: eoaAddress,
      isDeployed: state.isDeployed,
      createdAt: state.createdAt || new Date().toISOString(),
      totalValueUsd: 0, // Would be computed from balances
      kernelVersion: '0.3.1',
    };
  }, [state.address, state.isDeployed, state.createdAt, eoaAddress]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // EOA State
    eoaAddress,
    isConnected,

    // Smart Wallet State
    smartWallet,
    smartWalletAddress: state.address,
    hasSmartWallet: !!state.address,
    isDeployed: state.isDeployed,

    // Creation State
    creationStep,
    isCreating: creationStep === 'connecting' || creationStep === 'signing' || creationStep === 'creating',
    error,

    // Actions
    createSmartWallet,
    sendTransaction,
    sendBatchedTransactions,
    resetError,

    // Feature Flags
    isSmartWalletAvailable: true, // ZeroDev is available
    supportsGasSponsorship: true, // ZeroDev paymaster
    supportsBatching: true, // Kernel supports batching
  };
}
