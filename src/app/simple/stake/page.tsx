/**
 * Staking Page - PRODUCTION VERSION
 * Integrated with real hooks, adapters, and blockchain transactions
 *
 * This replaces the mock implementation with:
 * - Real useStaking hook integration
 * - Actual protocol data from DeFiLlama
 * - Live transaction flows
 * - Proper error handling
 * - Accessibility improvements
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSmartWallet } from '@/hooks/wallet/use-smart-wallet';
import {
  ArrowLeft,
  TrendingUp,
  Info,
  AlertTriangle,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { formatEther } from 'viem';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Modals
import {
  ConfirmationModal,
  PendingModal,
  SuccessModal,
} from '@/components/modals';

// Charts
import { APYChart } from '@/components/charts/apy-chart';

// Hooks
import { useStaking } from '@/hooks/useStaking';

// Utils
import { formatUSD, cn } from '@/lib/utils';
import {
  validateStakingInputs,
  sanitizeNumericInput,
  checkPriceImpact,
  VALIDATION_CONSTRAINTS,
} from '@/lib/validation';
import { StakingError, parseError, logError } from '@/services/errors';
import { livePriceService } from '@/services/live-prices';

// Types
import type { StakingOption } from '@/types/staking';

/**
 * Get risk level color
 */
function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'high':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-secondary-400 bg-gray-500/10 border-gray-500/20';
  }
}

/**
 * Protocol Selection Card Component
 */
