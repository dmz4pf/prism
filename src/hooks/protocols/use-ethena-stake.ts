'use client';

import { useState, useEffect } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
} from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { SUSDE_ABI } from '@/contracts/abis';
import { ERC20_ABI } from '@/contracts/abis';
import { ETHENA_CONTRACTS } from '@/contracts/addresses';

const USDE_DECIMALS = 18;

type StakeStep = 'idle' | 'approving' | 'staking' | 'success' | 'error';

export function useEthenaStake() {
  const { address: userAddress, chainId } = useAccount();
  const [step, setStep] = useState<StakeStep>('idle');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isSupported = chainId === 1;
  const { USDe, sUSDe } = ETHENA_CONTRACTS[1];

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDe,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, sUSDe] : undefined,
    query: { enabled: !!userAddress && isSupported },
  });

  // Approve
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Stake
  const {
    writeContract: writeStake,
    data: stakeHash,
    isPending: isStakePending,
    error: stakeError,
    reset: resetStake,
  } = useWriteContract();

  const { isLoading: isStakeConfirming, isSuccess: isStakeSuccess } =
    useWaitForTransactionReceipt({ hash: stakeHash });

  // Update step based on transaction states
  useEffect(() => {
    if (isApprovePending || isApproveConfirming) {
      setStep('approving');
    } else if (isStakePending || isStakeConfirming) {
      setStep('staking');
    } else if (isStakeSuccess) {
      setStep('success');
    } else if (approveError || stakeError) {
      setStep('error');
      setError((approveError || stakeError) as Error);
    }
  }, [
    isApprovePending,
    isApproveConfirming,
    isStakePending,
    isStakeConfirming,
    isStakeSuccess,
    approveError,
    stakeError,
  ]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setNeedsApproval(false);
    }
  }, [isApproveSuccess, refetchAllowance]);

  const checkAllowance = (amount: string): boolean => {
    if (!amount || parseFloat(amount) <= 0) return false;
    const parsedAmount = parseUnits(amount, USDE_DECIMALS);
    const hasAllowance = (allowance ?? 0n) >= parsedAmount;
    setNeedsApproval(!hasAllowance);
    return hasAllowance;
  };

  const approve = async (amount: string) => {
    if (!isSupported) {
      setError(new Error('Ethena only available on Ethereum mainnet'));
      setStep('error');
      return;
    }

    setStep('approving');
    setError(null);
    const parsedAmount = parseUnits(amount, USDE_DECIMALS);

    writeApprove({
      address: USDe,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [sUSDe, parsedAmount],
    });
  };

  const stake = async (amount: string) => {
    if (!isSupported) {
      setError(new Error('Ethena only available on Ethereum mainnet'));
      setStep('error');
      return;
    }

    if (!userAddress) {
      setError(new Error('Wallet not connected'));
      setStep('error');
      return;
    }

    setStep('staking');
    setError(null);
    const parsedAmount = parseUnits(amount, USDE_DECIMALS);

    writeStake({
      address: sUSDe,
      abi: SUSDE_ABI,
      functionName: 'deposit',
      args: [parsedAmount, userAddress],
    });
  };

  const reset = () => {
    setStep('idle');
    setError(null);
    setNeedsApproval(true);
    resetApprove();
    resetStake();
  };

  return {
    step,
    isLoading:
      isApprovePending || isApproveConfirming || isStakePending || isStakeConfirming,
    isSupported,
    needsApproval,
    error,
    txHash: stakeHash,
    checkAllowance,
    approve,
    stake,
    reset,
  };
}
