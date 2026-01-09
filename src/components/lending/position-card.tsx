'use client';

/**
 * PositionCard Component
 *
 * Displays a user's lending position with actions.
 */

import { LendingPosition, LendingProtocol } from '@/types/lending';
import { PROTOCOL_INFO } from '@/services/lending';
import { formatNumber, formatPercent } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HealthFactorBadge } from './health-factor-display';

// =============================================================================
// TYPES
// =============================================================================

export interface PositionCardProps {
  /** Position data */
  position: LendingPosition;
  /** On withdraw click */
  onWithdraw?: (position: LendingPosition) => void;
  /** On repay click */
  onRepay?: (position: LendingPosition) => void;
  /** On supply more click */
  onSupplyMore?: (position: LendingPosition) => void;
  /** On borrow more click */
  onBorrowMore?: (position: LendingPosition) => void;
  /** Compact mode */
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PositionCard({
  position,
  onWithdraw,
  onRepay,
  onSupplyMore,
  onBorrowMore,
  compact = false,
}: PositionCardProps) {
  const protocolInfo = PROTOCOL_INFO[position.protocol];
  const hasSupply = position.supplyBalance > 0n;
  const hasBorrow = position.borrowBalance > 0n;
  const isAtRisk = position.healthFactor !== undefined && position.healthFactor < 1.2;

  if (compact) {
    return (
      <div className={`prism-feature-card p-4 ${isAtRisk ? 'border-orange-500/50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
              <span className="text-sm font-medium">{position.assetSymbol[0]}</span>
            </div>
            <div>
              <div className="font-medium">{position.assetSymbol}</div>
              <div className="text-xs text-gray-400">{protocolInfo?.name}</div>
            </div>
          </div>

          <div className="text-right">
            {hasSupply && (
              <div className="text-green-500">
                +${formatNumber(position.supplyBalanceUSD)}
              </div>
            )}
            {hasBorrow && (
              <div className="text-orange-500">
                -${formatNumber(position.borrowBalanceUSD)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        prism-feature-card-hover p-5
        ${isAtRisk ? 'ring-2 ring-orange-500/50' : ''}
      `}
    >
      {/* Risk Warning */}
      {isAtRisk && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-orange-500">
            Position at risk - consider repaying or adding collateral
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
              <span className="text-lg font-semibold">{position.assetSymbol[0]}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background-card border border-border flex items-center justify-center">
              <span className="text-[10px] font-medium">
                {position.protocol[0].toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-semibold text-lg">{position.assetSymbol}</div>
            <div className="text-sm text-gray-400">{protocolInfo?.name}</div>
          </div>
        </div>

        {/* Health Factor */}
        {position.healthFactor !== undefined && position.healthFactor < Infinity && (
          <HealthFactorBadge healthFactor={position.healthFactor} />
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Supply */}
        <div className="p-3 rounded-lg bg-surface/50">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-400">Supplied</span>
          </div>
          <div className="text-xl font-bold text-green-500">
            ${formatNumber(position.supplyBalanceUSD)}
          </div>
          <div className="text-xs text-gray-500">
            {formatNumber(Number(position.supplyBalance) / 10 ** position.assetDecimals)}{' '}
            {position.assetSymbol}
          </div>
          <div className="text-xs text-green-400 mt-1">
            +{formatPercent(position.currentSupplyAPY)} APY
          </div>
        </div>

        {/* Borrow */}
        <div className="p-3 rounded-lg bg-surface/50">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-400">Borrowed</span>
          </div>
          <div className="text-xl font-bold text-orange-500">
            ${formatNumber(position.borrowBalanceUSD)}
          </div>
          <div className="text-xs text-gray-500">
            {formatNumber(Number(position.borrowBalance) / 10 ** position.assetDecimals)}{' '}
            {position.assetSymbol}
          </div>
          {hasBorrow && (
            <div className="text-xs text-orange-400 mt-1">
              -{formatPercent(position.currentBorrowAPY)} APY
            </div>
          )}
        </div>
      </div>

      {/* Collateral Status */}
      {position.isCollateralEnabled && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <Shield className="w-4 h-4 text-prism" />
          <span>Used as collateral</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {hasSupply && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onWithdraw?.(position)}
            >
              Withdraw
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onSupplyMore?.(position)}
            >
              Supply More
            </Button>
          </>
        )}

        {hasBorrow && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onRepay?.(position)}
          >
            Repay
          </Button>
        )}

        {hasSupply && !hasBorrow && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onBorrowMore?.(position)}
          >
            Borrow
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// POSITIONS SUMMARY
// =============================================================================

export interface PositionsSummaryProps {
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  netWorthUSD: number;
  avgSupplyAPY: number;
  avgBorrowAPY: number;
  lowestHealthFactor: number;
}

export function PositionsSummary({
  totalSupplyUSD,
  totalBorrowUSD,
  netWorthUSD,
  avgSupplyAPY,
  avgBorrowAPY,
  lowestHealthFactor,
}: PositionsSummaryProps) {
  return (
    <div className="prism-section-box p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Your Lending Portfolio</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-gray-400">Total Supplied</div>
          <div className="text-2xl font-bold text-green-500">
            ${formatNumber(totalSupplyUSD)}
          </div>
          <div className="text-xs text-gray-500">
            Avg APY: {formatPercent(avgSupplyAPY)}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Total Borrowed</div>
          <div className="text-2xl font-bold text-orange-500">
            ${formatNumber(totalBorrowUSD)}
          </div>
          <div className="text-xs text-gray-500">
            Avg APY: {formatPercent(avgBorrowAPY)}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Net Worth</div>
          <div className="text-2xl font-bold">
            ${formatNumber(netWorthUSD)}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400">Health Factor</div>
          <HealthFactorBadge
            healthFactor={lowestHealthFactor}
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}

export default PositionCard;
