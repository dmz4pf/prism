'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  RefreshCw,
  Link2,
  ExternalLink,
  Clock,
  Search,
  Loader2,
  AlertCircle,
  Repeat,
  TrendingUp,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useActivity, filterActivities, searchActivities } from '@/hooks/data/use-activity';
import { getTxExplorerUrl } from '@/contracts/addresses/network-config';
import type { Activity } from '@/services/activity-service';

const filterOptions = ['all', 'stake', 'supply', 'withdraw', 'swap', 'transfer'];
const filterLabels: Record<string, string> = {
  all: 'All',
  stake: 'Stake',
  supply: 'Supply',
  withdraw: 'Withdraw',
  swap: 'Swap',
  transfer: 'Transfer',
};

export default function ActivityPage() {
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real activity data with pagination
  const {
    activities,
    isLoading,
    isError,
    refetch,
    hasMore,
    loadMore,
    isLoadingMore,
    totalLoaded,
  } = useActivity({ limit: 100 });

  // Filter and search activities
  const filteredActivity = useMemo(() => {
    let result = filterActivities(activities, filter);
    result = searchActivities(result, searchQuery);
    return result;
  }, [activities, filter, searchQuery]);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'stake':
        return <TrendingUp className="h-5 w-5 text-purple-400" />;
      case 'supply':
        return <ArrowUpRight className="h-5 w-5 text-green-400" />;
      case 'withdraw':
        return <ArrowDownLeft className="h-5 w-5 text-orange-400" />;
      case 'borrow':
        return <Landmark className="h-5 w-5 text-blue-400" />;
      case 'repay':
        return <ArrowUpRight className="h-5 w-5 text-cyan-400" />;
      case 'swap':
        return <Repeat className="h-5 w-5 text-yellow-400" />;
      case 'transfer':
        return <Coins className="h-5 w-5 text-gray-400" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

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
          <p className="text-gray-400 mb-6">
            Connect your wallet to view your transaction history.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">Activity</h1>
          <p className="text-gray-400">Your transaction history</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option}
              variant={filter === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option)}
            >
              {filterLabels[option]}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative md:ml-auto md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </motion.div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-gray-400 mb-4">Failed to load transaction history</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </motion.div>
      )}

      {/* Activity List */}
      {!isLoading && !isError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden">
            {filteredActivity.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 md:p-6 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start md:items-center justify-between gap-4">
                      <div className="flex items-start md:items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{activity.action}</p>
                          <p className="text-sm text-gray-400">{activity.protocol}</p>
                          <div className="flex items-center gap-2 mt-1 md:hidden">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{activity.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <p className="font-medium text-white">{activity.amount}</p>
                          <p className="text-sm text-gray-400">
                            ${activity.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="text-right hidden md:block">
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </div>
                        </div>

                        <a
                          href={getTxExplorerUrl(activity.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {/* Mobile amount display */}
                    <div className="md:hidden mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Amount</span>
                        <span className="font-medium text-white">{activity.amount}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-400">Value</span>
                        <span className="text-sm text-white">
                          ${activity.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchQuery || filter !== 'all'
                    ? 'No transactions found matching your filters'
                    : 'No transactions yet'}
                </p>
                {(searchQuery || filter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilter('all');
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Load More Button */}
            {filteredActivity.length > 0 && hasMore && (
              <div className="p-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More ({totalLoaded} of {activities.length + (hasMore ? '+' : '')} loaded)
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