function ProtocolCard({
  option,
  isSelected,
  onSelect,
}: {
  option: StakingOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Stake with ${option.name}, ${option.apy.toFixed(2)}% APY, ${option.risk} risk`}
      aria-pressed={isSelected}
      className={cn(
        'p-4 cursor-pointer transition-all hover:border-gray-600',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5' : ''
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {option.outputToken.symbol.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-white">{option.protocol}</p>
            <p className="text-sm text-secondary-400">{option.outputToken.symbol}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-400">{option.apy.toFixed(2)}%</p>
          <p className="text-xs text-secondary-500">APY</p>
        </div>
      </div>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-border space-y-2"
        >
          <p className="text-xs text-secondary-400">{option.description}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary-400">TVL</span>
            <span className="text-white">{formatUSD(option.tvl, true)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant="outline" className={cn('text-xs', getRiskColor(option.risk))}>
              {option.risk.charAt(0).toUpperCase() + option.risk.slice(1)} Risk
            </Badge>
          </div>

          {option.riskFactors && option.riskFactors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-secondary-400 hover:text-secondary-300">
                Risk factors
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {option.riskFactors.map((factor, i) => (
                  <li key={i} className="text-secondary-500">• {factor}</li>
                ))}
              </ul>
            </details>
          )}
        </motion.div>
      )}
    </Card>
  );
}

/**
 * Main Staking Page Component
 */
export default function StakePage() {
  const { address, isConnected } = useAccount();
  const { smartWallet, isInitializing: isWalletInitializing } = useSmartWallet();

  // Get ETH balance from smart wallet (or fallback to EOA)
  const walletAddress = smartWallet?.address || address;
  const { data: balance } = useBalance({
    address: walletAddress,
  });

  // Use staking hook (THE REAL ONE!)
  const {
    options,
    selectedOption,
    selectOption,
    quote,
    isQuoting,
    getQuote,
    buildFlow,
    executeStep,
    flow,
    flowProgress,
    isFlowActive,
    isLoading: isLoadingOptions,
    error: stakingError,
  } = useStaking();

  // Local state
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState<number>(VALIDATION_CONSTRAINTS.DEFAULT_SLIPPAGE);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<StakingError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<StakingError[]>([]);
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(2500); // Fallback price

  // Fetch live ETH price on mount
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await livePriceService.getEthPrice();
        setEthPriceUsd(price.priceUsd);
      } catch (error) {
        console.warn('[StakePage] Failed to fetch ETH price, using fallback:', error);
      }
    };
    fetchEthPrice();
    // Refresh price every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Debounced quote fetching
  useEffect(() => {
    if (!selectedOption || !amount || parseFloat(amount) <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      getQuote(amount, slippage);
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, slippage, selectedOption, getQuote]);

  // Validate inputs whenever they change
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setValidationErrors([]);
      setValidationWarnings([]);
      return;
    }

    const validation = validateStakingInputs({
      amount,
      slippage,
      address,
      balance: balance?.value,
      protocolLiquidity: selectedOption?.tvl,
      priceImpact: quote?.priceImpact,
    });

    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  }, [amount, slippage, address, balance, selectedOption, quote]);

  // Calculate USD value using live ETH price
  const amountUsd = useMemo(() => {
    if (!amount) return 0;
    return parseFloat(amount) * ethPriceUsd;
  }, [amount, ethPriceUsd]);

  // Handle max button
  const handleMax = () => {
    if (!balance) return;
    // Leave 0.01 ETH for gas
    const gasReserve = BigInt('10000000000000000'); // 0.01 ETH
    const maxAmount = balance.value > gasReserve ? balance.value - gasReserve : 0n;
    setAmount(formatEther(maxAmount));
  };

  // Handle amount input
  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value, 18);
    setAmount(sanitized);
  };

  // Handle stake button click
  const handleStake = async () => {
    if (!selectedOption || !amount || validationErrors.length > 0) {
      return;
    }

    // Build the transaction flow
    try {
      await buildFlow(amount, slippage);
      setShowConfirmation(true);
    } catch (error) {
      const stakingErr = parseError(error);
      logError(stakingErr, { action: 'buildFlow', amount, protocol: selectedOption.id });
    }
  };

  // Handle confirmation and execute transaction
  const handleConfirm = async () => {
    setShowConfirmation(false);

    if (!flow) return;

    // Execute each step
    try {
      while (flow && flow.currentStep < flow.steps.length) {
        await executeStep();
      }
    } catch (error) {
      const stakingErr = parseError(error);
      logError(stakingErr, { action: 'executeStep', flow: flow.id });
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    setAmount('');
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // Check if can stake
  const canStake = useMemo(() => {
    return (
      isConnected &&
      selectedOption &&
      amount &&
      parseFloat(amount) > 0 &&
      validationErrors.length === 0 &&
      !isQuoting &&
      !isFlowActive
    );
  }, [isConnected, selectedOption, amount, validationErrors, isQuoting, isFlowActive]);

  // Get price impact severity
  const priceImpactInfo = useMemo(() => {
    if (!quote) return null;
    return checkPriceImpact(quote.priceImpact);
  }, [quote]);

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-secondary-400 mb-6">
            Connect your wallet to stake ETH and earn yield.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      {flow && (
        <>
          <ConfirmationModal
            open={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleConfirm}
            title="Confirm Stake"
            description={`Stake ${amount} ETH on ${selectedOption?.name}`}
            steps={flow.steps.map((step) => ({
              label: step.name,
              description: step.description,
            }))}
            gasEstimate={quote?.estimatedGasUsd ? `$${quote.estimatedGasUsd.toFixed(2)}` : undefined}
            totalValue={amountUsd}
          />

          <PendingModal
            open={isFlowActive}
            title="Staking ETH"
            description={`Staking ${amount} ETH on ${selectedOption?.name}...`}
            steps={flow.steps.map((step) => ({
              label: step.name,
              status:
                step.status === 'completed' ? 'completed' :
                step.status === 'failed' ? 'error' :
                step.status === 'signing' || step.status === 'confirming' ? 'in_progress' :
                'pending',
              txHash: step.txHash,
            }))}
          />

          <SuccessModal
            open={flow.status === 'completed'}
            onClose={handleSuccessClose}
            title="Stake Complete!"
            description={`Successfully staked ${amount} ETH`}
            txHash={flow.steps[flow.steps.length - 1]?.txHash}
            amount={quote?.expectedOutput ? formatEther(BigInt(quote.expectedOutput)) : amount}
            token={selectedOption?.outputToken.symbol || 'LST'}
          />
        </>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-secondary-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stake ETH</h1>
            <p className="text-secondary-400">
              Earn yield through liquid staking protocols
            </p>
          </div>
        </div>
      </motion.div>

      {/* Global Error */}
      {stakingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{stakingError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-3"
        >
          <h3 className="font-medium text-white">Select Protocol</h3>

          {isLoadingOptions ? (
            // Loading skeleton
            <div className="space-y-3" aria-label="Loading protocols">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-4 bg-secondary-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-secondary-700 rounded w-1/2" />
                </Card>
              ))}
            </div>
          ) : options.length === 0 ? (
            // Empty state
            <Card className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-secondary-500 mx-auto mb-2" />
              <p className="text-sm text-secondary-400">No staking options available</p>
            </Card>
          ) : (
            // Protocol cards
            <div className="space-y-3" role="radiogroup" aria-label="Staking protocols">
              {options.map((option) => (
                <ProtocolCard
                  key={option.id}
                  option={option}
                  isSelected={selectedOption?.id === option.id}
                  onSelect={() => selectOption(option.id)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Stake Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 space-y-6">
            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="stake-amount" className="text-sm font-medium text-secondary-300">
                  Amount
                </label>
                <span className="text-sm text-secondary-400" aria-label="Your ETH balance">
                  Balance: {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0.0000'} ETH
                </span>
              </div>
              <div className="relative">
                <Input
                  id="stake-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="text-2xl h-16 pr-24"
                  aria-label="Stake amount in ETH"
                  aria-invalid={validationErrors.length > 0}
                  aria-describedby={validationErrors.length > 0 ? "amount-error" : undefined}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={handleMax}
                    aria-label="Use maximum ETH balance"
                  >
                    MAX
                  </Button>
                  <span className="font-medium text-white">ETH</span>
                </div>
              </div>
              {amount && amountUsd > 0 && (
                <p className="text-sm text-secondary-400 mt-2">
                  ≈ {formatUSD(amountUsd)}
                </p>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div id="amount-error" role="alert" className="mt-2 space-y-1">
                  {validationErrors.map((error, i) => (
                    <p key={i} className="text-sm text-red-400">
                      {error.userMessage}
                    </p>
                  ))}
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div role="status" className="mt-2 space-y-1">
                  {validationWarnings.map((warning, i) => (
                    <p key={i} className="text-sm text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {warning.userMessage}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Quote Display */}
            {(quote || isQuoting) && selectedOption && (
              <div className="p-4 bg-secondary-800/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-400">You will receive</span>
                  {isQuoting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-label="Calculating quote" />
                  ) : quote ? (
                    <span className="text-lg font-bold text-white">
                      {formatEther(BigInt(quote.expectedOutput))} {selectedOption.outputToken.symbol}
                    </span>
                  ) : null}
                </div>

                {quote && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-400">Price impact</span>
                      <span className={cn(
                        priceImpactInfo?.severity === 'critical' ? 'text-red-500' :
                        priceImpactInfo?.severity === 'high' ? 'text-orange-500' :
                        priceImpactInfo?.severity === 'medium' ? 'text-yellow-500' :
                        'text-green-500'
                      )}>
                        {quote.priceImpact.toFixed(3)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-400">Min. received (slippage)</span>
                      <span className="text-white">
                        {formatEther(BigInt(quote.minOutput))} {selectedOption.outputToken.symbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-400">Estimated gas</span>
                      <span className="text-white">~${quote.estimatedGasUsd.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* APY Info */}
            {selectedOption && (
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" aria-hidden="true" />
                  <span className="text-green-300">Estimated APY</span>
                </div>
                <span className="text-xl font-bold text-green-400">
                  {selectedOption.apy.toFixed(2)}%
                </span>
              </div>
            )}

            {/* Slippage Settings */}
            <div>
              <button
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                className="flex items-center gap-2 text-sm text-secondary-400 hover:text-secondary-300 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                aria-expanded={showSlippageSettings}
                aria-controls="slippage-settings"
              >
                <span>Slippage tolerance: {slippage}%</span>
                <span aria-hidden="true">{showSlippageSettings ? '▲' : '▼'}</span>
              </button>

              <AnimatePresence>
                {showSlippageSettings && (
                  <motion.div
                    id="slippage-settings"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 mt-3"
                    role="group"
                    aria-label="Slippage tolerance options"
                  >
                    {[0.1, 0.5, 1.0].map((value) => (
                      <Button
                        key={value}
                        variant={slippage === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSlippage(value)}
                        aria-label={`Set slippage to ${value}%`}
                        aria-pressed={slippage === value}
                      >
                        {value}%
                      </Button>
                    ))}
                    <Input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                      className="w-20 h-9"
                      step="0.1"
                      min="0.1"
                      max="50"
                      aria-label="Custom slippage tolerance"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stake Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={!canStake}
              onClick={handleStake}
              aria-busy={isQuoting || isFlowActive}
            >
              {!isConnected ? (
                'Connect Wallet'
              ) : !selectedOption ? (
                'Select Protocol'
              ) : !amount || parseFloat(amount) <= 0 ? (
                'Enter Amount'
              ) : validationErrors.length > 0 ? (
                validationErrors[0].userMessage
              ) : isQuoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Getting Quote...
                </>
              ) : isFlowActive ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Staking...
                </>
              ) : (
                <>
                  Stake {amount} ETH
                  <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-secondary-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                {selectedOption?.outputToken.symbol} represents your staked ETH.
                You can use it in DeFi while earning staking rewards.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* APY History Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <APYChart
          protocols={['lido', 'coinbase', 'rocketpool', 'etherfi']}
          title="Staking APY History"
          height={300}
        />
      </motion.section>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isQuoting && 'Fetching quote...'}
        {quote && 'Quote ready'}
        {isFlowActive && 'Transaction in progress'}
        {flow?.status === 'completed' && 'Transaction successful'}
        {flow?.status === 'failed' && 'Transaction failed'}
      </div>
    </div>
  );
}
