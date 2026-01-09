'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Wallet,
  RefreshCw,
  Download,
  Filter,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { PositionCard, PositionsSummary } from '@/components/lending/position-card';
import { LendingProtocol } from '@/types/lending';

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const [protocolFilter, setProtocolFilter] = useState<LendingProtocol | 'all'>('all');
  const [positionTypeFilter, setPositionTypeFilter] = useState<
    'all' | 'supply' | 'borrow'
  >('all');

  // Fetch positions
  const {
    positions,
    positionsByProtocol,
    stats: aggregated,
    isLoading,
    isError,
    error,
    refetch,
  } = useLendingPositions({
    enabled: isConnected,
  });

  // Filter positions
  const filteredPositions = positions.filter((position) => {
    const matchesProtocol =
      protocolFilter === 'all' || position.protocol === protocolFilter;

    const matchesType =
      positionTypeFilter === 'all' ||
      (positionTypeFilter === 'supply' && position.supplyBalance > 0n) ||
      (positionTypeFilter === 'borrow' && position.borrowBalance > 0n);

    return matchesProtocol && matchesType;
  });

  // Export positions as CSV
  const handleExport = () => {
    const csv = [
      ['Protocol', 'Asset', 'Supply', 'Supply USD', 'Borrow', 'Borrow USD', 'Health Factor'],
      ...filteredPositions.map((p) => [
        p.protocol,
        p.assetSymbol,
        (Number(p.supplyBalance) / 10 ** p.assetDecimals).toString(),
        p.supplyBalanceUSD.toString(),
        (Number(p.borrowBalance) / 10 ** p.assetDecimals).toString(),
        p.borrowBalanceUSD.toString(),
        p.healthFactor?.toFixed(2) || 'N/A',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-lending-positions-${Date.now()}.csv`;
    a.click();
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to view your lending positions
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Card className="p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Failed to Load Positions
          </h2>
          <p className="text-gray-400 mb-4">{error?.message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Positions</h1>
          <p className="text-gray-400">
            {positions.length > 0
              ? `Managing ${positions.length} position${positions.length !== 1 ? 's' : ''} across ${
                  Object.values(positionsByProtocol).filter((p) => p.length > 0).length
                } protocol${
                  Object.values(positionsByProtocol).filter((p) => p.length > 0).length !== 1
                    ? 's'
                    : ''
                }`
              : 'No active positions'}
          </p>
        </div>

        {positions.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="p-6 animate-pulse">
            <div className="h-32 bg-slate-800 rounded" />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-48 bg-slate-800 rounded" />
              </Card>
            ))}
          </div>
        </div>
      ) : positions.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Positions Yet</h2>
          <p className="text-gray-400 mb-6">
            Start earning yield by supplying assets to lending protocols
          </p>
          <Button onClick={() => (window.location.href = '/lending/markets')}>
            Browse Markets
          </Button>
        </Card>
      ) : (
        <>
          {/* Portfolio Summary */}
          <PositionsSummary
            totalSupplyUSD={aggregated.totalSupplyUSD}
            totalBorrowUSD={aggregated.totalBorrowUSD}
            netWorthUSD={aggregated.netWorthUSD}
            avgSupplyAPY={aggregated.weightedAvgSupplyAPY}
            avgBorrowAPY={aggregated.weightedAvgBorrowAPY}
            lowestHealthFactor={aggregated.lowestHealthFactor}
          />

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-gray-400" />

              <Select
                value={protocolFilter}
                onValueChange={(value) =>
                  setProtocolFilter(value as LendingProtocol | 'all')
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Protocols</SelectItem>
                  <SelectItem value="aave">Aave V3</SelectItem>
                  <SelectItem value="morpho">Morpho Blue</SelectItem>
                  <SelectItem value="compound">Compound III</SelectItem>
                  <SelectItem value="moonwell">Moonwell</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={positionTypeFilter}
                onValueChange={(value) =>
                  setPositionTypeFilter(value as 'all' | 'supply' | 'borrow')
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="supply">Supply Only</SelectItem>
                  <SelectItem value="borrow">With Borrows</SelectItem>
                </SelectContent>
              </Select>

              {(protocolFilter !== 'all' || positionTypeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setProtocolFilter('all');
                    setPositionTypeFilter('all');
                  }}
                  className="text-sm text-gray-400 hover:text-white ml-auto"
                >
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          {/* Positions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onWithdraw={(pos) => {
                  window.location.href = `/lending/withdraw/${pos.marketId}`;
                }}
                onRepay={(pos) => {
                  window.location.href = `/lending/repay/${pos.marketId}`;
                }}
                onSupplyMore={(pos) => {
                  window.location.href = `/lending/supply/${pos.marketId}`;
                }}
                onBorrowMore={(pos) => {
                  window.location.href = `/lending/borrow/${pos.marketId}`;
                }}
              />
            ))}
          </div>

          {filteredPositions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-400">No positions match your filters</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
