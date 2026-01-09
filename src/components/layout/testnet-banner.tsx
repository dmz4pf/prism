'use client';

/**
 * Testnet Warning Banner
 *
 * Displays a prominent banner when app is in testnet mode.
 * Warns users that some features show mock data.
 */

import { IS_TESTNET } from '@/lib/smart-wallet';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export function TestnetBanner() {
  // Don't show on mainnet
  if (!IS_TESTNET) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Warning message */}
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <span className="text-yellow-200">
            <strong className="font-semibold">Testnet Mode:</strong>{' '}
            Base Sepolia testnet with limited protocol support. Some features show mock data for testing.
          </span>
        </div>

        {/* Faucet link */}
        <a
          href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-yellow-300 hover:text-yellow-200 transition-colors whitespace-nowrap"
        >
          Get testnet ETH
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
