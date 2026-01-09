/**
 * Position Card Component
 *
 * Displays a user's stablecoin position in a protocol.
 * Shows: deposited amount, current APY, earnings, and withdraw action.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, ChevronRight, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserStablecoinPosition } from '@/types/stablecoin';
import { PROTOCOL_METADATA, getExplorerUrl } from '@/contracts/addresses/stablecoin-protocols';
import { formatUSD, cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface PositionCardProps {
  position: UserStablecoinPosition;
  onWithdraw?: (position: UserStablecoinPosition) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PositionCard({ position, onWithdraw, className }: PositionCardProps) {
  const { pool, supplied, accruedInterest, currentApy, totalValue, profitLoss } = position;
  const protocol = PROTOCOL_METADATA[pool.protocol];

  return (
    <Card className={cn('p-4 bg-secondary-900 border-secondary-800', className)}>
      {/* Header: Protocol + Asset */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Protocol Logo */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: protocol.color + '30' }}
          >
            {pool.asset.symbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-white">{protocol.displayName}</p>
            <p className="text-sm text-secondary-400">{pool.asset.symbol}</p>
          </div>
        </div>

        {/* Value */}
        <div className="text-right">
          <p className="font-semibold text-white">{formatUSD(totalValue.usd)}</p>
          {profitLoss.usd > 0 && (
            <p className="text-sm text-green-400 flex items-center justify-end gap-1">
              <TrendingUp className="h-3 w-3" />+{formatUSD(profitLoss.usd)}
            </p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-secondary-800">
        <div>
          <p className="text-xs text-secondary-500">Deposited</p>
          <p className="text-sm font-medium text-white">{formatUSD(supplied.usd)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary-500">Current APY</p>
          <p className="text-sm font-medium text-green-400">{currentApy.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-secondary-500">Earnings</p>
          <p className="text-sm font-medium text-green-400">+{formatUSD(accruedInterest.usd)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 border-secondary-700 hover:bg-secondary-800"
          onClick={() => onWithdraw?.(position)}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Withdraw
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-secondary-500 hover:text-white"
          asChild
        >
          <a
            href={getExplorerUrl(pool.poolAddress, 'address')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on explorer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </Card>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

interface PositionCardCompactProps {
  position: UserStablecoinPosition;
  onClick?: () => void;
  className?: string;
}

export function PositionCardCompact({ position, onClick, className }: PositionCardCompactProps) {
  const { pool, totalValue, currentApy } = position;
  const protocol = PROTOCOL_METADATA[pool.protocol];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Card
        className="p-3 bg-secondary-900 border-secondary-800 cursor-pointer hover:border-secondary-700 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: protocol.color + '30' }}
            >
              {pool.asset.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{protocol.displayName}</p>
              <p className="text-xs text-secondary-400">{pool.asset.symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">{formatUSD(totalValue.usd)}</p>
            <p className="text-xs text-green-400">{currentApy.toFixed(1)}% APY</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface PositionEmptyStateProps {
  onDeposit?: () => void;
}

export function PositionEmptyState({ onDeposit }: PositionEmptyStateProps) {
  return (
    <Card className="p-6 bg-secondary-900 border-secondary-800 border-dashed">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Wallet className="h-6 w-6 text-yellow-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Positions Yet</h3>
        <p className="text-secondary-400 text-sm mb-4">
          Deposit stablecoins to start earning yield automatically.
        </p>
        {onDeposit && (
          <Button onClick={onDeposit} className="bg-blue-600 hover:bg-blue-700">
            Deposit Now
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default PositionCard;
