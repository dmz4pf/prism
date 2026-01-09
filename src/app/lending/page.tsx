'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TrendingUp,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLendingMarkets } from '@/hooks/lending/use-lending-markets';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { MarketCard } from '@/components/lending/market-card';
import { PositionCard } from '@/components/lending/position-card';
import { formatNumber, formatPercent, formatUSD, cn } from '@/lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { APYChart } from '@/components/charts/apy-chart';

export default function LendingPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow'>('supply');

  // Fetch markets data
  const {
    markets,
    bestSupplyByAsset,
    bestBorrowByAsset,
    isLoading: marketsLoading,
  } = useLendingMarkets({
    sortBy: activeTab === 'supply' ? 'supplyAPY' : 'borrowAPY',
    sortDirection: 'desc',
  });

  // Fetch user positions if connected
  const {
    positions,
    stats: aggregated,
    isLoading: positionsLoading,
  } = useLendingPositions({
    enabled: isConnected,
  });

  // Top markets by APY
  const topMarkets = markets.slice(0, 6);

  // Calculate total protocol stats
  const totalMarketSupply = markets.reduce(
    (sum, m) => sum + m.totalSupplyUSD,
    0
  );
  const totalMarketBorrow = markets.reduce(
    (sum, m) => sum + m.totalBorrowUSD,
    0
  );

  // Best APYs across all protocols
  const bestSupplyAPY = markets.reduce(
    (max, m) => Math.max(max, m.netSupplyAPY),
    0
  );
  const bestBorrowAPY = markets.reduce(
    (min, m) => (m.canBorrow ? Math.min(min, m.netBorrowAPY) : min),
    Infinity
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
          <Landmark className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-400">DeFi Lending & Borrowing</span>
        </div>

        <h1 className="font-heading text-4xl md:text-5xl font-bold text-white">
          Earn Yield & Borrow Against Your Assets
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Access the best rates across Aave, Morpho, Compound, and Moonwell.
          Supply assets to earn interest or borrow against your collateral.
        </p>

        {!isConnected && (
          <div className="pt-4">
            <ConnectButton />
          </div>
        )}
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Best Supply APY</p>
              <p className="text-2xl font-bold text-green-400">
                {formatPercent(bestSupplyAPY)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Best Borrow Rate</p>
              <p className="text-2xl font-bold text-orange-400">
                {bestBorrowAPY < Infinity ? formatPercent(bestBorrowAPY) : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Supply</p>
              <p className="text-2xl font-bold text-white">
                {formatUSD(totalMarketSupply, true)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Protocols</p>
              <p className="text-2xl font-bold text-white">4</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* User Positions (if connected) */}
      {isConnected && positions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Your Positions</h2>
            <Link href="/lending/positions">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.slice(0, 3).map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                compact
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Supply/Borrow Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
            <button
              onClick={() => setActiveTab('supply')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'supply'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Supply
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === 'borrow'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <ArrowUpRight className="h-4 w-4" />
              Borrow
            </button>
          </div>

          <Link href="/lending/markets">
            <Button variant="outline">
              Browse All Markets
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Top Markets */}
        {marketsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-20 bg-slate-800 rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                compact
                onSupply={() => {
                  window.location.href = `/lending/supply/${market.id}`;
                }}
                onBorrow={() => {
                  window.location.href = `/lending/borrow/${market.id}`;
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Lending APY History Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <APYChart
          protocols={['aave', 'compound', 'moonwell', 'morpho']}
          title="Lending APY History"
          height={300}
        />
      </motion.section>

    </div>
  );
}
