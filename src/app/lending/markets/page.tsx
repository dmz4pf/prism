'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Grid3x3,
  List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLendingMarkets } from '@/hooks/lending/use-lending-markets';
import { MarketCard } from '@/components/lending/market-card';
import { LendingProtocol } from '@/types/lending';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type MarketSortField = 'supplyAPY' | 'borrowAPY' | 'totalSupplyUSD' | 'totalBorrowUSD' | 'utilization';

export default function MarketsPage() {
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter State
  const [selectedProtocol, setSelectedProtocol] = useState<LendingProtocol | 'all'>('all');
  const [sortBy, setSortBy] = useState<MarketSortField>('totalSupplyUSD');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minAPY, setMinAPY] = useState<number>(0);

  // Fetch markets with filters
  const {
    markets,
    bestSupplyByAsset,
    isLoading,
    isError,
    error,
  } = useLendingMarkets({
    protocol: selectedProtocol !== 'all' ? selectedProtocol : undefined,
    sortBy,
    sortDirection,
  });

  // Client-side filtering for search and APY
  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        market.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.protocol.toLowerCase().includes(searchQuery.toLowerCase());

      // APY filter
      const matchesAPY = market.supplyAPY >= minAPY || market.borrowAPY >= minAPY;

      return matchesSearch && matchesAPY;
    });
  }, [markets, searchQuery, minAPY]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Browse Markets</h1>
        <p className="text-gray-400">
          Compare lending markets across {markets.length} pools and 4 protocols
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by asset or protocol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 p-1 bg-surface rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filters Toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-border mt-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Protocol Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Protocol
                </label>
                <Select
                  value={selectedProtocol}
                  onValueChange={(value) =>
                    setSelectedProtocol(value as LendingProtocol | 'all')
                  }
                >
                  <SelectTrigger>
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
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Sort By
                </label>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as MarketSortField)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplyAPY">Supply APY</SelectItem>
                    <SelectItem value="borrowAPY">Borrow APY</SelectItem>
                    <SelectItem value="totalSupplyUSD">Total Supply</SelectItem>
                    <SelectItem value="totalBorrowUSD">Total Borrowed</SelectItem>
                    <SelectItem value="utilization">Utilization</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min APY */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Min APY (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minAPY}
                  onChange={(e) => setMinAPY(parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedProtocol !== 'all' || minAPY > 0) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-400">Active filters:</span>
                {selectedProtocol !== 'all' && (
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm">
                    {selectedProtocol}
                  </span>
                )}
                {minAPY > 0 && (
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm">
                    APY ≥ {minAPY}%
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedProtocol('all');
                    setMinAPY(0);
                  }}
                  className="text-sm text-gray-400 hover:text-white ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {filteredMarkets.length} of {markets.length} markets
        </p>

        {/* Sort Direction Indicator */}
        <button
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          {sortDirection === 'desc' ? (
            <>
              <TrendingDown className="h-4 w-4" />
              High to Low
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              Low to High
            </>
          )}
        </button>
      </div>

      {/* Markets Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-40 bg-slate-800 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center">
          <p className="text-red-500 mb-2">Failed to load markets</p>
          <p className="text-sm text-gray-400">{error?.message}</p>
        </Card>
      ) : filteredMarkets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-400 mb-2">No markets found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or search query
          </p>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}
        >
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              compact={viewMode === 'list'}
              isRecommended={
                bestSupplyByAsset[market.assetSymbol]?.id === market.id
              }
              recommendationReason={
                bestSupplyByAsset[market.assetSymbol]?.id === market.id
                  ? 'Highest Supply APY'
                  : undefined
              }
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
    </div>
  );
}
