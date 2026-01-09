'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Wallet,
  TrendingUp,
  ArrowUpDown,
  Coins,
  Layers,
  ArrowRight,
  Plus,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePrismWallet, useStrategies } from '@/hooks/wallet';
import { StrategyFlow } from '@/components/strategies';

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const { hasWallet, totalValueUsd, tokenBalances } = usePrismWallet();
  const { positions, strategies } = useStrategies();
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'activity'>('overview');

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-600/20 flex items-center justify-center">
            <PieChart className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Your Portfolio</h1>
          <p className="text-slate-400">
            Connect your wallet to view your DeFi positions and track your earnings.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-600/20 flex items-center justify-center">
            <Wallet className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Your Prism Wallet</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            You need a Prism Smart Wallet to use DeFi strategies. Create one to get started.
          </p>
          <Link href="/wallet">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Create Prism Wallet
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Mock data for demo - in production, fetch from backend
  const portfolioSummary = {
    totalValueUsd,
    yieldEarnedAllTime: 245.67,
    yieldEarnedThisMonth: 45.23,
    currentBlendedAPY: 7.8,
    change24h: 12.45,
    change24hPercent: 0.5,
  };

  const assetAllocation = {
    staking: { valueUsd: totalValueUsd * 0.4, percentage: 40 },
    lending: { valueUsd: totalValueUsd * 0.25, percentage: 25 },
    stableYield: { valueUsd: totalValueUsd * 0.2, percentage: 20 },
    strategies: { valueUsd: totalValueUsd * 0.15, percentage: 15 },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400">Track your positions and earnings</p>
        </div>
        <div className="flex gap-2">
          <Link href="/wallet">
            <Button variant="outline" className="border-slate-600">
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </Button>
          </Link>
          <Link href="/strategies">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Position
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-4 gap-4"
      >
        <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 md:col-span-2">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400 mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-white">
              ${portfolioSummary.totalValueUsd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={
                  portfolioSummary.change24hPercent >= 0
                    ? 'border-green-500 text-green-400'
                    : 'border-red-500 text-red-400'
                }
              >
                {portfolioSummary.change24hPercent >= 0 ? '+' : ''}
                {portfolioSummary.change24hPercent.toFixed(2)}% (24h)
              </Badge>
              <span className="text-sm text-slate-400">
                {portfolioSummary.change24h >= 0 ? '+' : ''}$
                {portfolioSummary.change24h.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400 mb-1">Yield Earned (All Time)</p>
            <p className="text-2xl font-bold text-green-400">
              +${portfolioSummary.yieldEarnedAllTime.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              This month: +${portfolioSummary.yieldEarnedThisMonth.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400 mb-1">Blended APY</p>
            <p className="text-2xl font-bold text-white">
              {portfolioSummary.currentBlendedAPY.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Across all positions</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Asset Allocation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden mb-4">
              <div
                className="bg-green-500"
                style={{ width: `${assetAllocation.staking.percentage}%` }}
              />
              <div
                className="bg-blue-500"
                style={{ width: `${assetAllocation.lending.percentage}%` }}
              />
              <div
                className="bg-cyan-500"
                style={{ width: `${assetAllocation.stableYield.percentage}%` }}
              />
              <div
                className="bg-orange-500"
                style={{ width: `${assetAllocation.strategies.percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Staking', data: assetAllocation.staking, color: 'bg-green-500', icon: TrendingUp },
                { label: 'Lending', data: assetAllocation.lending, color: 'bg-blue-500', icon: ArrowUpDown },
                { label: 'Stable Yield', data: assetAllocation.stableYield, color: 'bg-cyan-500', icon: Coins },
                { label: 'Strategies', data: assetAllocation.strategies, color: 'bg-orange-500', icon: Layers },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">
                      {item.data.percentage}% (${item.data.valueUsd.toFixed(0)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <Link href="/simple/stake">
          <Card className="bg-slate-800 border-slate-700 hover:border-green-500/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Stake ETH</p>
                  <p className="text-xs text-slate-400">Up to 3.4% APY</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/simple/lend">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <ArrowUpDown className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Lend & Borrow</p>
                  <p className="text-xs text-slate-400">Up to 5.2% APY</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/simple/stable">
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Stable Yield</p>
                  <p className="text-xs text-slate-400">Up to 18% APY</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Strategy Positions */}
      {positions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Active Strategy Positions</CardTitle>
              <Link href="/strategies">
                <Button variant="ghost" size="sm" className="text-blue-400">
                  View All Strategies
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {positions.map(position => {
                const strategy = strategies.find(s => s.id === position.strategyId);
                return (
                  <div
                    key={position.id}
                    className="p-4 bg-slate-900 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{position.strategyName}</h4>
                        <p className="text-sm text-slate-400">
                          Running APY: {position.runningAPY.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          ${position.currentValue.toFixed(2)}
                        </p>
                        <p className="text-sm text-green-400">
                          +${position.profit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {strategy && (
                      <StrategyFlow steps={strategy.flow} size="sm" direction="horizontal" />
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className="text-sm text-slate-400">
                        Health Factor: {position.healthFactor.toFixed(2)}
                      </span>
                      <Link href={`/strategies/${position.strategyId}`}>
                        <Button variant="ghost" size="sm" className="text-blue-400">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-800/50 border-slate-700 border-dashed">
            <CardContent className="p-8 text-center">
              <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Active Positions</h3>
              <p className="text-slate-400 text-sm mb-4">
                Start earning yield by entering a strategy or using simple actions.
              </p>
              <Link href="/strategies">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Explore Strategies
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
