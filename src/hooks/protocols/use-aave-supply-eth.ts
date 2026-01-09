'use client';

/**
 * useAaveSupplyETH - Supply native ETH to Aave V3 via WETH Gateway
 *
 * This hook allows users to supply native ETH to Aave without
 * needing to wrap it to WETH first. The WETH Gateway handles
 * the wrapping and depositing in a single transaction.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useBalance,
} from 'wagmi';
import { parseEther } from 'viem';
import { AAVE_WETH_GATEWAY_ABI, AAVE_POOL_ABI } from '@/contracts/abis';
import {
  AAVE_WETH_GATEWAY,
  AAVE_POOL_ADDRESS,
  PRIMARY_CHAIN_ID,
} from '@/contracts/addresses';

export type SupplyETHStep = 'idle' | 'supplying' | 'success' | 'error';

interface UseAaveSupplyETHReturn {
  step: SupplyETHStep;
  isLoading: boolean;
  isSupported: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  supply: (ethAmount: string) => Promise<void>;
  reset: () => void;
  ethBalance: string;
}

export function useAaveSupplyETH(): UseAaveSupplyETHReturn {
  const { address: userAddress, chainId } = useAccount();
  const [step, setStep] = useState<SupplyETHStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Check if Aave is supported on this chain
  const isSupported = !!chainId && !!AAVE_WETH_GATEWAY[chainId] && !!AAVE_POOL_ADDRESS[chainId];
  const gatewayAddress = chainId ? AAVE_WETH_GATEWAY[chainId] : undefined;
  const poolAddress = chainId ? AAVE_POOL_ADDRESS[chainId] : undefined;

  // Get user's ETH balance
  const { data: balanceData } = useBalance({
    address: userAddress,
    query: { enabled: !!userAddress },
  });

  const ethBalance = balanceData?.formatted ?? '0';

  // Write contract hook
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Update step based on transaction states
  useEffect(() => {
    if (isPending || isConfirming) {
      setStep('supplying');
    } else if (isSuccess) {
      setStep('success');
    } else if (writeError) {
      setStep('error');
      setError(writeError as Error);
    }
  }, [isPending, isConfirming, isSuccess, writeError]);

  // Supply ETH to Aave
  const supply = useCallback(async (ethAmount: string) => {
    if (!isSupported) {
      setError(new Error('Aave not supported on this network'));
      setStep('error');
      return;
    }

    if (!userAddress || !gatewayAddress || !poolAddress) {
      setError(new Error('Wallet not connected or missing addresses'));
      setStep('error');
      return;
    }

    const amount = parseFloat(ethAmount);
    if (isNaN(amount) || amount <= 0) {
      setError(new Error('Invalid amount'));
      setStep('error');
      return;
    }

    // Check if user has enough ETH (leave some for gas)
    const ethBalanceNum = parseFloat(ethBalance);
    if (amount > ethBalanceNum - 0.005) { // Reserve 0.005 ETH for gas
      setError(new Error('Insufficient ETH balance (need to keep some for gas)'));
      setStep('error');
      return;
    }

    setStep('supplying');
    setError(null);

    try {
      const value = parseEther(ethAmount);

      writeContract({
        address: gatewayAddress,
        abi: AAVE_WETH_GATEWAY_ABI,
        functionName: 'depositETH',
        args: [poolAddress, userAddress, 0], // 0 = no referral code
        value,
      });
    } catch (err) {
      setError(err as Error);
      setStep('error');
    }
  }, [isSupported, userAddress, gatewayAddress, poolAddress, ethBalance, writeContract]);

  // Reset state
  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    resetWrite();
  }, [resetWrite]);

  return {
    step,
    isLoading: isPending || isConfirming,
    isSupported,
    error,
    txHash,
    supply,
    reset,
    ethBalance,
  };
}
