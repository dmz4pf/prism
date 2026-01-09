/**
 * Time Range Selector Component
 *
 * Toggle between different time ranges for the portfolio chart.
 * Similar to the reference design: Days | Weeks | Months
 */

'use client';

import { cn } from '@/lib/utils';
import type { TimeRange } from '@/types/portfolio-history';

// =============================================================================
// TYPES
// =============================================================================

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
  disabled?: boolean;
}

// =============================================================================
// TIME RANGE OPTIONS
// =============================================================================

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Days' },
  { value: '30d', label: 'Weeks' },
  { value: '90d', label: 'Months' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function TimeRangeSelector({
  value,
  onChange,
  className,
  disabled = false,
}: TimeRangeSelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg bg-secondary-800 p-1',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
            value === option.value
              ? 'bg-primary text-white shadow-sm'
              : 'text-secondary-400 hover:text-white hover:bg-secondary-700'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default TimeRangeSelector;
