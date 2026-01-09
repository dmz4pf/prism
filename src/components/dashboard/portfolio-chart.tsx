/**
 * Portfolio Chart Component
 *
 * Multi-line time-series chart showing portfolio value by feature.
 * Uses Recharts for rendering with custom tooltip for protocol breakdown.
 *
 * Animation Features:
 * - Left-to-right line drawing via clip-path
 * - Staggered line reveals (300ms apart)
 * - Animated legend fade-in
 * - Glowing active dots on hover
 * - Respects prefers-reduced-motion
 */

'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatUSD } from '@/lib/utils';
import { usePortfolioHistory } from '@/hooks/data/use-portfolio-history';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ChartTooltip } from './chart-tooltip';
import { TimeRangeSelector } from './time-range-selector';
import { FEATURE_CONFIGS } from '@/types/portfolio-history';

// =============================================================================
// TYPES
// =============================================================================

interface PortfolioChartProps {
  height?: number;
  className?: string;
  showLegend?: boolean;
  showTimeSelector?: boolean;
  animate?: boolean;
}

type AnimationPhase = 'idle' | 'container' | 'lines' | 'legend' | 'complete';

// =============================================================================
// ANIMATION CONFIGURATION
// =============================================================================

const ANIMATION_TIMING = {
  container: { duration: 0.4, ease: 'easeOut' },
  lines: {
    staking: { duration: 1200, begin: 300, easing: 'ease-out' as const },
    lending: { duration: 1200, begin: 500, easing: 'ease-out' as const },
    stableYield: { duration: 1200, begin: 700, easing: 'ease-out' as const },
    strategies: { duration: 1200, begin: 900, easing: 'ease-out' as const },
  },
  legend: { delay: 1.4, stagger: 0.1 },
  totalDuration: 2000, // Total animation time in ms
};

// =============================================================================
// CUSTOM LEGEND WITH ANIMATION
// =============================================================================

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    dataKey: string;
  }>;
  animate?: boolean;
  animationPhase?: AnimationPhase;
}

