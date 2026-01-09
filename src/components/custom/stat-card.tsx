'use client';

import { cn } from '@/lib/utils';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  change?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  change,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border border-border bg-background-card p-4',
        className
      )}
    >
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-white">
          {prefix}
          <CountUp
            start={value * 0.8}
            end={value}
            duration={1}
            decimals={decimals}
            separator=","
          />
          {suffix}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              'text-sm font-medium',
              change >= 0 ? 'text-success' : 'text-error'
            )}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
