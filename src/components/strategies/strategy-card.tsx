'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyAPYTooltip } from '@/components/ui/apy-tooltip';
import type { StrategyRecommendation, RiskLevel, TimeHorizon } from '@/types';

interface StrategyCardProps {
  strategy: StrategyRecommendation;
  featured?: boolean;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const TIME_HORIZON_LABELS: Record<TimeHorizon, string> = {
  long: '6+ months',
  medium: '1-6 months',
  opportunistic: 'Short-term',
};

export function StrategyCard({ strategy, featured = false }: StrategyCardProps) {
  const riskStyle = RISK_STYLES[strategy.riskLevel];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/strategies/${strategy.id}`}>
        <Card
          className={`h-full cursor-pointer transition-colors ${
            featured
              ? 'bg-gradient-to-br from-blue-500/20 to-blue-400/20 border-blue-500/30'
              : 'bg-background-card border-border hover:border-secondary-600'
          }`}
        >
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {strategy.weeksPick && (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                  <h3 className="font-semibold text-white">{strategy.name}</h3>
                </div>
                <p className="text-sm text-secondary-400 line-clamp-2">
                  {strategy.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-secondary-500 flex-shrink-0" />
            </div>

            {/* APY Display with Tooltip */}
            <div className="flex items-baseline gap-2">
              <StrategyAPYTooltip
                apy={strategy.currentAPY}
                flow={strategy.flow}
                size="lg"
              />
              <span className="text-sm text-secondary-400">APY</span>
            </div>

            {/* Strategy Flow Preview */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {strategy.flow.slice(0, 3).map((step, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="border-border text-secondary-300 text-xs whitespace-nowrap"
                  >
                    {step.protocol}
                  </Badge>
                  {idx < Math.min(strategy.flow.length - 1, 2) && (
                    <ArrowRight className="h-3 w-3 text-secondary-500" />
                  )}
                </div>
              ))}
              {strategy.flow.length > 3 && (
                <span className="text-xs text-secondary-500">
                  +{strategy.flow.length - 3} more
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                {/* Risk Badge */}
                <div className={`flex items-center gap-1 ${riskStyle.text}`}>
                  {strategy.riskLevel === 'high' && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span className="text-xs capitalize">{strategy.riskLevel} Risk</span>
                </div>

                {/* Time Horizon */}
                <div className="flex items-center gap-1 text-secondary-400">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {TIME_HORIZON_LABELS[strategy.timeHorizon]}
                  </span>
                </div>
              </div>

              {/* Input Token */}
              <Badge variant="secondary" className="bg-surface text-secondary-300 text-xs">
                {strategy.inputToken}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