function CustomLegend({ payload, animate = true, animationPhase = 'complete' }: CustomLegendProps) {
  if (!payload) return null;

  const shouldAnimate = animate && (animationPhase === 'legend' || animationPhase === 'complete');

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
      {payload.map((entry, index) => {
        const config = Object.values(FEATURE_CONFIGS).find(
          (c) => c.key === entry.dataKey
        );

        return (
          <motion.div
            key={entry.dataKey}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{
              duration: 0.3,
              delay: animate ? ANIMATION_TIMING.legend.delay + (index * ANIMATION_TIMING.legend.stagger) : 0,
              ease: 'easeOut',
            }}
            className="flex items-center gap-2"
          >
            <span
              className="w-3 h-3 rounded-full transition-transform duration-200 hover:scale-110"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-secondary-400">
              {config?.name || entry.value}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center bg-secondary-800/30 rounded-lg"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-secondary-500 animate-spin" />
        <p className="text-sm text-secondary-500">Loading chart data...</p>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function ChartEmptyState({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center bg-secondary-800/30 rounded-lg border border-dashed border-secondary-700"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-secondary-700 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-secondary-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-secondary-400">No portfolio data</p>
          <p className="text-xs text-secondary-500 mt-1">
            Connect your wallet and open positions to see your portfolio performance
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ChartError({ height, error }: { height: number; error: Error }) {
  return (
    <div
      className="flex items-center justify-center bg-red-500/10 rounded-lg border border-red-500/30"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-3 text-center px-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <div>
          <p className="text-sm font-medium text-red-400">Failed to load chart</p>
          <p className="text-xs text-red-500/70 mt-1">{error.message}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Y-AXIS FORMATTER
// =============================================================================

function formatYAxis(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// =============================================================================
// CUSTOM ACTIVE DOT WITH GLOW
// =============================================================================

interface ActiveDotProps {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: unknown;
  value?: number;
}

function GlowingActiveDot({ cx, cy, stroke }: ActiveDotProps) {
  if (cx === undefined || cy === undefined) return null;

  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={stroke}
        opacity={0.2}
        className="animate-pulse"
      />
      {/* Middle glow */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={stroke}
        opacity={0.3}
      />
      {/* Inner dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={stroke}
        stroke="#fff"
        strokeWidth={2}
      />
    </g>
  );
}

// =============================================================================
// ANIMATED CHART WRAPPER - State Machine Implementation
// =============================================================================

type AnimationState = 'idle' | 'pending' | 'animating' | 'complete';

interface AnimatedChartWrapperProps {
  children: React.ReactNode;
  animate: boolean;
  height: number;
  className?: string;
}

function AnimatedChartWrapper({
  children,
  animate,
  height,
  className
}: AnimatedChartWrapperProps) {
  // State machine for animation control
  const [state, setState] = useState<AnimationState>(() =>
    animate ? 'pending' : 'idle'
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle animate prop changes (e.g., reduced motion toggle)
  useEffect(() => {
    if (!animate) {
      // Animation disabled - immediately show content
      setState('idle');
    } else if (state === 'idle') {
      // Animation re-enabled - restart sequence
      setState('pending');
    }
    // Note: Don't include 'state' in deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  // State machine transitions with timers
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (state === 'pending') {
      // Brief delay ensures DOM is ready before animation
      timer = setTimeout(() => setState('animating'), 50);
    } else if (state === 'animating') {
      // CRITICAL: Fallback ensures chart is ALWAYS visible
      // Even if CSS animation fails, this guarantees visibility
      timer = setTimeout(() => setState('complete'), 2500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  // Listen for CSS animation completion
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || state !== 'animating') return;

    const handleAnimationEnd = (e: AnimationEvent) => {
      // Only handle our animation, not child animations
      if (e.target === wrapper) {
        setState('complete');
      }
    };

    wrapper.addEventListener('animationend', handleAnimationEnd);
    return () => wrapper.removeEventListener('animationend', handleAnimationEnd);
  }, [state]);

  // Build class names based on current state
  const wrapperClass = cn(
    'chart-wrapper-base',
    {
      'chart-wrapper-hidden': state === 'pending',
      'chart-wrapper-animating': state === 'animating',
      'chart-wrapper-visible': state === 'idle' || state === 'complete',
    },
    className
  );

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      style={{
        height,
        '--chart-animation-duration': '1.2s',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PortfolioChart({
  height = 300,
  className,
  showLegend = true,
  showTimeSelector = true,
  animate = true,
}: PortfolioChartProps) {
  const {
    data,
    timeRange,
    setTimeRange,
    isLoading,
    error,
    isSimulated,
  } = usePortfolioHistory();

  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  // Animation phase state
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [hasAnimated, setHasAnimated] = useState(false);

  // Calculate if there's any data to show
  const hasData = useMemo(() => {
    const hasAnyData = data.some(
      (point) =>
        point.staking > 0 ||
        point.lending > 0 ||
        point.stableYield > 0 ||
        point.strategies > 0
    );

    // Debug logging
    console.log('[PortfolioChart] Data check:', {
      dataLength: data.length,
      hasAnyData,
      firstPoint: data[0],
      isLoading,
      error,
    });

    return hasAnyData;
  }, [data, isLoading, error]);

  // Get Y-axis domain
  const yDomain = useMemo(() => {
    if (!hasData) return [0, 100];

    const allValues = data.flatMap((d) => [
      d.staking,
      d.lending,
      d.stableYield,
      d.strategies,
    ]);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues.filter((v) => v > 0), 0);

    // Add padding
    const padding = maxValue * 0.1;
    return [Math.max(0, minValue - padding), maxValue + padding];
  }, [data, hasData]);

  // Animation sequence controller
  useEffect(() => {
    if (!shouldAnimate || !hasData || hasAnimated) return;

    // Start animation sequence
    setAnimationPhase('container');

    const timers: NodeJS.Timeout[] = [];

    // Container animation complete, start lines
    timers.push(setTimeout(() => {
      setAnimationPhase('lines');
    }, 400));

    // Lines animating, prepare legend
    timers.push(setTimeout(() => {
      setAnimationPhase('legend');
    }, 1400));

    // All animations complete
    timers.push(setTimeout(() => {
      setAnimationPhase('complete');
      setHasAnimated(true);
    }, ANIMATION_TIMING.totalDuration));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [shouldAnimate, hasData, hasAnimated]);

  // Reset animation on time range change (optional - currently disabled for UX)
  // const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
  //   setTimeRange(newRange);
  //   if (shouldAnimate) {
  //     setHasAnimated(false);
  //     setAnimationPhase('idle');
  //   }
  // }, [setTimeRange, shouldAnimate]);

  // Render states
  if (isLoading) {
    return (
      <div className={className}>
        {showTimeSelector && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} disabled />
          </div>
        )}
        <ChartSkeleton height={height} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {showTimeSelector && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        )}
        <ChartError height={height} error={error} />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={className}>
        {showTimeSelector && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        )}
        <ChartEmptyState height={height} />
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('relative', className)}
    >
      {/* Header */}
      {showTimeSelector && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            {isSimulated && (
              <span className="text-xs text-yellow-500/70 italic">(Simulated)</span>
            )}
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      )}

      {/* Chart */}
      <AnimatedChartWrapper animate={shouldAnimate} height={height} className="bg-secondary-800/30 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            className="chart-container"
          >
            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              vertical={false}
            />

            {/* Axes */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={formatYAxis}
              tickMargin={10}
              domain={yDomain}
              width={60}
            />

            {/* Tooltip */}
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#4B5563', strokeDasharray: '5 5' }}
              wrapperStyle={{ outline: 'none' }}
            />

            {/* Legend */}
            {showLegend && (
              <Legend
                content={
                  <CustomLegend
                    animate={shouldAnimate}
                    animationPhase={animationPhase}
                  />
                }
              />
            )}

            {/* Lines with enhanced animation */}
            <Line
              type="monotone"
              dataKey="staking"
              name="Staking"
              stroke={FEATURE_CONFIGS.staking.color}
              strokeWidth={2}
              dot={false}
              activeDot={<GlowingActiveDot />}
              animationDuration={shouldAnimate ? ANIMATION_TIMING.lines.staking.duration : 0}
              animationBegin={shouldAnimate ? ANIMATION_TIMING.lines.staking.begin : 0}
              animationEasing={ANIMATION_TIMING.lines.staking.easing}
            />
            <Line
              type="monotone"
              dataKey="lending"
              name="Lending"
              stroke={FEATURE_CONFIGS.lending.color}
              strokeWidth={2}
              dot={false}
              activeDot={<GlowingActiveDot />}
              animationDuration={shouldAnimate ? ANIMATION_TIMING.lines.lending.duration : 0}
              animationBegin={shouldAnimate ? ANIMATION_TIMING.lines.lending.begin : 0}
              animationEasing={ANIMATION_TIMING.lines.lending.easing}
            />
            <Line
              type="monotone"
              dataKey="stableYield"
              name="Stable Yield"
              stroke={FEATURE_CONFIGS.stableYield.color}
              strokeWidth={2}
              dot={false}
              activeDot={<GlowingActiveDot />}
              animationDuration={shouldAnimate ? ANIMATION_TIMING.lines.stableYield.duration : 0}
              animationBegin={shouldAnimate ? ANIMATION_TIMING.lines.stableYield.begin : 0}
              animationEasing={ANIMATION_TIMING.lines.stableYield.easing}
            />
            <Line
              type="monotone"
              dataKey="strategies"
              name="Strategies"
              stroke={FEATURE_CONFIGS.strategies.color}
              strokeWidth={2}
              dot={false}
              activeDot={<GlowingActiveDot />}
              animationDuration={shouldAnimate ? ANIMATION_TIMING.lines.strategies.duration : 0}
              animationBegin={shouldAnimate ? ANIMATION_TIMING.lines.strategies.begin : 0}
              animationEasing={ANIMATION_TIMING.lines.strategies.easing}
            />
          </LineChart>
        </ResponsiveContainer>
      </AnimatedChartWrapper>
    </motion.div>
  );
}

export default PortfolioChart;
