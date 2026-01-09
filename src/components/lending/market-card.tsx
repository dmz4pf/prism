'use client';

/**
 * MarketCard Component
 *
 * Displays a lending market with key metrics and actions.
 */

import { LendingMarket, LendingProtocol } from '@/types/lending';
import { PROTOCOL_INFO } from '@/services/lending';
import { formatNumber, formatPercent } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketCardProps {
  /** Market data */
  market: LendingMarket;
  /** Whether this market is recommended */
  isRecommended?: boolean;
  /** Recommendation reason */
  recommendationReason?: string;
  /** On supply click */
  onSupply?: (market: LendingMarket) => void;
  /** On borrow click */
  onBorrow?: (market: LendingMarket) => void;
  /** Compact mode */
  compact?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getProtocolLogo(protocol: LendingProtocol): string {
  return PROTOCOL_INFO[protocol]?.logoUrl || '/images/protocols/default.svg';
}

function getAssetLogo(symbol: string): string {
  return `/images/tokens/${symbol.toLowerCase()}.svg`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MarketCard({
  market,
  isRecommended = false,
  recommendationReason,
  onSupply,
  onBorrow,
  compact = false,
}: MarketCardProps) {
  const protocolInfo = PROTOCOL_INFO[market.protocol];

  if (compact) {
    return (
      <div
        className={`
          prism-feature-card p-4 transition-all
          ${isRecommended ? 'ring-2 ring-prism' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Asset Logo */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                <span className="text-sm font-medium">{market.assetSymbol[0]}</span>
              </div>
              {/* Protocol badge */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background-card border border-border">
                <span className="text-[8px]">{market.protocol[0].toUpperCase()}</span>
              </div>
            </div>

            {/* Asset & Protocol */}
            <div>
              <div className="font-medium">{market.assetSymbol}</div>
              <div className="text-xs text-gray-400">{protocolInfo?.name}</div>
            </div>
          </div>

          {isRecommended && (
            <span className="px-2 py-0.5 text-xs bg-prism/20 text-prism rounded-full">
              Best
            </span>
          )}
        </div>

        {/* APYs */}
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-gray-400">Supply:</span>{' '}
            <span className="text-green-500">{formatPercent(market.supplyAPY)}</span>
          </div>
          <div>
            <span className="text-gray-400">Borrow:</span>{' '}
            <span className="text-orange-500">{formatPercent(market.borrowAPY)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        prism-feature-card-hover p-5 transition-all
        ${isRecommended ? 'ring-2 ring-prism' : ''}
      `}
    >
      {/* Recommendation Badge */}
      {isRecommended && (
        <div className="mb-3">
          <span className="px-3 py-1 text-xs bg-prism/20 text-prism rounded-full">
            Recommended {recommendationReason ? `• ${recommendationReason}` : ''}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Asset Logo */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
              <span className="text-lg font-semibold">{market.assetSymbol[0]}</span>
            </div>
            {/* Protocol badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background-card border border-border flex items-center justify-center">
              <span className="text-[10px] font-medium">
                {market.protocol[0].toUpperCase()}
              </span>
            </div>
          </div>

          {/* Asset Info */}
          <div>
            <div className="font-semibold text-lg">{market.assetSymbol}</div>
            <div className="text-sm text-gray-400">{protocolInfo?.name}</div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {market.isFrozen && (
            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-500 rounded">
              Frozen
            </span>
          )}
          {!market.canBorrow && market.canSupply && (
            <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">
              Supply Only
            </span>
          )}
        </div>
      </div>

      {/* APY Section */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-surface/50">
          <div className="text-sm text-gray-400 mb-1">Supply APY</div>
          <div className="text-2xl font-bold text-green-500">
            {formatPercent(market.supplyAPY)}
          </div>
          {market.netSupplyAPY !== market.supplyAPY && (
            <div className="text-xs text-gray-500">
              Net: {formatPercent(market.netSupplyAPY)}
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-surface/50">
          <div className="text-sm text-gray-400 mb-1">Borrow APY</div>
          <div className="text-2xl font-bold text-orange-500">
            {formatPercent(market.borrowAPY)}
          </div>
          {market.netBorrowAPY !== market.borrowAPY && (
            <div className="text-xs text-gray-500">
              Net: {formatPercent(market.netBorrowAPY)}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div>
          <div className="text-gray-400">Total Supply</div>
          <div className="font-medium">${formatNumber(market.totalSupplyUSD)}</div>
        </div>
        <div>
          <div className="text-gray-400">Available</div>
          <div className="font-medium">${formatNumber(market.availableLiquidityUSD)}</div>
        </div>
        <div>
          <div className="text-gray-400">Utilization</div>
          <div className="font-medium">{formatPercent(market.utilization * 100)}</div>
        </div>
      </div>

      {/* Risk Params */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1">
            <span>LTV: {formatPercent(market.ltv * 100)}</span>
            <Info className="w-3 h-3" />
          </TooltipTrigger>
          <TooltipContent>
            Loan-to-Value ratio - maximum you can borrow against your collateral
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1">
            <span>Liq: {formatPercent(market.liquidationThreshold * 100)}</span>
            <Info className="w-3 h-3" />
          </TooltipTrigger>
          <TooltipContent>
            Liquidation threshold - your position gets liquidated above this ratio
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {market.canSupply && (
          <Button
            className="flex-1"
            onClick={() => onSupply?.(market)}
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Supply
          </Button>
        )}
        {market.canBorrow && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onBorrow?.(market)}
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Borrow
          </Button>
        )}
      </div>
    </div>
  );
}

export default MarketCard;
