'use client';

import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import CountUp from 'react-countup';
import { Trophy, Users, Coins, Gift, Star, Clock, TrendingUp, Medal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  usePoints,
  useLeaderboard,
  useUserRank,
  usePointsBreakdown,
  useSeasonInfo,
} from '@/hooks/data';
import { cn, shortenAddress } from '@/lib/utils';

const pointsCategories = [
  {
    key: 'deposits',
    label: 'Deposits',
    description: 'Earn 1 point per $1 deposited per day',
    icon: Coins,
    color: 'text-blue-400',
  },
  {
    key: 'staking',
    label: 'Staking',
    description: 'Earn 1.5x points for staked positions',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    key: 'referral',
    label: 'Referrals',
    description: 'Earn 10% of your referrals\' points',
    icon: Users,
    color: 'text-warning',
  },
  {
    key: 'bonus',
    label: 'Bonus',
    description: 'Special events and achievements',
    icon: Gift,
    color: 'text-cyan-400',
  },
];

export default function PointsPage() {
  const { isConnected, address } = useAccount();
  const { data: points, isLoading: pointsLoading } = usePoints();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(20);
  const { rank, isTopTen, isTopHundred } = useUserRank();
  const { breakdown } = usePointsBreakdown();
  const seasonInfo = useSeasonInfo();

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            PRISM Points
          </h1>
          <p className="text-secondary-400 mb-6">
            Connect your wallet to view your points, track your rank, and see the leaderboard.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">PRISM Points</h1>
          <p className="text-secondary-400">Earn points by depositing, staking, and referring friends</p>
        </div>
        {seasonInfo && (
          <Badge variant="secondary" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            Season {seasonInfo.season} • {seasonInfo.daysRemaining} days left
          </Badge>
        )}
      </div>

      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-400/10 border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-secondary-400">Total Points</span>
            </div>
            <div className="text-4xl font-bold font-mono text-white">
              {pointsLoading ? (
                <div className="h-10 w-32 bg-surface rounded animate-pulse" />
              ) : (
                <CountUp
                  end={points?.totalPoints ?? 0}
                  duration={1.5}
                  separator=","
                />
              )}
            </div>
            {seasonInfo && (
              <p className="text-sm text-blue-400 mt-2">
                {seasonInfo.multiplier}x Season Multiplier Active
              </p>
            )}
          </Card>
        </motion.div>

        {/* Rank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-warning" />
              <span className="text-sm text-secondary-400">Your Rank</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold font-mono text-white">
                {rank ? `#${rank}` : '-'}
              </span>
              {isTopTen && (
                <Badge variant="success" className="text-xs">
                  <Medal className="h-3 w-3 mr-1" />
                  Top 10
                </Badge>
              )}
              {isTopHundred && !isTopTen && (
                <Badge variant="secondary" className="text-xs">Top 100</Badge>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Season Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-secondary-400" />
              <span className="text-sm text-secondary-400">Season Progress</span>
            </div>
            {seasonInfo && (
              <>
                <div className="h-2 bg-surface rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${seasonInfo.progressPercent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  />
                </div>
                <p className="text-sm text-secondary-400">
                  {seasonInfo.progressPercent.toFixed(0)}% complete
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Points Breakdown */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-white mb-4">
          Points Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pointsCategories.map((category, i) => (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <Card className="p-4 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('p-2 rounded-lg bg-surface', category.color)}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{category.label}</p>
                    <p className="text-xs text-secondary-400">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {breakdown
                      ? (breakdown[`${category.key}Points` as keyof typeof breakdown] as number).toLocaleString()
                      : '-'}
                  </span>
                  {breakdown && (
                    <span className="text-xs text-secondary-400">
                      {breakdown.percentages[category.key as keyof typeof breakdown.percentages]?.toFixed(1)}%
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-white">
            Leaderboard
          </h2>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>

        <Card className="overflow-hidden">
          {leaderboardLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-surface rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm text-secondary-400 bg-surface/50">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Address</div>
                <div className="col-span-3 text-right">Points</div>
                <div className="col-span-3 text-right">Deposits</div>
              </div>

              {/* Rows */}
              {leaderboard?.map((entry, i) => {
                const isUser = entry.address.toLowerCase() === address?.toLowerCase();
                return (
                  <motion.div
                    key={entry.address}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 text-sm transition-colors hover:bg-surface/30',
                      isUser && 'bg-blue-500/10 border-l-2 border-blue-500'
                    )}
                  >
                    <div className="col-span-1 flex items-center gap-2">
                      {i === 0 && <Medal className="h-4 w-4 text-yellow-400" />}
                      {i === 1 && <Medal className="h-4 w-4 text-secondary-400" />}
                      {i === 2 && <Medal className="h-4 w-4 text-amber-600" />}
                      {i > 2 && <span className="text-secondary-400">#{i + 1}</span>}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <span className={cn('font-mono', isUser ? 'text-blue-400' : 'text-white')}>
                        {shortenAddress(entry.address)}
                      </span>
                      {isUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="col-span-3 text-right font-mono text-white">
                      {entry.totalPoints.toLocaleString()}
                    </div>
                    <div className="col-span-3 text-right font-mono text-secondary-400">
                      ${entry.totalDeposits.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* How to Earn */}
      <section className="border-t border-border pt-8">
        <h2 className="font-heading text-xl font-semibold text-white mb-4">
          How to Earn Points
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">1</div>
            <h3 className="font-semibold text-white mb-2">Deposit Assets</h3>
            <p className="text-sm text-secondary-400">
              Earn 1 point per $1 deposited per day across any supported protocol.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">2</div>
            <h3 className="font-semibold text-white mb-2">Stake for Bonus</h3>
            <p className="text-sm text-secondary-400">
              Staking positions earn 1.5x points. ETH staking gets you even more.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-3xl font-bold text-blue-400 mb-2">3</div>
            <h3 className="font-semibold text-white mb-2">Refer Friends</h3>
            <p className="text-sm text-secondary-400">
              Share your referral link and earn 10% of all points your referrals earn.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
