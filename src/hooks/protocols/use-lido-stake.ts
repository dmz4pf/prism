'use client';

import { useState, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { parseEther } from 'viem';
import { LIDO_STETH_ABI } from '@/contracts/abis';
import { LIDO_CONTRACTS } from '@/contracts/addresses';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

type StakeStep = 'idle' | 'staking' | 'success' | 'error';

export function useLidoStake() {
  const { address: userAddress, chainId } = useAccount();
  const [step, setStep] = useState<StakeStep>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Lido is only available on Ethereum mainnet
  const isSupported = chainId === 1;
  const stETHAddress = LIDO_CONTRACTS[1].stETH;

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isPending || isConfirming) {
      setStep('staking');
    } else if (isSuccess) {
      setStep('success');
    } else if (writeError) {
      setStep('error');
      setError(writeError as Error);
    }
  }, [isPending, isConfirming, isSuccess, writeError]);

  const stake = async (ethAmount: string) => {
    if (!isSupported) {
      setError(new Error('Lido staking only available on Ethereum mainnet'));
      setStep('error');
      return;
    }

    if (!userAddress) {
      setError(new Error('Wallet not connected'));
      setStep('error');
      return;
    }

    const value = parseEther(ethAmount);
    setStep('staking');
    setError(null);

    writeContract({
      address: stETHAddress,
      abi: LIDO_STETH_ABI,
      functionName: 'submit',
      args: [ZERO_ADDRESS], // No referral
      value,
    });
  };

  const reset = () => {
    setStep('idle');
    setError(null);
    resetWrite();
  };

  return {
    step,
    isLoading: isPending || isConfirming,
    isSupported,
    error,
    txHash,
    stake,
    reset,
  };
}
