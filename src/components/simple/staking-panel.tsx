'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, Shield, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProtocolData, usePrismWallet } from '@/hooks/wallet';
import type { StakingRate } from '@/types';

interface StakingPanelProps {
  onSuccess?: () => void;
}

export function StakingPanel({ onSuccess }: StakingPanelProps) {
  const { stakingRates, isLoading } = useProtocolData();
  const { hasWallet, prismWalletAddress } = usePrismWallet();
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);

  const selectedRate = stakingRates.find(r => r.protocol === selectedProtocol);

  const handleStake = async () => {
    if (!selectedProtocol || !amount || !hasWallet) return;

    setIsStaking(true);
    try {
      // In production: Execute staking via Prism Router
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate
      onSuccess?.();
      setAmount('');
    } catch (error) {
      console.error('Staking failed:', error);
    } finally {
      setIsStaking(false);
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
      <div className="grid gap-4">
        <h3 className="text-lg font-medium text-white">Select Staking Protocol</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {stakingRates.map((rate: StakingRate) => (
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
                        {rate.protocol.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{rate.protocol}</span>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-400">
                      {rate.apy.toFixed(1)}% APY
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {rate.token} → {rate.stakedToken}
                    </span>
                    <span className="text-slate-500">
                      TVL: {formatTvl(rate.tvlUsd)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Staking Form */}
      {selectedProtocol && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Stake with {selectedProtocol}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">Amount to Stake</label>
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
                    {selectedRate?.token ?? 'ETH'}
                  </span>
                </div>
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && selectedRate && (
                <div className="p-4 bg-slate-900 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">You will receive</span>
                    <span className="text-white font-medium">
                      ~{amount} {selectedRate.stakedToken}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Expected APY</span>
                    <span className="text-green-400 font-medium">
                      {selectedRate.apy.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Est. yearly earnings</span>
                    <span className="text-white">
                      ~{(parseFloat(amount) * (selectedRate.apy / 100)).toFixed(4)}{' '}
                      {selectedRate.token}
                    </span>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  Staking is done via your Prism Smart Wallet. The staked tokens will be
                  deposited to your wallet and can be used as collateral for lending.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleStake}
                disabled={!amount || parseFloat(amount) <= 0 || isStaking || !hasWallet}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isStaking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Staking...
                  </>
                ) : !hasWallet ? (
                  'Create Prism Wallet First'
                ) : (
                  `Stake ${selectedRate?.token ?? 'ETH'}`
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
