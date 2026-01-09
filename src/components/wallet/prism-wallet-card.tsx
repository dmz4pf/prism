'use client';

/**
 * PrismWalletCard - Smart Wallet Implementation
 *
 * Shows the user's wallet status and allows smart wallet creation.
 * Flow: Connect EOA → Create Smart Wallet → Use PRISM
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Copy, Check, ExternalLink, Plus, RefreshCw, AlertCircle, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenLogo } from '@/components/ui/token-logo';
import { usePrismWallet, useNetworkSwitch } from '@/hooks/wallet';
import { useAavePositions } from '@/hooks/protocols';
import type { TokenBalance } from '@/types';

interface PrismWalletCardProps {
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

export function PrismWalletCard({ onDeposit, onWithdraw }: PrismWalletCardProps) {
  const {
    prismWalletAddress,
    hasWallet,
    isLoading,
    ethBalance,
    ethBalanceUsd,
    tokenBalances,
    totalValueUsd,
    refetchBalances,
    isCorrectNetwork,
    // Smart wallet specific
    hasSmartWallet,
    smartWalletAddress,
    isSmartWalletDeployed,
    isCreatingSmartWallet,
    smartWalletError,
    createSmartWallet,
    supportsGasSponsorship,
    supportsBatching,
    wallet,
  } = usePrismWallet();

  const { switchToTarget, targetNetwork, isSwitching } = useNetworkSwitch();
  const { position: aavePosition, hasPosition: hasAavePosition } = useAavePositions();
  const [createError, setCreateError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const copyAddress = () => {
    if (prismWalletAddress) {
      navigator.clipboard.writeText(prismWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetchBalances();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCreateSmartWallet = async () => {
    setCreateError(null);
    try {
      await createSmartWallet();
    } catch (err) {
      console.error('Failed to create smart wallet:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create smart wallet');
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatUsd = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatBalance = (value: string, decimals = 4) => {
    const num = parseFloat(value);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    return num.toFixed(decimals);
  };

  // Loading state
  if (isLoading) {
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

  // Wrong network prompt
  if (!isCorrectNetwork && hasWallet) {
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

  // Not connected state
  if (!hasWallet) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-secondary-400" />
            Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-secondary-400 text-sm">
            Connect to start using PRISM. No additional setup needed.
          </p>
          <ul className="text-sm text-secondary-400 space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Direct protocol access
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              Full control of your assets
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              No deployment costs
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

  // Connected but no smart wallet - show creation UI
  if (!hasSmartWallet) {
    return (
      <Card className="bg-gradient-to-br from-background to-background-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5 text-secondary-400" />
              Connected Wallet
            </CardTitle>
            <Badge variant="outline" className="border-green-500 text-green-400">
              EOA Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* EOA Address */}
          <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-border">
            <span className="font-mono text-sm text-white">
              {wallet?.owner ? truncateAddress(wallet.owner) : '—'}
            </span>
            <Badge variant="secondary" className="text-xs">EOA</Badge>
          </div>

          {/* Smart Wallet CTA */}
          <div className="p-4 bg-secondary-800/50 rounded-xl border border-secondary-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Create Smart Wallet</h3>
                <p className="text-xs text-secondary-400">Unlock advanced features</p>
              </div>
            </div>

            <ul className="text-sm text-secondary-300 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Batched transactions (save 50-70% gas)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                One-click multi-protocol strategies
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                Full self-custody (you own the keys)
              </li>
            </ul>

            {createError && (
              <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-300">
                {createError}
              </div>
            )}

            <Button
              onClick={handleCreateSmartWallet}
              disabled={isCreatingSmartWallet || !isCorrectNetwork}
              className="w-full"
            >
              {isCreatingSmartWallet ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Smart Wallet...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create PRISM Smart Wallet
                </>
              )}
            </Button>

            <p className="text-xs text-secondary-500 text-center mt-2">
              Free to create • Deploys on first transaction
            </p>
          </div>

          {/* Current Balances (from EOA) */}
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-secondary-400 mb-2">Your EOA Balance</p>
            <div className="flex items-center justify-between p-2 bg-surface/30 rounded border border-border">
              <div className="flex items-center gap-2">
                <TokenLogo symbol="ETH" size="sm" />
                <span className="text-sm text-white">ETH</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-white font-mono">{formatBalance(ethBalance)}</p>
                <p className="text-xs text-secondary-400">{formatUsd(ethBalanceUsd)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected state with smart wallet - show wallet info
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
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {isSmartWalletDeployed ? 'Deployed' : 'Ready'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Smart Wallet Address */}
          <div className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white">
                {smartWalletAddress ? truncateAddress(smartWalletAddress) : '—'}
              </span>
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">Smart</Badge>
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
                  href={`https://sepolia.basescan.org/address/${smartWalletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Features badges */}
          <div className="flex gap-2">
            {supportsBatching && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-300">
                <Zap className="h-3 w-3 mr-1" /> Batching
              </Badge>
            )}
            {supportsGasSponsorship && (
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300">
                Gas Sponsored
              </Badge>
            )}
          </div>

          {/* Total Value */}
          <div className="text-center py-4">
            <p className="text-sm text-secondary-400 mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-white">
              {formatUsd(totalValueUsd + (aavePosition?.totalCollateralUsd ?? 0))}
            </p>
          </div>

          {/* ETH Balance */}
          <div className="space-y-2">
            <p className="text-sm text-secondary-400">Native Balance</p>
            <div className="flex items-center justify-between p-2 bg-surface/30 rounded border border-border">
              <div className="flex items-center gap-2">
                <TokenLogo symbol="ETH" size="sm" />
                <span className="text-sm text-white">ETH</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-white font-mono">{formatBalance(ethBalance)}</p>
                <p className="text-xs text-secondary-400">{formatUsd(ethBalanceUsd)}</p>
              </div>
            </div>
          </div>

          {/* Token Balances */}
          {tokenBalances.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-secondary-400">Token Balances</p>
              {tokenBalances.map((balance: TokenBalance) => (
                <div
                  key={balance.address}
                  className="flex items-center justify-between p-2 bg-surface/30 rounded border border-border"
                >
                  <div className="flex items-center gap-2">
                    <TokenLogo symbol={balance.symbol} size="sm" />
                    <span className="text-sm text-white">{balance.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-mono">
                      {formatBalance(balance.balance)}
                    </p>
                    <p className="text-xs text-secondary-400">
                      {formatUsd(balance.balanceUsd)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aave Position Summary */}
          {hasAavePosition && aavePosition && (
            <div className="space-y-2">
              <p className="text-sm text-secondary-400">Aave Position</p>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-secondary-400">Supplied</span>
                  <span className="text-sm text-white font-medium">
                    {formatUsd(aavePosition.totalCollateralUsd)}
                  </span>
                </div>
                {aavePosition.totalDebtUsd > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-secondary-400">Borrowed</span>
                    <span className="text-sm text-red-400 font-medium">
                      {formatUsd(aavePosition.totalDebtUsd)}
                    </span>
                  </div>
                )}
                {aavePosition.healthFactor < Infinity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-400">Health Factor</span>
                    <span className={`text-sm font-medium ${
                      aavePosition.healthFactor > 2
                        ? 'text-green-400'
                        : aavePosition.healthFactor > 1.5
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      {aavePosition.healthFactor.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {tokenBalances.length === 0 && !hasAavePosition && parseFloat(ethBalance) === 0 && (
            <div className="text-center py-4 border border-dashed border-border rounded-lg">
              <p className="text-secondary-500 text-sm">No assets yet</p>
              <p className="text-secondary-600 text-xs mt-1">
                Deposit funds to get started with DeFi
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button onClick={onDeposit}>
              <Plus className="h-4 w-4 mr-1" />
              Deposit
            </Button>
            <Button
              onClick={onWithdraw}
              variant="outline"
              disabled={totalValueUsd === 0 && !hasAavePosition}
            >
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
