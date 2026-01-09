'use client';

/**
 * SmartWalletCardV2 - New Smart Wallet Implementation
 *
 * Uses deterministic address derivation (no localStorage)
 * Displays all token balances via Alchemy API
 * Supports deposit, withdraw, and swap actions
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount } from 'wagmi';
import { useSmartWallet, useWalletBalances, useNetworkSwitch } from '@/hooks/wallet';
import { formatAddress, getExplorerUrl, IS_TESTNET } from '@/lib/smart-wallet';
import { formatUsd } from '@/lib/tokens';
import { TokenListV2 } from './token-list-v2';

interface SmartWalletCardV2Props {
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onSwap?: () => void;
}

export function SmartWalletCardV2({ onDeposit, onWithdraw, onSwap }: SmartWalletCardV2Props) {
  const { isConnected: isEoaConnected } = useAccount();
  const { smartWallet, isInitializing, error: walletError } = useSmartWallet();
  const { balances, totalValueUsd, isLoading: isLoadingBalances, refetch } = useWalletBalances();
  const { switchToTarget, targetNetwork, isSwitching, isCorrectNetwork } = useNetworkSwitch();

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const copyAddress = () => {
    if (smartWallet?.address) {
      navigator.clipboard.writeText(smartWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Loading state
  if (isInitializing) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-1/2" />
            <div className="h-12 bg-surface rounded w-3/4" />
            <div className="h-10 bg-surface rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!isEoaConnected) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-secondary-400" />
            PRISM Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-secondary-400 text-sm">
            Connect to access your Smart Wallet. Auto-derived from your EOA.
          </p>
          <ul className="text-sm text-secondary-400 space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Deterministic address (same on any device)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Batched transactions for gas savings
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Full self-custody
            </li>
          </ul>
          <div className="prism-info-box-default">
            <p className="text-xs text-secondary-400">
              Use the "Connect Wallet" button in the header to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wrong network prompt
  if (!isCorrectNetwork) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            Wrong Network
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-secondary-400 text-sm">
            Switch to {targetNetwork.name} to view your balances.
          </p>
          <Button
            onClick={() => switchToTarget()}
            disabled={isSwitching}
            className="w-full"
          >
            {isSwitching ? 'Switching...' : `Switch to ${targetNetwork.name}`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (walletError) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="h-5 w-5 text-red-400" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-secondary-400 text-sm">
            Failed to initialize smart wallet: {walletError.message}
          </p>
          <Button onClick={handleRefresh} className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Smart wallet ready - show full UI
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-blue-400" />
              PRISM Smart Wallet
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-8 w-8 p-0 text-secondary-400 hover:text-white"
                disabled={isRefreshing || isLoadingBalances}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoadingBalances ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {smartWallet?.isDeployed ? 'Deployed' : 'Ready'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Smart Wallet Address */}
          <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white">
                {smartWallet ? formatAddress(smartWallet.address) : '—'}
              </span>
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                Smart Wallet
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 p-0 text-secondary-400 hover:text-white"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 w-8 p-0 text-secondary-400 hover:text-white"
              >
                <a
                  href={smartWallet ? getExplorerUrl(smartWallet.address) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Features badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-300">
              <Zap className="h-3 w-3 mr-1" /> Batched Txs
            </Badge>
            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
              ERC-4337
            </Badge>
            {!smartWallet?.isDeployed && (
              <Badge variant="secondary" className="text-xs bg-secondary-500/20 text-secondary-300">
                Deploys on first tx
              </Badge>
            )}
          </div>

          {/* Total Value */}
          <div className="text-center py-4">
            <p className="text-sm text-secondary-400 mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-white">
              {formatUsd(totalValueUsd)}
            </p>
          </div>

          {/* Token Balances */}
          <TokenListV2 balances={balances} isLoading={isLoadingBalances} />

          {/* Empty State */}
          {balances.length === 0 && !isLoadingBalances && (
            <div className="text-center py-4 border border-dashed border-border rounded-lg">
              <p className="text-secondary-500 text-sm">No assets yet</p>
              <p className="text-secondary-600 text-xs mt-1">
                Deposit funds from your EOA to get started
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Button onClick={onDeposit} className="flex-col h-auto py-3">
              <ArrowDownToLine className="h-4 w-4 mb-1" />
              <span className="text-xs">Deposit</span>
            </Button>
            <Button
              onClick={onWithdraw}
              variant="outline"
              disabled={totalValueUsd === 0}
              className="flex-col h-auto py-3"
            >
              <ArrowUpFromLine className="h-4 w-4 mb-1" />
              <span className="text-xs">Withdraw</span>
            </Button>
            <Button
              onClick={onSwap}
              variant="outline"
              disabled={balances.length === 0 || IS_TESTNET}
              className="flex-col h-auto py-3"
              title={IS_TESTNET ? 'Swaps only available on Base Mainnet' : 'Swap tokens'}
            >
              <ArrowRightLeft className="h-4 w-4 mb-1" />
              <span className="text-xs">{IS_TESTNET ? 'Swap (Mainnet)' : 'Swap'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
