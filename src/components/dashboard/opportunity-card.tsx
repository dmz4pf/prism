'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APYBadge } from '@/components/custom/apy-badge';
import { RiskIndicator } from '@/components/custom/risk-indicator';
import { TokenIcon } from '@/components/custom/token-icon';
import { ChainBadge } from '@/components/custom/chain-badge';
import { formatUSD } from '@/lib/utils';
import type { Yield } from '@/types';

interface OpportunityCardProps {
  opportunity: Yield;
  onDeposit: (id: string) => void;
  className?: string;
}

export function OpportunityCard({ opportunity, onDeposit, className }: OpportunityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('p-4 card-hover cursor-pointer', className)}>
        <div className="flex items-start justify-between gap-4">
          {/* Token & Protocol Info */}
          <div className="flex items-center gap-3">
            <TokenIcon token={opportunity.token} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{opportunity.token}</span>
                <ChainBadge chainId={opportunity.chainId} />
              </div>
              <span className="text-sm text-secondary-400">{opportunity.protocol}</span>
            </div>
          </div>

          {/* APY Badge */}
          <APYBadge apy={opportunity.apy} size="lg" />
        </div>

        {/* Details Row */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-secondary-400">TVL</span>
              <span className="ml-2 font-mono text-white">
                {formatUSD(opportunity.tvlUsd, true)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-secondary-400">Risk</span>
              <RiskIndicator score={opportunity.risk} size="sm" />
            </div>
          </div>

          {/* Category Badge */}
          <span className="text-xs px-2 py-1 rounded bg-surface text-secondary-300 capitalize">
            {opportunity.category}
          </span>
        </div>

        {/* APY Breakdown */}
        {(opportunity.apyBase > 0 || opportunity.apyReward > 0) && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs">
            {opportunity.apyBase > 0 && (
              <span className="text-secondary-400">
                Base: <span className="text-white">{opportunity.apyBase.toFixed(2)}%</span>
              </span>
            )}
            {opportunity.apyReward > 0 && (
              <span className="text-secondary-400">
                Rewards: <span className="text-blue-400">{opportunity.apyReward.toFixed(2)}%</span>
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onDeposit(opportunity.id);
            }}
          >
            Deposit
          </Button>
          {opportunity.url && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                window.open(opportunity.url, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
