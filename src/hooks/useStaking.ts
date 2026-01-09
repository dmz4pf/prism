/**
 * useStaking Hook
 * Main hook for staking operations - combines options, positions, and transaction flows
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import type { Address } from 'viem';

import { useStakingOptions } from './useStakingOptions';
import { usePositions } from './usePositions';
import { useTransactionFlow } from './useTransactionFlow';
import { usePrices } from './usePrices';
import { useSmartWallet } from './wallet/use-smart-wallet';

import { getAdapter } from '@/services/adapters';
import { parseError, logError, createStakingErrors, type StakingError } from '@/services/errors';
import type {
  StakingOption,
  TransactionFlow,
  StakeQuote,
} from '@/types/staking';

interface UseStakingResult {
  // Data
  options: StakingOption[];
  selectedOption: StakingOption | null;
  positions: ReturnType<typeof usePositions>;
  prices: ReturnType<typeof usePrices>;

  // Selection
  selectOption: (optionId: string) => void;

  // Quoting
  quote: StakeQuote | null;
  isQuoting: boolean;
  getQuote: (amount: string, slippage?: number) => Promise<void>;

  // Transaction flow
  flow: TransactionFlow | null;
  buildFlow: (amount: string, slippage?: number) => Promise<void>;
  executeStep: () => Promise<void>;
  flowProgress: number;
  isFlowActive: boolean;

  // Status
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_SLIPPAGE = 0.5; // 0.5%

export function useStaking(): UseStakingResult {
  const { address } = useAccount();
  const { smartWallet } = useSmartWallet();

  // Use smart wallet address if available, fallback to EOA
  const walletAddress = smartWallet?.address || address;

  // Use sub-hooks
  const { options, isLoading: optionsLoading, error: optionsError } = useStakingOptions();
  const positions = usePositions();
  const prices = usePrices();

  // Local state
  const [selectedOption, setSelectedOption] = useState<StakingOption | null>(null);
  const [quote, setQuote] = useState<StakeQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction flow
  const {
    flow,
    currentStep,
    progress: flowProgress,
    isActive: isFlowActive,
    startFlow,
    executeCurrentStep,
    error: flowError,
  } = useTransactionFlow();

  // Select a staking option
  const selectOption = useCallback(
    (optionId: string) => {
      const option = options.find((opt) => opt.id === optionId);
      setSelectedOption(option || null);
      setQuote(null);
      setError(null);
    },
    [options]
  );

  // Get a quote for staking
  const getQuote = useCallback(
    async (amount: string, slippage: number = DEFAULT_SLIPPAGE) => {
      if (!selectedOption) {
        const err = createStakingErrors.adapterNotFound('none');
        setError(err.userMessage);
        return;
      }

      const adapter = getAdapter(selectedOption.id);
      if (!adapter) {
        const err = createStakingErrors.adapterNotFound(selectedOption.id);
        setError(err.userMessage);
        return;
      }

      try {
        setIsQuoting(true);
        setError(null);

        const amountWei = parseEther(amount);
        const stakeQuote = await adapter.getStakeQuote(amountWei, slippage);
        setQuote(stakeQuote);
      } catch (err) {
        const stakingErr = parseError(err);
        logError(stakingErr, { action: 'getQuote', amount, protocol: selectedOption.id });
        setError(stakingErr.userMessage);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    },
    [selectedOption]
  );

  // Build transaction flow
  const buildFlow = useCallback(
    async (amount: string, slippage: number = DEFAULT_SLIPPAGE) => {
      if (!selectedOption || !walletAddress) {
        const err = createStakingErrors.walletNotConnected();
        setError(err.userMessage);
        return;
      }

      const adapter = getAdapter(selectedOption.id);
      if (!adapter) {
        const err = createStakingErrors.adapterNotFound(selectedOption.id);
        setError(err.userMessage);
        return;
      }

      try {
        setError(null);
        const amountWei = parseEther(amount);
        // Use smart wallet address for staking flows
        const transactionFlow = await adapter.buildStakeFlow(
          amountWei,
          walletAddress as Address,
          slippage
        );
        startFlow(transactionFlow);
      } catch (err) {
        const stakingErr = parseError(err);
        logError(stakingErr, { action: 'buildFlow', amount, protocol: selectedOption.id });
        setError(stakingErr.userMessage);
      }
    },
    [selectedOption, walletAddress, startFlow]
  );

  // Execute current step
  const executeStep = useCallback(async () => {
    try {
      setError(null);
      await executeCurrentStep();
    } catch (err) {
      const stakingErr = parseError(err);
      logError(stakingErr, { action: 'executeStep', flow: flow?.id });
      setError(stakingErr.userMessage);
    }
  }, [executeCurrentStep, flow]);

  // Combine loading states
  const isLoading = optionsLoading || positions.isLoading || prices.isLoading;

  // Combine errors
  const combinedError = error || optionsError || flowError;

  return {
    options,
    selectedOption,
    positions,
    prices,
    selectOption,
    quote,
    isQuoting,
    getQuote,
    flow,
    buildFlow,
    executeStep,
    flowProgress,
    isFlowActive,
    isLoading,
    error: combinedError,
  };
}
