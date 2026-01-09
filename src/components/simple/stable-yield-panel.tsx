'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Coins, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProtocolData, usePrismWallet } from '@/hooks/wallet';
import type { StableYieldRate, RiskLevel } from '@/types';

interface StableYieldPanelProps {
  onSuccess?: () => void;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500' },
};

export function StableYieldPanel({ onSuccess }: StableYieldPanelProps) {
  const { stableYieldRates, isLoading } = useProtocolData();
  const { hasWallet } = usePrismWallet();
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const selectedRate = stableYieldRates.find(r => r.protocol === selectedProtocol);

  const handleConvert = async () => {
    if (!selectedProtocol || !amount || !hasWallet) return;

    setIsConverting(true);
    try {
      // In production: Execute conversion via Prism Router
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSuccess?.();
      setAmount('');
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setIsConverting(false);
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
      {/* Protocol Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-white">Select Yield-Bearing Stable</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {stableYieldRates.map((rate: StableYieldRate) => {
            const riskStyle = RISK_COLORS[rate.risk];
            return (
              <motion.div
                key={rate.protocol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
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
                          {rate.yieldToken.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-white block">
                            {rate.yieldToken}
                          </span>
                          <span className="text-xs text-slate-400">{rate.protocol}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">APY</span>
                        <span className="text-lg font-bold text-green-400">
                          {rate.apy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Risk</span>
                        <Badge
                          variant="outline"
                          className={`${riskStyle.border} ${riskStyle.text}`}
                        >
                          {rate.risk.charAt(0).toUpperCase() + rate.risk.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">TVL</span>
                        <span className="text-sm text-slate-300">
                          {formatTvl(rate.tvlUsd)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Conversion Form */}
      {selectedProtocol && selectedRate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Coins className="h-5 w-5 text-cyan-400" />
                Convert to {selectedRate.yieldToken}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">Amount to Convert</label>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    Max
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
                    {selectedRate.token}
                  </span>
                </div>
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-4 bg-slate-900 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">You will receive</span>
                    <span className="text-white font-medium">
                      ~{amount} {selectedRate.yieldToken}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Current APY</span>
                    <span className="text-green-400 font-medium">
                      {selectedRate.apy.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Est. yearly earnings</span>
                    <span className="text-white">
                      ~${(parseFloat(amount) * (selectedRate.apy / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Risk Warning for High Risk */}
              {selectedRate.risk === 'high' && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-300">
                    <p className="font-medium text-red-400 mb-1">High Risk Asset</p>
                    <p>
                      {selectedRate.yieldToken} has higher yields but also higher risks
                      including potential depeg scenarios. Only invest what you can afford
                      to lose.
                    </p>
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Yield accrues automatically</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Can be used as collateral on lending protocols</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span>Withdraw anytime to underlying stablecoin</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleConvert}
                disabled={!amount || parseFloat(amount) <= 0 || isConverting || !hasWallet}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : !hasWallet ? (
                  'Create Prism Wallet First'
                ) : (
                  `Convert to ${selectedRate.yieldToken}`
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
