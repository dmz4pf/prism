'use client';

/**
 * TokenListV2 - Token Balance List Component
 *
 * Displays all token balances with logos, amounts, and USD values
 * Fetches token data via Alchemy API
 */

import { motion, AnimatePresence } from 'framer-motion';
import { TokenLogo } from '@/components/ui/token-logo';
import type { TokenBalance } from '@/types/wallet';
import { formatUsd } from '@/lib/tokens';

interface TokenListV2Props {
  balances: TokenBalance[];
  isLoading?: boolean;
  maxItems?: number;
  showEmpty?: boolean;
}

export function TokenListV2({
  balances,
  isLoading = false,
  maxItems,
  showEmpty = false,
}: TokenListV2Props) {
  // Filter out zero balances unless showEmpty is true
  const displayBalances = showEmpty
    ? balances
    : balances.filter((b) => b.balanceRaw > 0n);

  // Limit items if maxItems is specified
  const limitedBalances = maxItems
    ? displayBalances.slice(0, maxItems)
    : displayBalances;

  const remainingCount = maxItems
    ? Math.max(0, displayBalances.length - maxItems)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>Token Balances</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface" />
              <div className="space-y-1">
                <div className="h-4 w-12 bg-surface rounded" />
                <div className="h-3 w-20 bg-surface rounded" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 w-16 bg-surface rounded ml-auto" />
              <div className="h-3 w-12 bg-surface rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (limitedBalances.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
        <span>Token Balances</span>
        <span className="text-xs">
          {displayBalances.length} token{displayBalances.length !== 1 ? 's' : ''}
        </span>
      </div>

      <AnimatePresence>
        {limitedBalances.map((token, index) => (
          <motion.div
            key={token.address || 'native-eth'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TokenLogo
                symbol={token.symbol}
                size="md"
              />
              <div>
                <p className="text-sm font-medium text-white">{token.symbol}</p>
                <p className="text-xs text-gray-500">{token.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white font-mono">
                {formatTokenBalance(token.balance)}
              </p>
              <p className="text-xs text-gray-400">
                {formatUsd(token.balanceUsd)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {remainingCount > 0 && (
        <div className="text-center py-2">
          <span className="text-xs text-gray-500">
            +{remainingCount} more token{remainingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Format token balance for display
 */
function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Single token row component for reuse
 */
interface TokenRowProps {
  token: TokenBalance;
  onClick?: () => void;
  selected?: boolean;
}

export function TokenRow({ token, onClick, selected }: TokenRowProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      className={`
        w-full flex items-center justify-between p-3 rounded-lg border transition-colors
        ${selected
          ? 'bg-blue-500/20 border-blue-500'
          : 'bg-surface/30 border-border hover:border-slate-600'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className="flex items-center gap-3">
        <TokenLogo symbol={token.symbol} size="md" />
        <div className="text-left">
          <p className="text-sm font-medium text-white">{token.symbol}</p>
          <p className="text-xs text-gray-500">{token.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-white font-mono">
          {formatTokenBalance(token.balance)}
        </p>
        <p className="text-xs text-gray-400">{formatUsd(token.balanceUsd)}</p>
      </div>
    </motion.button>
  );
}
