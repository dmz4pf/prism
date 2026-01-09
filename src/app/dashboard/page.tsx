'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  TrendingUp,
  Landmark,
  Coins,
  Link2,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Clock,
  ChevronRight,
  Wallet,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StakingEmptyState,
  LendingEmptyState,
  StableYieldEmptyState,
  StrategiesEmptyState,
} from '@/components/ui/empty-state';
import {
  StakingCardSkeleton,
  LendingCardSkeleton,
  StableYieldCardSkeleton,
  StrategiesCardSkeleton,
  PortfolioOverviewSkeleton,
  ChartSkeleton,
} from '@/components/ui/skeleton';
import {
  StakingErrorBoundary,
  LendingErrorBoundary,
  StableYieldErrorBoundary,
  StrategiesErrorBoundary,
  ChartErrorBoundary,
} from '@/components/error-boundary/error-boundary';
import { TokenLogo } from '@/components/ui/token-logo';
import { APYTooltip } from '@/components/ui/apy-tooltip';
import { TestnetBanner, TestnetBadge, MockDataIndicator } from '@/components/ui/testnet-banner';
import { PortfolioChart } from '@/components/dashboard/portfolio-chart';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { useStrategies } from '@/hooks/wallet/use-strategies';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { useStakingPositions } from '@/hooks/staking/use-staking-positions';
import { useUserPositions as useStablePositions } from '@/hooks/stablecoin/use-user-positions';
import { CreateWalletModal } from '@/components/modals';
import { formatUSD } from '@/lib/utils';
import { isTestnet } from '@/lib/utils/network';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};


// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { hasWallet, isLoading: isLoadingWallet } = usePrismWallet();
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const testnet = isTestnet();

  // ==========================================================================
  // DATA HOOKS - Testnet-aware (auto-switch to mock data)
  // ==========================================================================

  const {
    positions: stakingPositions,
    stats: stakingStats,
    isLoading: isLoadingStaking,
    isMockData: isStakingMock,
  } = useStakingPositions({ enabled: isConnected });

  const {
    positions: lendingPositions,
    stats: lendingStats,
    isLoading: isLoadingLending,
  } = useLendingPositions({ enabled: isConnected });

  const {
    positions: stablePositions,
    totalValue: stableTotalValue,
    totalEarnings: stableEarnings,
    avgApy: stableAvgApy,
    isLoading: isLoadingStable,
    isMockData: isStableMock,
  } = useStablePositions();

  const { positions: strategyPositions, isLoading: isLoadingStrategies } = useStrategies();

  // ==========================================================================
  // CALCULATED PORTFOLIO METRICS
  // ==========================================================================

  const portfolioMetrics = useMemo(() => {
    const totalValue =
      stakingStats.totalValueUsd +
      (lendingStats?.netWorthUSD || 0) +
      stableTotalValue;

    const yieldEarned = stakingStats.totalEarnedUsd + stableEarnings;

    const stakingWeight = stakingStats.totalValueUsd;
    const lendingWeight = lendingStats?.netWorthUSD || 0;
    const stableWeight = stableTotalValue;
    const totalWeight = stakingWeight + lendingWeight + stableWeight;

    let currentAPY = 0;
    if (totalWeight > 0) {
      const weightedAPY =
        stakingStats.weightedAvgAPY * stakingWeight +
        (lendingStats?.weightedAvgSupplyAPY || 0) * lendingWeight +
        stableAvgApy * stableWeight;
      currentAPY = weightedAPY / totalWeight;
    }

    return { totalValue, yieldEarned, currentAPY };
  }, [stakingStats, lendingStats, stableTotalValue, stableEarnings, stableAvgApy]);

  const isLoadingAny = isLoadingStaking || isLoadingLending || isLoadingStable;
  const hasMockData = isStakingMock || isStableMock;

  // ==========================================================================
  // NOT CONNECTED STATE
  // ==========================================================================

  if (!isConnected) {
    return (
      <>
        <TestnetBanner />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prism-section-box max-w-lg text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-secondary-700 flex items-center justify-center mx-auto">
              <Wallet className="h-10 w-10 text-secondary-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-400">Connect to view your portfolio.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ==========================================================================
  // NO SMART WALLET STATE
  // ==========================================================================

  if (!hasWallet && !isLoadingWallet) {
    return (
      <>
        <TestnetBanner />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <CreateWalletModal
            open={showCreateWallet}
            onClose={() => setShowCreateWallet(false)}
            onSuccess={() => setShowCreateWallet(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prism-section-box max-w-lg text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-secondary-700 flex items-center justify-center mx-auto">
              <TrendingUp className="h-10 w-10 text-green-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">
              Create Your Smart Wallet
            </h1>
            <p className="text-secondary-400">
              Create your smart wallet to get started.
            </p>
            <Button size="lg" onClick={() => setShowCreateWallet(true)}>
              Create Prism Wallet
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  // ==========================================================================
  // MAIN DASHBOARD
  // ==========================================================================

  return (
    <>
      {/* Testnet Warning Banner */}
      <TestnetBanner />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Overview Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prism-section-box-gradient"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-secondary-400 mb-1">
                  Total Portfolio Value
                </p>
                {hasMockData && <TestnetBadge />}
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white">
                {isLoadingAny ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-2xl">Loading...</span>
                  </span>
                ) : (
                  formatUSD(portfolioMetrics.totalValue)
                )}
              </h1>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-secondary-500">Yield Earned</p>
                  <p className="text-lg font-semibold text-green-400">
                    {isLoadingAny
                      ? '...'
                      : `+${formatUSD(portfolioMetrics.yieldEarned)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Current APY</p>
                  <p className="text-lg font-semibold text-green-400">
                    {isLoadingAny
                      ? '...'
                      : `${portfolioMetrics.currentAPY.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/wallet">
                <Button size="lg">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Deposit
                </Button>
              </Link>
              <Button variant="outline" size="lg" disabled={testnet}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw All
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Portfolio Performance Chart */}
        <ChartErrorBoundary>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="prism-feature-card"
          >
            <PortfolioChart height={280} />
          </motion.section>
        </ChartErrorBoundary>

        {/* Position Cards Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* STAKING POSITIONS */}
          <motion.div variants={itemVariants}>
            {isLoadingStaking ? (
              <StakingCardSkeleton />
            ) : (
              <StakingErrorBoundary>
                <div className="prism-feature-card h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">Staking</h3>
                        {isStakingMock && <MockDataIndicator />}
                      </div>
                      <p className="text-xs text-secondary-400">
                        {`${stakingPositions.length} position(s)`}
                      </p>
                    </div>
                  </div>

                  {stakingPositions.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {stakingPositions.slice(0, 3).map((pos) => (
                          <div
                            key={pos.id}
                            className="p-3 bg-surface/50 rounded-lg border border-border"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <TokenLogo symbol={pos.token.symbol} size="xs" />
                                <span className="text-sm font-medium text-white">
                                  {pos.balance} {pos.token.symbol}
                                </span>
                              </div>
                              <APYTooltip apy={pos.apy} size="sm" showIcon={false} />
                            </div>
                            <p className="text-xs text-secondary-400">{pos.protocol}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href="/simple/stake" className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={testnet}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add More
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <StakingEmptyState compact />
                  )}
                </div>
              </StakingErrorBoundary>
            )}
          </motion.div>

          {/* LENDING POSITIONS */}
          <motion.div variants={itemVariants}>
            {isLoadingLending ? (
              <LendingCardSkeleton />
            ) : (
              <LendingErrorBoundary>
                <div className="prism-feature-card h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Lending</h3>
                      <p className="text-xs text-secondary-400">
                        {`${lendingPositions.length} position(s)`}
                      </p>
                    </div>
                  </div>

                  {lendingPositions.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {lendingPositions.slice(0, 3).map((pos) => {
                          const supplyAmount = (
                            Number(pos.supplyBalance) /
                            10 ** pos.assetDecimals
                          ).toFixed(2);
                          const borrowAmount = (
                            Number(pos.borrowBalance) /
                            10 ** pos.assetDecimals
                          ).toFixed(2);
                          const hasSupply = pos.supplyBalance > 0n;
                          const hasBorrow = pos.borrowBalance > 0n;

                          return (
                            <div
                              key={pos.id}
                              className="p-3 bg-surface/50 rounded-lg border border-border"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <TokenLogo symbol={pos.assetSymbol} size="xs" />
                                  <div className="flex flex-col">
                                    {hasSupply && (
                                      <span className="text-sm font-medium text-white">
                                        {supplyAmount} {pos.assetSymbol}
                                      </span>
                                    )}
                                    {hasBorrow && (
                                      <span className="text-xs text-orange-400">
                                        -{borrowAmount} borrowed
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                  {hasSupply && (
                                    <span className="text-xs font-mono text-green-400">
                                      +{pos.currentSupplyAPY.toFixed(2)}%
                                    </span>
                                  )}
                                  {hasBorrow && (
                                    <span className="text-xs font-mono text-orange-400">
                                      -{pos.currentBorrowAPY.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-secondary-400">{pos.protocol}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href="/lending/markets" className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Plus className="h-3 w-3 mr-1" />
                            Supply More
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <LendingEmptyState compact />
                  )}
                </div>
              </LendingErrorBoundary>
            )}
          </motion.div>

          {/* STABLE YIELD POSITIONS */}
          <motion.div variants={itemVariants}>
            {isLoadingStable ? (
              <StableYieldCardSkeleton />
            ) : (
              <StableYieldErrorBoundary>
                <div className="prism-feature-card h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">Stable Yield</h3>
                        {isStableMock && <MockDataIndicator />}
                      </div>
                      <p className="text-xs text-secondary-400">
                        {`${stablePositions.length} position(s)`}
                      </p>
                    </div>
                  </div>

                  {stablePositions.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {stablePositions.slice(0, 3).map((pos) => (
                          <div
                            key={pos.poolId}
                            className="p-3 bg-surface/50 rounded-lg border border-border"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <TokenLogo symbol={pos.pool.asset.symbol} size="xs" />
                                <span className="text-sm font-medium text-white">
                                  {formatUSD(pos.supplied.usd)}
                                </span>
                              </div>
                              <APYTooltip
                                apy={pos.currentApy}
                                size="sm"
                                showIcon={false}
                              />
                            </div>
                            <p className="text-xs text-secondary-400">
                              {pos.pool.protocol.charAt(0).toUpperCase() +
                                pos.pool.protocol.slice(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href="/simple/stable" className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={testnet}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add More
                          </Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <StableYieldEmptyState compact />
                  )}
                </div>
              </StableYieldErrorBoundary>
            )}
          </motion.div>

          {/* STRATEGY POSITIONS */}
          <motion.div variants={itemVariants}>
            {isLoadingStrategies ? (
              <StrategiesCardSkeleton />
            ) : (
              <StrategiesErrorBoundary>
                <div className="prism-feature-card h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary-700 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-secondary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Strategies</h3>
                    <p className="text-xs text-secondary-400">
                      {strategyPositions.length} active
                    </p>
                  </div>
                </div>

                {strategyPositions.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {strategyPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className="p-3 bg-surface/50 rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {formatUSD(pos.currentValue)}
                            </span>
                            <span className="text-xs text-green-400 font-mono">
                              +{((pos.profit / pos.originalDeposit) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-secondary-400">
                            {pos.strategyName}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href="/strategies" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-3 w-3 mr-1" />
                          Add More
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <StrategiesEmptyState compact />
                )}
              </div>
            </StrategiesErrorBoundary>
            )}
          </motion.div>
        </motion.section>

        {/* Quick Actions Bar */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
        >
          <h2 className="font-heading text-lg font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/simple/stake">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex-col gap-2"
                disabled={testnet}
              >
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span>Stake ETH</span>
              </Button>
            </Link>
            <Link href="/lending">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex-col gap-2"
              >
                <Landmark className="h-5 w-5 text-blue-400" />
                <span>Supply to Lending</span>
              </Button>
            </Link>
            <Link href="/simple/stable">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex-col gap-2"
                disabled={testnet}
              >
                <Coins className="h-5 w-5 text-yellow-400" />
                <span>Get Stable Yield</span>
              </Button>
            </Link>
            <Link href="/strategies">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex-col gap-2"
              >
                <Link2 className="h-5 w-5 text-secondary-400" />
                <span>View Strategies</span>
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Activity Feed */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-white">
              Recent Activity
            </h2>
            <Link href="/activity">
              <Button
                variant="ghost"
                size="sm"
                className="text-secondary-400 hover:text-white"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="prism-feature-card !p-6 text-center">
            <Clock className="h-10 w-10 text-secondary-600 mx-auto mb-3" />
            <p className="text-secondary-400 text-sm">
              {testnet
                ? 'Activity tracking available on mainnet'
                : 'Activity tracking coming soon'}
            </p>
            <p className="text-secondary-500 text-xs mt-1">
              Your transaction history will appear here
            </p>
          </div>
        </motion.section>
      </div>
    </>
  );
}
