'use client';

import { cn } from '@/lib/utils';

type RiskLevel = 1 | 2 | 3 | 4 | 5;

interface RiskIndicatorProps {
  score: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskLabels: Record<RiskLevel, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Very High',
};

const riskColors: Record<RiskLevel, string> = {
  1: 'bg-success',
  2: 'bg-success',
  3: 'bg-warning',
  4: 'bg-error',
  5: 'bg-error',
};

export function RiskIndicator({
  score,
  showLabel = false,
  size = 'md',
  className,
}: RiskIndicatorProps) {
  const riskLevel = score <= 2 ? 'low' : score <= 3 ? 'medium' : 'high';

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Risk level: ${riskLabels[score]}, ${score} out of 5`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              'rounded-full transition-colors',
              dotSizes[size],
              i <= score ? riskColors[score as RiskLevel] : 'bg-gray-700'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={cn(
            'text-xs',
            riskLevel === 'low' && 'text-success',
            riskLevel === 'medium' && 'text-warning',
            riskLevel === 'high' && 'text-error'
          )}
        >
          {riskLabels[score]}
        </span>
      )}
    </div>
  );
}
