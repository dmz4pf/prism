'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Coins, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

const goals = [
  {
    id: 'safe' as const,
    label: 'Safe',
    description: 'Low risk, stable yields',
    icon: Shield,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success',
  },
  {
    id: 'max' as const,
    label: 'Max APY',
    description: 'Highest yields available',
    icon: Zap,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning',
  },
  {
    id: 'stake' as const,
    label: 'Staking',
    description: 'ETH & liquid staking',
    icon: Coins,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
  },
  {
    id: 'browse' as const,
    label: 'Browse All',
    description: 'View all opportunities',
    icon: LayoutGrid,
    color: 'text-secondary-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
  },
];

export function GoalSelector() {
  const { selectedGoal, setGoal } = useUIStore();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {goals.map((goal) => {
        const isSelected = selectedGoal === goal.id;
        const Icon = goal.icon;

        return (
          <motion.button
            key={goal.id}
            onClick={() => setGoal(goal.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative rounded-xl border p-4 text-left transition-all',
              isSelected
                ? `${goal.bgColor} ${goal.borderColor}`
                : 'border-border bg-background-card hover:border-gray-600'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="goal-indicator"
                className={cn('absolute inset-0 rounded-xl', goal.bgColor)}
                initial={false}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('h-5 w-5', goal.color)} />
                <span className="font-semibold text-white">{goal.label}</span>
              </div>
              <p className="text-xs text-secondary-400">{goal.description}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
