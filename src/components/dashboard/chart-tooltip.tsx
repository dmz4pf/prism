/**
 * Chart Tooltip Component
 *
 * Custom tooltip for the portfolio chart showing feature breakdowns.
 * Displays protocol-level detail when hovering over chart points.
 *
 * Animation: Smooth fade-in with spring physics
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { formatUSD } from '@/lib/utils';
import type { ProtocolBreakdown } from '@/types/portfolio-history';
import { FEATURE_CONFIGS } from '@/types/portfolio-history';

// =============================================================================
// TYPES
// =============================================================================

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: {
    date: string;
    timestamp: number;
    staking: number;
    lending: number;
    stableYield: number;
    strategies: number;
    stakingBreakdown: ProtocolBreakdown[];
    lendingBreakdown: ProtocolBreakdown[];
    stableYieldBreakdown: ProtocolBreakdown[];
    strategiesBreakdown: ProtocolBreakdown[];
  };
}

// =============================================================================
// ANIMATION CONFIG
// =============================================================================

const tooltipAnimation = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
    mass: 0.8,
  },
};

// =============================================================================
// BREAKDOWN SECTION
// =============================================================================

interface BreakdownSectionProps {
  name: string;
  color: string;
  value: number;
  breakdown: ProtocolBreakdown[];
}

function BreakdownSection({ name, color, value, breakdown }: BreakdownSectionProps) {
  if (value === 0 && breakdown.length === 0) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-white">{name}</span>
          <span className="text-sm text-secondary-400 ml-auto">$0</span>
        </div>
        <p className="text-xs text-secondary-500 ml-4 mt-1">No active positions</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-white">{name}</span>
        <span className="text-sm font-medium text-white ml-auto">
          {formatUSD(value)}
        </span>
      </div>

      {breakdown.length > 0 && (
        <div className="ml-4 mt-1.5 space-y-1">
          {breakdown.map((item, index) => (
            <motion.div
              key={`${item.protocol}-${index}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.15 }}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-secondary-400">
                {item.protocol}
                {item.token && (
                  <span className="text-secondary-500 ml-1">({item.token})</span>
                )}
              </span>
              <span className="text-secondary-300">{formatUSD(item.value)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN TOOLTIP
// =============================================================================

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  const total = data.staking + data.lending + data.stableYield + data.strategies;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={data.date}
        {...tooltipAnimation}
        className="bg-secondary-900 border border-secondary-700 rounded-lg shadow-xl p-4 min-w-[280px] max-w-[320px] backdrop-blur-sm"
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Date Header */}
        <div className="pb-2 mb-2 border-b border-secondary-700">
          <p className="text-sm font-medium text-white">{data.date}</p>
        </div>

        {/* Feature Sections */}
        <div className="divide-y divide-secondary-800 group">
          <BreakdownSection
            name={FEATURE_CONFIGS.staking.name}
            color={FEATURE_CONFIGS.staking.color}
            value={data.staking}
            breakdown={data.stakingBreakdown}
          />
          <BreakdownSection
            name={FEATURE_CONFIGS.lending.name}
            color={FEATURE_CONFIGS.lending.color}
            value={data.lending}
            breakdown={data.lendingBreakdown}
          />
          <BreakdownSection
            name={FEATURE_CONFIGS.stableYield.name}
            color={FEATURE_CONFIGS.stableYield.color}
            value={data.stableYield}
            breakdown={data.stableYieldBreakdown}
          />
          <BreakdownSection
            name={FEATURE_CONFIGS.strategies.name}
            color={FEATURE_CONFIGS.strategies.color}
            value={data.strategies}
            breakdown={data.strategiesBreakdown}
          />
        </div>

        {/* Total Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="pt-2 mt-2 border-t border-secondary-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary-400">Total</span>
            <span className="text-sm font-bold text-white">{formatUSD(total)}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ChartTooltip;
