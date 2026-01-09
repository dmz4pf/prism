'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { TokenLogo, ProtocolLogo } from '@/components/ui/token-logo';
import type { StrategyStep, StrategyAction } from '@/types';

interface StrategyFlowProps {
  steps: StrategyStep[];
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

const ACTION_COLORS: Record<StrategyAction, { bg: string; text: string }> = {
  stake: { bg: 'bg-green-500/20', text: 'text-green-400' },
  supply: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  borrow: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  convert: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  loop: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

const ACTION_LABELS: Record<StrategyAction, string> = {
  stake: 'Stake',
  supply: 'Supply',
  borrow: 'Borrow',
  convert: 'Convert',
  loop: 'Loop',
};

export function StrategyFlow({
  steps,
  direction = 'vertical',
  size = 'md',
}: StrategyFlowProps) {
  const isHorizontal = direction === 'horizontal';
  const Arrow = isHorizontal ? ArrowRight : ArrowDown;

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      box: 'p-2',
      protocol: 'text-xs',
      action: 'text-xs',
      token: 'text-xs',
      apy: 'text-xs',
      arrow: 'h-3 w-3',
    },
    md: {
      container: 'gap-3',
      box: 'p-3',
      protocol: 'text-sm font-medium',
      action: 'text-xs',
      token: 'text-sm',
      apy: 'text-sm font-medium',
      arrow: 'h-4 w-4',
    },
    lg: {
      container: 'gap-4',
      box: 'p-4',
      protocol: 'text-base font-semibold',
      action: 'text-sm',
      token: 'text-base',
      apy: 'text-base font-semibold',
      arrow: 'h-5 w-5',
    },
  };

  const s = sizeClasses[size];

  return (
    <div
      className={`flex ${
        isHorizontal ? 'flex-row items-center flex-wrap' : 'flex-col'
      } ${s.container}`}
    >
      {steps.map((step, idx) => {
        const actionStyle = ACTION_COLORS[step.action];
        const isPositiveAPY = step.apy >= 0;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col'} ${
              isHorizontal ? '' : 'w-full'
            }`}
          >
            {/* Step Box */}
            <div
              className={`${s.box} bg-secondary-800 border border-secondary-700 rounded-lg ${
                isHorizontal ? '' : 'w-full'
              }`}
            >
              {/* Protocol Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ProtocolLogo protocol={step.protocol} size="sm" />
                  <span className={`text-white ${s.protocol}`}>{step.protocol}</span>
                </div>
                <span
                  className={`${s.action} px-2 py-0.5 rounded ${actionStyle.bg} ${actionStyle.text}`}
                >
                  {ACTION_LABELS[step.action]}
                </span>
              </div>

              {/* Token Flow */}
              <div className="flex items-center gap-2 mb-2">
                <TokenLogo symbol={step.tokenIn} size="xs" />
                <span className={`text-secondary-300 ${s.token}`}>{step.tokenIn}</span>
                <ArrowRight className="h-3 w-3 text-secondary-500" />
                <TokenLogo symbol={step.tokenOut} size="xs" />
                <span className={`text-white ${s.token}`}>{step.tokenOut}</span>
              </div>

              {/* APY */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary-500">APY Impact</span>
                <span
                  className={`${s.apy} ${
                    isPositiveAPY ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isPositiveAPY ? '+' : ''}
                  {step.apy.toFixed(1)}%
                </span>
              </div>

              {/* Description if available */}
              {step.description && (
                <p className="text-xs text-secondary-400 mt-2 pt-2 border-t border-secondary-700">
                  {step.description}
                </p>
              )}
            </div>

            {/* Arrow between steps */}
            {idx < steps.length - 1 && (
              <div
                className={`flex items-center justify-center ${
                  isHorizontal ? 'px-2' : 'py-2'
                }`}
              >
                <Arrow className={`${s.arrow} text-secondary-500`} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
