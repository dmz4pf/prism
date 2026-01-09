/**
 * Testnet Warning Banner
 *
 * Displays a prominent warning when user is on testnet.
 * Helps prevent confusion between test and real funds.
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isTestnet, getChainName, getTestnetWarning } from '@/lib/utils/network';
import { TESTNET_FAUCETS } from '@/contracts/addresses/base-sepolia';

interface TestnetBannerProps {
  /** Show dismiss button */
  dismissable?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function TestnetBanner({
  dismissable = true,
  compact = false,
}: TestnetBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't render on mainnet
  if (!isTestnet()) return null;

  // Don't render if dismissed
  if (dismissed) return null;

  if (compact) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        <span className="text-xs text-yellow-500 font-medium">
          Testnet Mode - Simulated Data
        </span>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-yellow-500/10 border-b border-yellow-500/30"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-500">
                  {getChainName()} Testnet
                </p>
                <p className="text-xs text-yellow-500/70">
                  {getTestnetWarning()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={TESTNET_FAUCETS.baseSepolia}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors"
              >
                Get Test ETH
                <ExternalLink className="h-3 w-3" />
              </a>

              {dismissable && (
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1 rounded-full hover:bg-yellow-500/20 transition-colors"
                  aria-label="Dismiss testnet warning"
                >
                  <X className="h-4 w-4 text-yellow-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline testnet indicator badge
 */
export function TestnetBadge() {
  if (!isTestnet()) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-medium">
      <AlertTriangle className="h-3 w-3" />
      Testnet
    </span>
  );
}

/**
 * Mock data indicator for position cards
 */
export function MockDataIndicator() {
  if (!isTestnet()) return null;

  return (
    <span className="text-xs text-yellow-500/70 italic">
      (Simulated)
    </span>
  );
}

export default TestnetBanner;
