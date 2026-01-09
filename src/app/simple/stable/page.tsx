/**
 * Stablecoin Yield Page - Production Ready
 *
 * This is the production version of the stablecoin yield page.
 * Connected to real protocol hooks and live pool data.
 *
 * To deploy: Rename this file to page.tsx (backup old page.tsx first)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { useSmartWallet } from '@/hooks/wallet/use-smart-wallet';
import {
  ArrowLeft,
  Coins,
  ChevronRight,
  Info,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmationModal, PendingModal, SuccessModal, TransactionStep } from '@/components/modals';
import { ErrorModal, useErrorModal, stakingErrorToDetails } from '@/components/modals/error-modal';
import { useToast } from '@/components/ui/toast-provider';
import { PoolCardSkeletonGrid } from '@/components/stablecoin/pool-card-skeleton';
import { PositionCard, PositionEmptyState } from '@/components/stablecoin/position-card';
import { WithdrawModal } from '@/components/stablecoin/withdraw-modal';
import type { UserStablecoinPosition } from '@/types/stablecoin';
import { PortfolioSummary } from '@/components/stablecoin/portfolio-summary';
import { useStablecoinPools } from '@/hooks/stablecoin/use-stablecoin-pools';
import { useUserPositions, useUserPortfolio } from '@/hooks/stablecoin/use-user-positions';
import { useProtocolAction } from '@/hooks/protocols/use-protocol-action';
import { useTokenAllowance } from '@/hooks/stablecoin/use-token-allowance';
import { simulatePoolDeposit, getGasEstimateUsd } from '@/services/stablecoin/simulation';
import { StablecoinPool } from '@/types/stablecoin';
import { PROTOCOL_METADATA } from '@/contracts/addresses/stablecoin-protocols';
import { formatUSD, cn } from '@/lib/utils';

// =============================================================================
// COMPONENT
// =============================================================================

export default function StableYieldPage() {
  const { isConnected, address } = useAccount();
  const { smartWallet } = useSmartWallet();
  const toast = useToast();
  const { isOpen: isErrorOpen, error: errorDetails, showError, closeError, onRetry } = useErrorModal();

  // Use smart wallet address if available, fallback to EOA
  const walletAddress = smartWallet?.address || address;

  // Data hooks
  const { pools, isLoading: isLoadingPools, error: poolsError, refetch: refetchPools } = useStablecoinPools();
  const { portfolio, isLoading: isLoadingPositions, refetch: refetchPositions } = useUserPortfolio();

  // Local state
  const [selectedPool, setSelectedPool] = useState<StablecoinPool | null>(null);
  const [amount, setAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [pendingSteps, setPendingSteps] = useState<TransactionStep[]>([]);
  const [estimatedGas, setEstimatedGas] = useState<string>('~$0.50');
  // Track what action is in progress for state machine pattern
  const [currentAction, setCurrentAction] = useState<'idle' | 'approving' | 'depositing'>('idle');

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedWithdrawPosition, setSelectedWithdrawPosition] = useState<UserStablecoinPosition | null>(null);

  // Select first pool by default when loaded
  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  // Protocol action hook (for selected pool)
  const protocolAction = useProtocolAction({
    protocol: selectedPool?.protocol || 'aave',
    poolAddress: selectedPool?.poolAddress || '0x',
    assetAddress: selectedPool?.asset.address || '0x',
    assetSymbol: selectedPool?.asset.symbol || 'USDC',
    decimals: selectedPool?.asset.decimals || 6,
  });

  // Allowance hook
  const allowance = useTokenAllowance({
    tokenAddress: selectedPool?.asset.address || '0x',
    spenderAddress: selectedPool?.poolAddress || '0x',
    enabled: !!selectedPool && isConnected,
  });

  // Fetch real token balance from smart wallet (or EOA fallback)
  const { data: tokenBalanceData, isLoading: isLoadingBalance } = useReadContract({
    address: selectedPool?.asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!selectedPool && !!walletAddress,
    },
  });

  // Format token balance for display
  const tokenBalance = tokenBalanceData
    ? formatUnits(tokenBalanceData, selectedPool?.asset.decimals || 6)
    : '0';
  const parsedAmount = amount ? parseUnits(amount, selectedPool?.asset.decimals || 6) : 0n;
  const needsApproval = !allowance.hasAllowance(parsedAmount);

  // Estimated receive (simplified)
  const estimatedReceive = amount ? (parseFloat(amount) * 0.9999).toFixed(2) : '0';

  // ==========================================================================
  // STATE MACHINE EFFECTS - Handle async transaction flow
  // ==========================================================================

  // Effect: Handle approval completion - proceed to deposit
  useEffect(() => {
    if (currentAction === 'approving' && allowance.isApproved && !allowance.isApproving) {
      // Approval completed, update step and start deposit
      setPendingSteps((prev) => [
        { ...prev[0], status: 'completed', txHash: allowance.approvalTxHash },
        { ...prev[1], status: 'in_progress' },
        ...prev.slice(2),
      ]);
      setCurrentAction('depositing');
      protocolAction.deposit(amount);
    }
  }, [currentAction, allowance.isApproved, allowance.isApproving, allowance.approvalTxHash, amount, protocolAction]);

  // Effect: Handle approval error
  useEffect(() => {
    if (currentAction === 'approving' && allowance.error) {
      setShowPending(false);
      setCurrentAction('idle');
      showError({
        title: 'Approval Failed',
        message: allowance.error.message || 'The approval could not be completed.',
        isRetryable: true,
        suggestions: ['Check your wallet balance', 'Try again'],
      });
    }
  }, [currentAction, allowance.error, showError]);

  // Effect: Handle deposit completion
  useEffect(() => {
    if (currentAction === 'depositing' && protocolAction.step === 'success' && !protocolAction.isLoading) {
      // Deposit completed successfully
      const depositStepIndex = needsApproval ? 1 : 0;
      setPendingSteps((prev) => {
        const updated = [...prev];
        updated[depositStepIndex] = {
          ...updated[depositStepIndex],
          status: 'completed',
          txHash: protocolAction.txHash,
        };
        if (updated[depositStepIndex + 1]) {
          updated[depositStepIndex + 1] = { ...updated[depositStepIndex + 1], status: 'completed' };
        }
        return updated;
      });

      setTxHash(protocolAction.txHash);
      setShowPending(false);
      setShowSuccess(true);
      setCurrentAction('idle');
      refetchPositions();

      if (selectedPool) {
        toast.success('Deposit Complete', `Successfully deposited ${amount} ${selectedPool.asset.symbol}`);
      }
    }
  }, [currentAction, protocolAction.step, protocolAction.isLoading, protocolAction.txHash, needsApproval, refetchPositions, toast, selectedPool, amount]);

  // Effect: Handle deposit error
  useEffect(() => {
    if (currentAction === 'depositing' && protocolAction.error) {
      setShowPending(false);
      setCurrentAction('idle');
      showError({
        title: 'Deposit Failed',
        message: protocolAction.error.message || 'The deposit could not be completed.',
        isRetryable: true,
        suggestions: ['Check your wallet balance', 'Try a smaller amount', 'Refresh and try again'],
      });
    }
  }, [currentAction, protocolAction.error, showError]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handlePoolSelect = useCallback((pool: StablecoinPool) => {
    setSelectedPool(pool);
    setAmount('');
    protocolAction.reset();
  }, [protocolAction]);

  const handleConvert = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedPool || !address) return;

    // Simulate first
    try {
      const simulation = await simulatePoolDeposit(
        selectedPool,
        parsedAmount,
        address as `0x${string}`
      );

      if (!simulation.success) {
        showError({
          title: 'Transaction Would Fail',
          message: simulation.revertReason || 'The transaction would fail if submitted.',
          isRetryable: false,
          suggestions: simulation.warnings,
        });
        return;
      }

      // Get gas estimate
      const gasUsd = await getGasEstimateUsd(simulation.gasEstimate);
      setEstimatedGas(`~${formatUSD(gasUsd)}`);
    } catch (err) {
      console.error('Simulation error:', err);
      // Continue anyway - simulation might fail but tx could succeed
    }

    setShowConfirmation(true);
  }, [amount, selectedPool, address, parsedAmount, showError]);

  const handleConfirm = useCallback(async () => {
    if (!selectedPool || !amount) return;

    setShowConfirmation(false);
    setShowPending(true);

    // Build steps
    const steps: TransactionStep[] = [];

    if (needsApproval) {
      steps.push({ label: `Approve ${selectedPool.asset.symbol}`, status: 'pending' });
    }
    steps.push({ label: `Deposit to ${PROTOCOL_METADATA[selectedPool.protocol].displayName}`, status: 'pending' });
    steps.push({ label: 'Receive receipt tokens', status: 'pending' });

    setPendingSteps(steps);

    try {
      if (needsApproval) {
        // Start approval - state machine effects will handle completion and continue to deposit
        setPendingSteps((prev) => [
          { ...prev[0], status: 'in_progress' },
          ...prev.slice(1),
        ]);
        setCurrentAction('approving');
        await allowance.approveInfinite();
        // Effects will handle the rest: approval completion -> deposit -> success
      } else {
        // No approval needed, start deposit directly
        setPendingSteps((prev) => [
          { ...prev[0], status: 'in_progress' },
          ...prev.slice(1),
        ]);
        setCurrentAction('depositing');
        await protocolAction.deposit(amount);
        // Effects will handle completion
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setShowPending(false);
      setCurrentAction('idle');

      const error = err as Error;
      showError({
        title: 'Transaction Failed',
        message: error.message || 'The transaction could not be completed.',
        technicalDetails: error.stack,
        isRetryable: true,
        suggestions: ['Check your wallet balance', 'Try a smaller amount', 'Refresh and try again'],
      });
    }
  }, [selectedPool, amount, needsApproval, allowance, protocolAction, showError]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    setAmount('');
    setCurrentAction('idle');
    protocolAction.reset();
    allowance.reset();
  }, [protocolAction, allowance]);

  // ==========================================================================
  // RENDER: Not Connected
  // ==========================================================================

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
            Connect your wallet to deposit stablecoins and earn yield.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Main Page
  // ==========================================================================

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Modals */}
      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        title="Confirm Deposit"
        description={selectedPool ? `Deposit ${amount} ${selectedPool.asset.symbol} to ${PROTOCOL_METADATA[selectedPool.protocol].displayName}` : ''}
        steps={[
          ...(needsApproval ? [{ label: 'Approve token', description: 'One-time approval' }] : []),
          { label: 'Deposit', description: selectedPool ? PROTOCOL_METADATA[selectedPool.protocol].displayName : '' },
        ]}
        gasEstimate={estimatedGas}
        totalValue={parseFloat(amount) || 0}
        warning={selectedPool?.risk.score === 'C' || selectedPool?.risk.score === 'D' ? 'This protocol has a higher risk rating.' : undefined}
      />

      <PendingModal
        open={showPending}
        title="Processing Deposit..."
        description={selectedPool ? `Depositing ${amount} ${selectedPool.asset.symbol}` : ''}
        steps={pendingSteps}
      />

      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="Deposit Successful!"
        description={selectedPool ? `Your ${selectedPool.asset.symbol} is now earning ${selectedPool.apy.net.toFixed(2)}% APY` : ''}
        txHash={txHash}
        amount={estimatedReceive}
        token={selectedPool?.receiptToken?.symbol || 'tokens'}
      />

      <ErrorModal
        open={isErrorOpen}
        onClose={closeError}
        error={errorDetails || { title: 'Error', message: 'An error occurred' }}
        onRetry={onRetry}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-secondary-400 hover:text-white transition-colors"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-yellow-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stablecoin Yield</h1>
            <p className="text-secondary-400">
              Earn yield on your stablecoins across top DeFi protocols
            </p>
          </div>
        </div>
      </motion.div>

      {/* Portfolio Summary */}
      {portfolio && portfolio.positions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PortfolioSummary portfolio={portfolio} isLoading={isLoadingPositions} />
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white" id="protocol-selector-label">Select Protocol</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchPools()}
              className="text-secondary-400 hover:text-white"
              aria-label="Refresh protocols"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {isLoadingPools ? (
            <PoolCardSkeletonGrid count={5} />
          ) : poolsError ? (
            <Card className="p-4 border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm">Failed to load protocols. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => refetchPools()} className="mt-2">
                Retry
              </Button>
            </Card>
          ) : (
            <div role="listbox" aria-labelledby="protocol-selector-label" className="space-y-2">
              {pools.map((pool) => {
                const protocol = PROTOCOL_METADATA[pool.protocol];
                const isSelected = selectedPool?.id === pool.id;
                const riskColor = pool.risk.score === 'A' || pool.risk.score === 'B'
                  ? 'text-green-400'
                  : 'text-orange-400';

                return (
                  <Card
                    key={pool.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={cn(
                      'p-4 cursor-pointer transition-all',
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'hover:border-secondary-600'
                    )}
                    onClick={() => handlePoolSelect(pool)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePoolSelect(pool)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: protocol.color + '30' }}
                        >
                          {pool.asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{protocol.displayName}</p>
                          <p className="text-xs text-secondary-400">{pool.asset.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn('font-bold', riskColor)}>
                          {pool.apy.net.toFixed(2)}%
                        </p>
                        <p className="text-xs text-secondary-500">APY</p>
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-secondary-800"
                      >
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-secondary-400">TVL</span>
                          <span className="text-white">{formatUSD(pool.tvl.usd, true)}</span>
                        </div>
                        <div className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                          pool.risk.score === 'A' || pool.risk.score === 'B'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        )}>
                          Risk: {pool.risk.score}
                        </div>
                      </motion.div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Deposit Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 space-y-6">
            {/* From Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="amount-input" className="text-sm font-medium text-secondary-300">
                  Amount to Deposit
                </label>
                <span className="text-sm text-secondary-400">
                  Balance: {tokenBalance} {selectedPool?.asset.symbol || 'USDC'}
                </span>
              </div>
              <div className="relative">
                <Input
                  id="amount-input"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl h-16 pr-28"
                  aria-describedby="amount-hint"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setAmount(tokenBalance)}
                    aria-label="Set maximum amount"
                  >
                    MAX
                  </Button>
                  <span className="font-medium text-white">{selectedPool?.asset.symbol || 'USDC'}</span>
                </div>
              </div>
              <p id="amount-hint" className="sr-only">
                Enter the amount of {selectedPool?.asset.symbol || 'stablecoins'} you want to deposit
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 bg-secondary-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-400">You will receive</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{estimatedReceive}</span>
                <span className="font-medium text-white">
                  {selectedPool?.receiptToken?.symbol || 'Receipt Tokens'}
                </span>
              </div>
            </div>

            {/* APY Info */}
            {selectedPool && (
              <div className={cn(
                'flex items-center justify-between p-4 border rounded-lg',
                selectedPool.risk.score === 'A' || selectedPool.risk.score === 'B'
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-orange-500/10 border-orange-500/20'
              )}>
                <div className="flex items-center gap-2">
                  <Coins className={cn(
                    'h-5 w-5',
                    selectedPool.risk.score === 'A' || selectedPool.risk.score === 'B'
                      ? 'text-green-400'
                      : 'text-orange-400'
                  )} aria-hidden="true" />
                  <span className={selectedPool.risk.score === 'A' || selectedPool.risk.score === 'B' ? 'text-green-300' : 'text-orange-300'}>
                    Current APY
                  </span>
                </div>
                <span className={cn(
                  'text-xl font-bold',
                  selectedPool.risk.score === 'A' || selectedPool.risk.score === 'B'
                    ? 'text-green-400'
                    : 'text-orange-400'
                )}>
                  {selectedPool.apy.net.toFixed(2)}%
                </span>
              </div>
            )}

            {/* Risk Warning */}
            {selectedPool && (selectedPool.risk.score === 'C' || selectedPool.risk.score === 'D') && (
              <div className="flex items-start gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg" role="alert">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm">
                  <p className="text-orange-200 font-medium">Higher Risk Protocol</p>
                  <p className="text-orange-200/70 mt-1">
                    This protocol has a risk rating of {selectedPool.risk.score}. Only deposit what you can afford to lose.
                  </p>
                </div>
              </div>
            )}

            {/* Deposit Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={!amount || parseFloat(amount) <= 0 || protocolAction.isLoading || allowance.isApproving}
              onClick={handleConvert}
            >
              {protocolAction.isLoading || allowance.isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  {allowance.isApproving ? 'Approving...' : 'Depositing...'}
                </>
              ) : !amount || parseFloat(amount) <= 0 ? (
                'Enter amount'
              ) : (
                <>
                  {needsApproval ? 'Approve & ' : ''}Deposit {selectedPool?.asset.symbol || 'USDC'}
                  <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-secondary-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Your deposit will earn yield automatically. You can withdraw anytime.
                {needsApproval && ' A one-time approval is required.'}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Your Positions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold text-white">Your Positions</h2>
        {isLoadingPositions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 bg-secondary-900 border-secondary-800 animate-pulse">
                <div className="h-24 bg-secondary-800 rounded" />
              </Card>
            ))}
          </div>
        ) : portfolio && portfolio.positions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.positions.map((position) => (
              <PositionCard
                key={position.poolId}
                position={position}
                onWithdraw={(pos) => {
                  setSelectedWithdrawPosition(pos);
                  setShowWithdrawModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <PositionEmptyState onDeposit={() => document.getElementById('amount-input')?.focus()} />
        )}
      </motion.div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setSelectedWithdrawPosition(null);
        }}
        position={selectedWithdrawPosition}
        onSuccess={() => {
          refetchPositions();
        }}
      />
    </div>
  );
}
