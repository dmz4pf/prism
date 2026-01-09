'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APYBadge } from '@/components/custom/apy-badge';
import { TokenIcon } from '@/components/custom/token-icon';
import { ChainBadge } from '@/components/custom/chain-badge';
import { formatUSD } from '@/lib/utils';
import type { Position } from '@/types';

interface PositionCardProps {
  position: Position;
  onWithdraw: (id: string) => void;
  className?: string;
}

export function PositionCard({ position, onWithdraw, className }: PositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const depositDate = new Date(position.depositedAt);
  const timeAgo = formatDistanceToNow(depositDate, { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        {/* Main Row */}
        <div
          className="p-4 cursor-pointer hover:bg-surface/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            {/* Left: Token & Protocol */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <TokenIcon token={position.token} size="lg" />
                {position.status === 'active' && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{position.token}</span>
                  <ChainBadge chainId={position.chainId} />
                  <Badge
                    variant={position.status === 'active' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {position.status}
                  </Badge>
                </div>
                <span className="text-sm text-secondary-400">{position.protocol}</span>
              </div>
            </div>

            {/* Center: Value & Earnings */}
            <div className="hidden md:flex items-center gap-8">
              <div className="text-right">
                <p className="text-sm text-secondary-400">Deposited</p>
                <p className="font-mono font-semibold text-white">
                  {formatUSD(position.amountUsd)}
                </p>
              </div>
              {position.earnings !== undefined && position.earnings > 0 && (
                <div className="text-right">
                  <p className="text-sm text-secondary-400">Earnings</p>
                  <p className="font-mono font-semibold text-success flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />+{formatUSD(position.earnings)}
                  </p>
                </div>
              )}
            </div>

            {/* Right: APY & Expand */}
            <div className="flex items-center gap-3">
              <APYBadge apy={position.apy} />
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-secondary-400" />
              </motion.div>
            </div>
          </div>

          {/* Mobile: Value display */}
          <div className="mt-3 flex items-center justify-between md:hidden text-sm">
            <span className="text-secondary-400">Deposited: {formatUSD(position.amountUsd)}</span>
            {position.earnings !== undefined && position.earnings > 0 && (
              <span className="text-success">+{formatUSD(position.earnings)}</span>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-secondary-400">Amount</p>
                    <p className="font-mono text-white">
                      {parseFloat(position.amount).toFixed(4)} {position.token}
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary-400">Deposited</p>
                    <p className="text-white">{timeAgo}</p>
                  </div>
                  <div>
                    <p className="text-secondary-400">TX Hash</p>
                    <a
                      href={`https://basescan.org/tx/${position.depositTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {position.depositTxHash.slice(0, 8)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <p className="text-secondary-400">Verified</p>
                    <p className={position.verified ? 'text-success' : 'text-warning'}>
                      {position.verified ? 'Yes' : 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWithdraw(position.id);
                    }}
                  >
                    Withdraw
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Add More
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
