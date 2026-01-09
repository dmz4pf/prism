'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowUpDown, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProtocolData, usePrismWallet } from '@/hooks/wallet';
import type { ProtocolRate } from '@/types';

type LendingAction = 'supply' | 'borrow';

interface LendingPanelProps {
  onSuccess?: () => void;
}

export function LendingPanel({ onSuccess }: LendingPanelProps) {
  const { lendingRates, isLoading } = useProtocolData();
  const { hasWallet } = usePrismWallet();
  const [action, setAction] = useState<LendingAction>('supply');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get unique assets
  const assets = [...new Set(lendingRates.map(r => r.asset))];

  // Get protocols for selected asset
  const protocolsForAsset = selectedAsset
    ? lendingRates.filter(r => r.asset === selectedAsset)
    : [];

  const selectedRate = lendingRates.find(
    r => r.asset === selectedAsset && r.protocol === selectedProtocol
  );

  const handleAction = async () => {
    if (!selectedAsset || !selectedProtocol || !amount || !hasWallet) return;

    setIsProcessing(true);
    try {
      // In production: Execute lending action via Prism Router
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess?.();
      setAmount('');
    } catch (error) {
      console.error('Lending action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTvl = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
    return `$${(tvl / 1e3).toFixed(1)}K`;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Toggle */}
      <div className="flex rounded-lg bg-slate-800 p-1 max-w-xs">
        <button
          onClick={() => setAction('supply')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            action === 'supply'
              ? 'bg-green-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Supply
        </button>
        <button
          onClick={() => setAction('borrow')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            action === 'borrow'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Borrow
        </button>
      </div>

      {/* Asset Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-white">Select Asset</h3>
        <div className="flex flex-wrap gap-2">
          {assets.map(asset => (
            <Button
              key={asset}
              variant={selectedAsset === asset ? 'default' : 'outline'}
              onClick={() => {
                setSelectedAsset(asset);
                setSelectedProtocol(null);
              }}
              className={
                selectedAsset === asset
                  ? 'bg-blue-600'
                  : 'border-slate-600 text-slate-300'
              }
            >
              {asset}
            </Button>
          ))}
        </div>
      </div>

      {/* Protocol Selection */}
      {selectedAsset && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-medium text-white">Select Protocol</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {protocolsForAsset.map((rate: ProtocolRate) => (
              <Card
                key={rate.protocol}
                className={`cursor-pointer transition-colors ${
                  selectedProtocol === rate.protocol
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
                onClick={() => setSelectedProtocol(rate.protocol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        {rate.protocol.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{rate.protocol}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Supply APY</span>
                      <span className="text-green-400">
                        {rate.supplyAPY?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Borrow APY</span>
                      <span className="text-orange-400">
                        {rate.borrowAPY?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">TVL</span>
                      <span className="text-slate-300">{formatTvl(rate.tvlUsd)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lending Form */}
      {selectedProtocol && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-blue-400" />
                {action === 'supply' ? 'Supply' : 'Borrow'} {selectedAsset} on{' '}
                {selectedProtocol}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">
                    Amount to {action === 'supply' ? 'Supply' : 'Borrow'}
                  </label>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    {action === 'supply' ? 'Max' : 'Safe Max'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-900 border-slate-600 text-white text-lg pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {selectedAsset}
                  </span>
                </div>
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && selectedRate && (
                <div className="p-4 bg-slate-900 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {action === 'supply' ? 'APY Earning' : 'Borrow Rate'}
                    </span>
                    <span
                      className={
                        action === 'supply' ? 'text-green-400' : 'text-orange-400'
                      }
                    >
                      {action === 'supply'
                        ? `${selectedRate.supplyAPY?.toFixed(2)}%`
                        : `${selectedRate.borrowAPY?.toFixed(2)}%`}
                    </span>
                  </div>
                  {action === 'borrow' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Interest per year</span>
                      <span className="text-orange-400">
                        ~
                        {(
                          parseFloat(amount) * ((selectedRate.borrowAPY ?? 0) / 100)
                        ).toFixed(4)}{' '}
                        {selectedAsset}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning for Borrow */}
              {action === 'borrow' && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    Borrowing requires collateral. Make sure you have assets supplied
                    and maintain a healthy position to avoid liquidation.
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  {action === 'supply'
                    ? 'Supplied assets can be used as collateral to borrow other assets.'
                    : 'You can borrow up to your collateral limit. Monitor your health factor.'}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleAction}
                disabled={!amount || parseFloat(amount) <= 0 || isProcessing || !hasWallet}
                className={`w-full ${
                  action === 'supply'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : !hasWallet ? (
                  'Create Prism Wallet First'
                ) : (
                  `${action === 'supply' ? 'Supply' : 'Borrow'} ${selectedAsset}`
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
