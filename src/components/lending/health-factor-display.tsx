'use client';

/**
 * HealthFactorDisplay Component
 *
 * Visual display for health factor with color coding and warnings.
 */

import { useMemo } from 'react';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// =============================================================================
// TYPES
// =============================================================================

export interface HealthFactorBadgeProps {
  healthFactor: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

export interface HealthFactorBarProps {
  healthFactor: number;
  showValue?: boolean;
  showLabels?: boolean;
}

export interface HealthFactorCardProps {
  healthFactor: number;
  simulatedHF?: number;
  isSimulating?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getHealthFactorConfig(hf: number): {
  status: 'safe' | 'warning' | 'danger' | 'liquidatable' | 'none';
  color: string;
  bgColor: string;
  icon: typeof Shield;
  label: string;
  message: string;
} {
  if (!isFinite(hf) || hf === 0) {
    return {
      status: 'none',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      icon: Shield,
      label: '∞',
      message: 'No active borrows',
    };
  }

  if (hf < 1) {
    return {
      status: 'liquidatable',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      icon: AlertTriangle,
      label: hf.toFixed(2),
      message: 'Position can be liquidated!',
    };
  }

  if (hf < 1.1) {
    return {
      status: 'danger',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      icon: AlertTriangle,
      label: hf.toFixed(2),
      message: 'Extreme liquidation risk',
    };
  }

  if (hf < 1.3) {
    return {
      status: 'danger',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
      icon: AlertCircle,
      label: hf.toFixed(2),
      message: 'High liquidation risk',
    };
  }

  if (hf < 1.5) {
    return {
      status: 'warning',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      icon: AlertCircle,
      label: hf.toFixed(2),
      message: 'Moderate risk - monitor closely',
    };
  }

  if (hf < 2) {
    return {
      status: 'safe',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: Shield,
      label: hf.toFixed(2),
      message: 'Position is healthy',
    };
  }

  return {
    status: 'safe',
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    icon: Shield,
    label: hf.toFixed(2),
    message: 'Very safe position',
  };
}

// =============================================================================
// HEALTH FACTOR BADGE
// =============================================================================

export function HealthFactorBadge({
  healthFactor,
  size = 'md',
  showIcon = true,
  showLabel = true,
}: HealthFactorBadgeProps) {
  const config = useMemo(() => getHealthFactorConfig(healthFactor), [healthFactor]);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className={`
            inline-flex items-center gap-1.5 rounded-full font-medium
            ${config.bgColor} ${config.color} ${sizeClasses[size]}
          `}
        >
          {showIcon && <Icon className={iconSizes[size]} />}
          {showLabel && <span>{config.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <div className="font-medium">Health Factor: {config.label}</div>
          <div className="text-gray-400">{config.message}</div>
          {healthFactor < 1.5 && healthFactor > 0 && (
            <div className="mt-1 text-xs">
              Liquidation occurs when HF drops below 1.0
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// HEALTH FACTOR BAR
// =============================================================================

export function HealthFactorBar({
  healthFactor,
  showValue = true,
  showLabels = true,
}: HealthFactorBarProps) {
  const config = useMemo(() => getHealthFactorConfig(healthFactor), [healthFactor]);

  // Calculate position on bar (0-100%)
  // Map HF 0-3 to 0-100%, with 1.0 at 33%
  const position = useMemo(() => {
    if (!isFinite(healthFactor) || healthFactor <= 0) return 100;
    if (healthFactor >= 3) return 100;
    if (healthFactor >= 1.5) return 50 + ((healthFactor - 1.5) / 1.5) * 50;
    if (healthFactor >= 1) return 33 + ((healthFactor - 1) / 0.5) * 17;
    return (healthFactor / 1) * 33;
  }, [healthFactor]);

  return (
    <div className="w-full">
      {/* Bar */}
      <div className="relative h-2 bg-surface rounded-full overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)',
          }}
        />

        {/* Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all"
          style={{ left: `calc(${position}% - 6px)` }}
        />
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0</span>
          <span className="text-red-500">1.0</span>
          <span className="text-yellow-500">1.5</span>
          <span className="text-green-500">3.0+</span>
        </div>
      )}

      {/* Value */}
      {showValue && (
        <div className={`mt-2 text-center text-lg font-bold ${config.color}`}>
          {config.label}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HEALTH FACTOR CARD
// =============================================================================

export function HealthFactorCard({
  healthFactor,
  simulatedHF,
  isSimulating = false,
}: HealthFactorCardProps) {
  const currentConfig = useMemo(() => getHealthFactorConfig(healthFactor), [healthFactor]);
  const simulatedConfig = useMemo(
    () => (simulatedHF !== undefined ? getHealthFactorConfig(simulatedHF) : null),
    [simulatedHF]
  );

  const Icon = currentConfig.icon;

  return (
    <div className="prism-feature-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Health Factor</h3>
        <HealthFactorBadge healthFactor={healthFactor} size="sm" />
      </div>

      <HealthFactorBar healthFactor={healthFactor} showValue={false} />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${currentConfig.color}`} />
          <span className={`text-sm ${currentConfig.color}`}>
            {currentConfig.message}
          </span>
        </div>

        {/* Simulated value */}
        {simulatedHF !== undefined && simulatedConfig && (
          <div className="text-right">
            <div className="text-xs text-gray-500">After transaction:</div>
            <div className={`font-medium ${simulatedConfig.color}`}>
              {isSimulating ? '...' : simulatedConfig.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HealthFactorBadge;
