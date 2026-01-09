'use client';

/**
 * useSmartWallet - Smart Wallet Hook V2
 *
 * Uses ZeroDev SDK to properly compute deterministic smart wallet addresses.
 * Address is derived from EOA and will be the same on any device.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { SmartWallet, UseSmartWalletReturn } from '@/types/wallet';

// ============================================
// CONFIGURATION
// ============================================

const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
const ACTIVE_CHAIN = IS_TESTNET ? baseSepolia : base;

const ZERODEV_BUNDLER_URL = process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL || '';
const ZERODEV_PAYMASTER_URL = process.env.NEXT_PUBLIC_ZERODEV_PAYMASTER_URL || '';

// ============================================
// SMART WALLET HOOK
// ============================================

export function useSmartWallet(): UseSmartWalletReturn {
  const { address: eoaAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [smartWallet, setSmartWallet] = useState<SmartWallet | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [kernelClient, setKernelClient] = useState<unknown>(null);

  /**
   * Initialize smart wallet using ZeroDev SDK
   * The address is deterministic based on EOA - same address on any device
   */
  const initializeSmartWallet = useCallback(async () => {
    if (!eoaAddress || !isConnected || !walletClient) {
      setSmartWallet(null);
      setKernelClient(null);
      return;
    }

    // Check if ZeroDev is configured
    if (!ZERODEV_BUNDLER_URL) {
      console.warn('ZeroDev not configured, smart wallet features disabled');
      // Still create a "virtual" smart wallet that just uses EOA
      setSmartWallet({
        address: eoaAddress,
        owner: eoaAddress,
        isDeployed: true, // EOA is always "deployed"
      });
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Dynamic imports to reduce bundle size
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

      // Create a public client using native RPC (not ZeroDev to avoid rate limits)
      const nativeRpcUrl = IS_TESTNET
        ? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC
        : process.env.NEXT_PUBLIC_BASE_RPC;

      const zerodevPublicClient = createPublicClient({
        chain: ACTIVE_CHAIN,
        transport: http(nativeRpcUrl || ACTIVE_CHAIN.rpcUrls.default.http[0]),
      });

      // Create ECDSA validator
      const ecdsaValidator = await signerToEcdsaValidator(zerodevPublicClient, {
        signer: walletClient,
        entryPoint,
        kernelVersion: KERNEL_V3_1,
      });

      // Create Kernel account - this gives us the deterministic address
      const kernelAccount = await createKernelAccount(zerodevPublicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion: KERNEL_V3_1,
      });

      const smartWalletAddress = kernelAccount.address;

      // Check if deployed
      const code = await zerodevPublicClient.getBytecode({ address: smartWalletAddress });
      const isDeployed = !!code && code !== '0x';

      // Create paymaster client for gas sponsorship
      let paymasterClient = null;
      if (ZERODEV_PAYMASTER_URL) {
        paymasterClient = createZeroDevPaymasterClient({
          chain: ACTIVE_CHAIN,
          transport: http(ZERODEV_PAYMASTER_URL),
        });
      }

      // Create kernel account client
      const client = createKernelAccountClient({
        account: kernelAccount,
        chain: ACTIVE_CHAIN,
        bundlerTransport: http(ZERODEV_BUNDLER_URL),
        ...(paymasterClient && { paymaster: paymasterClient }),
      });

      setKernelClient(client);
      setSmartWallet({
        address: smartWalletAddress,
        owner: eoaAddress,
        isDeployed,
      });
    } catch (err) {
      console.error('Failed to initialize smart wallet:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize smart wallet'));

      // Fallback to EOA if ZeroDev fails
      setSmartWallet({
        address: eoaAddress,
        owner: eoaAddress,
        isDeployed: true,
      });
    } finally {
      setIsInitializing(false);
    }
  }, [eoaAddress, isConnected, walletClient]);

  // Re-initialize when EOA or walletClient changes
  useEffect(() => {
    initializeSmartWallet();
  }, [initializeSmartWallet]);

  /**
   * Send a transaction from the smart wallet
   */
  const sendTransaction = useCallback(async (tx: {
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }): Promise<`0x${string}`> => {
    if (!kernelClient) {
      throw new Error('Smart wallet not initialized');
    }

    const client = kernelClient as {
      sendTransaction: (args: { to: Address; value: bigint; data: `0x${string}` }) => Promise<`0x${string}`>;
    };

    const txHash = await client.sendTransaction({
      to: tx.to,
      value: tx.value || 0n,
      data: tx.data || '0x',
    });

    // Mark as deployed after first tx
    setSmartWallet((prev) => prev ? { ...prev, isDeployed: true } : null);

    return txHash;
  }, [kernelClient]);

  /**
   * Send multiple transactions in a single UserOperation (batch)
   */
  const sendBatchedTransactions = useCallback(async (txs: Array<{
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }>): Promise<`0x${string}`> => {
    if (!kernelClient) {
      throw new Error('Smart wallet not initialized');
    }

    if (txs.length === 0) {
      throw new Error('No transactions to send');
    }

    if (txs.length === 1) {
      return sendTransaction(txs[0]);
    }

    const client = kernelClient as {
      sendTransactions: (args: { transactions: Array<{ to: Address; value: bigint; data: `0x${string}` }> }) => Promise<`0x${string}`>;
    };

    const txHash = await client.sendTransactions({
      transactions: txs.map((tx) => ({
        to: tx.to,
        value: tx.value || 0n,
        data: tx.data || '0x',
      })),
    });

    // Mark as deployed after first tx
    setSmartWallet((prev) => prev ? { ...prev, isDeployed: true } : null);

    return txHash;
  }, [kernelClient, sendTransaction]);

  return {
    smartWallet,
    isConnected: !!smartWallet,
    isInitializing,
    error,
    sendTransaction,
    sendBatchedTransactions,
  };
}
