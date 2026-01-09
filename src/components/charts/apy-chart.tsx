/**
 * APY History Chart
 *
 * Displays historical APY trends for multiple protocols.
 * Uses Recharts for visualization with time range selection.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartSkeleton } from '@/components/ui/skeleton';
import {
  getAPYHistory,
  getAPYChange,
  PROTOCOL_CONFIG,
  type APYTimeRange,
  type APYChartData,
} from '@/services/apy-history';

// =============================================================================
// TYPES
// =============================================================================

interface APYChartProps {
  /** Protocols to display */
  protocols: string[];
  /** Chart title */
  title?: string;
  /** Show time range selector */
  showTimeRange?: boolean;
  /** Initial time range */
  initialTimeRange?: APYTimeRange;
  /** Chart height */
  height?: number;
  /** Is loading */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// TIME RANGE OPTIONS
// =============================================================================

const TIME_RANGES: { value: APYTimeRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary-900/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl"
    >
      <p className="text-sm text-secondary-400 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-secondary-300">
                {PROTOCOL_CONFIG[item.dataKey]?.name || item.dataKey}
              </span>
            </div>
            <span className="text-sm font-medium text-white">
              {item.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// =============================================================================
// APY CHANGE INDICATOR
// =============================================================================

function APYChangeIndicator({
  protocol,
  timeRange,
}: {
  protocol: string;
  timeRange: APYTimeRange;
}) {
  const change = getAPYChange(protocol, timeRange);

  if (!change) {
    return (
      <span className="text-secondary-500 text-xs flex items-center gap-1">
        <Minus className="h-3 w-3" />
        N/A
      </span>
    );
  }

  const isPositive = change.change > 0;
  const isNeutral = Math.abs(change.change) < 0.01;

  if (isNeutral) {
    return (
      <span className="text-secondary-400 text-xs flex items-center gap-1">
        <Minus className="h-3 w-3" />
        0.00%
      </span>
    );
  }

  return (
    <span
      className={`text-xs flex items-center gap-1 ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}
      {change.change.toFixed(2)}%
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function APYChart({
  protocols,
  title = 'APY History',
  showTimeRange = true,
  initialTimeRange = '30d',
  height = 300,
  isLoading = false,
  className,
}: APYChartProps) {
  const [timeRange, setTimeRange] = useState<APYTimeRange>(initialTimeRange);
  const [hoveredProtocol, setHoveredProtocol] = useState<string | null>(null);

  // Get chart data
  const chartData = useMemo(() => {
    return getAPYHistory(timeRange, protocols);
  }, [timeRange, protocols]);

  // Get active protocols (those with data)
  const activeProtocols = useMemo(() => {
    return protocols.filter((p) => {
      const config = PROTOCOL_CONFIG[p];
      return config !== undefined;
    });
  }, [protocols]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <Card className={`bg-surface rounded-xl border border-border p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-secondary-500 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-secondary-900 border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <p className="text-xs text-secondary-400">
                Historical APY data showing yield trends over time. Data is collected
                periodically and may show simulated values when historical data is limited.
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        {showTimeRange && (
          <div className="flex gap-1 bg-secondary-800/50 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 h-7 text-xs ${
                  timeRange === range.value
                    ? 'bg-primary text-white'
                    : 'text-secondary-400 hover:text-white'
                }`}
              >
                {range.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickMargin={10}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
              domain={['auto', 'auto']}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            {activeProtocols.map((protocol) => {
              const config = PROTOCOL_CONFIG[protocol];
              const isHovered = hoveredProtocol === protocol;
              const isDimmed = hoveredProtocol !== null && !isHovered;

              return (
                <Line
                  key={protocol}
                  type="monotone"
                  dataKey={protocol}
                  name={config?.name || protocol}
                  stroke={config?.color || '#888'}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeOpacity={isDimmed ? 0.3 : 1}
                  dot={false}
                  activeDot={{
                    r: 6,
                    strokeWidth: 2,
                    fill: config?.color || '#888',
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
        <AnimatePresence>
          {activeProtocols.map((protocol) => {
            const config = PROTOCOL_CONFIG[protocol];
            const isHovered = hoveredProtocol === protocol;

            return (
              <motion.button
                key={protocol}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onMouseEnter={() => setHoveredProtocol(protocol)}
                onMouseLeave={() => setHoveredProtocol(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  isHovered
                    ? 'bg-secondary-800'
                    : hoveredProtocol
                    ? 'opacity-50'
                    : ''
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config?.color || '#888' }}
                />
                <span className="text-sm text-secondary-300">
                  {config?.name || protocol}
                </span>
                <APYChangeIndicator protocol={protocol} timeRange={timeRange} />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// =============================================================================
// COMPACT APY CHART (For smaller spaces)
// =============================================================================

export function CompactAPYChart({
  protocols,
  height = 150,
  className,
}: {
  protocols: string[];
  height?: number;
  className?: string;
}) {
  const chartData = useMemo(() => {
    return getAPYHistory('7d', protocols);
  }, [protocols]);

  const activeProtocols = protocols.filter((p) => PROTOCOL_CONFIG[p]);

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          {activeProtocols.map((protocol) => {
            const config = PROTOCOL_CONFIG[protocol];
            return (
              <Line
                key={protocol}
                type="monotone"
                dataKey={protocol}
                stroke={config?.color || '#888'}
                strokeWidth={2}
                dot={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default APYChart;
