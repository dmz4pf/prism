'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Settings,
  Bell,
  Shield,
  Sliders,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { useSettings } from '@/contexts/settings-context';

export default function SettingsPage() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { prismWalletAddress, hasWallet } = usePrismWallet();
  const [copied, setCopied] = useState<string | null>(null);

  // Persistent settings from context
  const { settings, updateSlippage, updateNotification, resetSettings } = useSettings();

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Settings className="h-12 w-12 text-secondary-600 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-secondary-400 mb-6">
            Connect your wallet to access settings.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-secondary-400">Manage your preferences and wallet settings</p>
      </motion.div>

      {/* Wallet Info */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Wallet</h2>
        <Card className="p-6 space-y-4">
          {/* Connected Wallet */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-400 mb-1">Connected Wallet</p>
              <p className="font-mono text-white">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(address || '', 'connected')}
              >
                {copied === 'connected' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Prism Wallet */}
          {hasWallet && prismWalletAddress && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-sm text-secondary-400 mb-1">Prism Smart Wallet</p>
                <p className="font-mono text-white">
                  {prismWalletAddress.slice(0, 6)}...{prismWalletAddress.slice(-4)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(prismWalletAddress, 'prism')}
                >
                  {copied === 'prism' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://basescan.org/address/${prismWalletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.section>

      {/* Transaction Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Transaction Settings
        </h2>
        <Card className="p-6 space-y-6">
          {/* Slippage Tolerance */}
          <div>
            <label className="text-sm text-secondary-400 mb-2 block">
              Slippage Tolerance
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {['0.1', '0.5', '1.0'].map((value) => (
                  <Button
                    key={value}
                    variant={settings.slippageTolerance === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSlippage(value)}
                  >
                    {value}%
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.slippageTolerance}
                  onChange={(e) => updateSlippage(e.target.value)}
                  className="w-20 text-center"
                  min="0.01"
                  max="50"
                  step="0.1"
                />
                <span className="text-secondary-400">%</span>
              </div>
            </div>
            <p className="text-xs text-secondary-500 mt-2">
              Your transaction will revert if the price changes by more than this percentage.
            </p>
          </div>
        </Card>
      </motion.section>

      {/* Notifications */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h2>
        <Card className="divide-y divide-border">
          {Object.entries(settings.notifications).map(([key, value]) => {
            const labels: Record<string, { title: string; description: string }> = {
              positionAlerts: {
                title: 'Position Alerts',
                description: 'Get notified when your positions need attention',
              },
              priceAlerts: {
                title: 'Price Alerts',
                description: 'Receive alerts for significant price movements',
              },
              yieldChanges: {
                title: 'Yield Changes',
                description: 'Be notified when APYs change significantly',
              },
              weeklyReport: {
                title: 'Weekly Report',
                description: 'Receive a weekly summary of your portfolio',
              },
            };

            const notificationKey = key as keyof typeof settings.notifications;

            return (
              <div key={key} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{labels[key].title}</p>
                  <p className="text-sm text-secondary-400">{labels[key].description}</p>
                </div>
                <button
                  onClick={() => updateNotification(notificationKey, !value)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    value ? 'bg-primary' : 'bg-secondary-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      value ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </Card>
      </motion.section>

      {/* Security */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </h2>
        <Card className="divide-y divide-border">
          <a
            href="https://docs.prism.fi/security"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 flex items-center justify-between hover:bg-secondary-800/30 transition-colors"
          >
            <div>
              <p className="font-medium text-white">Security Documentation</p>
              <p className="text-sm text-secondary-400">Learn about our security practices</p>
            </div>
            <ChevronRight className="h-5 w-5 text-secondary-400" />
          </a>
          <a
            href="https://docs.prism.fi/audits"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 flex items-center justify-between hover:bg-secondary-800/30 transition-colors"
          >
            <div>
              <p className="font-medium text-white">Audit Reports</p>
              <p className="text-sm text-secondary-400">View our smart contract audits</p>
            </div>
            <ChevronRight className="h-5 w-5 text-secondary-400" />
          </a>
        </Card>
      </motion.section>

      {/* Actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={resetSettings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Settings to Default
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={handleDisconnect}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </Card>
      </motion.section>
    </div>
  );
}
