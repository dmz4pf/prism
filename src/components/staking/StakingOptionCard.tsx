/**
 * StakingOptionCard Component
 * Displays a single staking option with APY, risk, and protocol info
 */

'use client';

import React from 'react';
import type { StakingOption, RiskLevel } from '@/types/staking';
import { cn } from '@/lib/utils';

interface StakingOptionCardProps {
  option: StakingOption;
  selected?: boolean;
  onSelect?: (option: StakingOption) => void;
}

const RISK_CONFIG: Record<RiskLevel, { color: string; label: string; bg: string }> = {
  low: {
    color: 'text-green-500',
    label: 'Low Risk',
    bg: 'bg-green-500/10',
  },
  medium: {
    color: 'text-yellow-500',
    label: 'Medium Risk',
    bg: 'bg-yellow-500/10',
  },
  high: {
    color: 'text-red-500',
    label: 'High Risk',
    bg: 'bg-red-500/10',
  },
};

const TYPE_LABELS: Record<string, string> = {
  'liquid-staking': 'Liquid Staking',
  'liquid-restaking': 'Liquid Restaking',
  'supercharged-lst': 'Supercharged LST',
  lending: 'Lending',
};

function formatTVL(tvl: number): string {
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(2)}B`;
  }
  if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(2)}M`;
  }
  return `$${tvl.toLocaleString()}`;
}

export function StakingOptionCard({
  option,
  selected = false,
  onSelect,
}: StakingOptionCardProps) {
  const riskConfig = RISK_CONFIG[option.risk];

  return (
    <div
      onClick={() => onSelect?.(option)}
      className={cn(
        'relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200',
        'hover:border-primary/50 hover:shadow-lg',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card'
      )}
    >
      {/* Protocol badge */}
      <div className="absolute top-3 right-3">
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            riskConfig.bg,
            riskConfig.color
          )}
        >
          {riskConfig.label}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Token icon placeholder */}
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <span className="text-lg font-bold">
            {option.outputToken.symbol.slice(0, 2)}
          </span>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg">{option.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {option.protocol}
          </p>
        </div>
      </div>

      {/* APY display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-primary">
            {option.apy.toFixed(2)}%
          </span>
          <span className="text-muted-foreground">APY</span>
        </div>

        {/* APY breakdown */}
        {option.apyBreakdown && (
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span>Base: {option.apyBreakdown.base.toFixed(2)}%</span>
            {option.apyBreakdown.rewards && option.apyBreakdown.rewards > 0 && (
              <span className="text-green-500">
                +{option.apyBreakdown.rewards.toFixed(2)}% rewards
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {option.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center justify-between text-sm border-t pt-4">
        <div>
          <span className="text-muted-foreground">Type:</span>{' '}
          <span className="font-medium">{TYPE_LABELS[option.type] || option.type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">TVL:</span>{' '}
          <span className="font-medium">{formatTVL(option.tvl)}</span>
        </div>
      </div>

      {/* Token pair */}
      <div className="flex items-center gap-2 mt-3 text-sm">
        <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
          {option.inputToken.symbol}
        </span>
        <span>→</span>
        <span className="px-2 py-0.5 bg-primary/10 rounded text-primary font-medium">
          {option.outputToken.symbol}
        </span>
      </div>

      {/* Risk factors (shown on hover/selection) */}
      {selected && option.riskFactors.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Risk Factors</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {option.riskFactors.map((factor, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StakingOptionCard;
