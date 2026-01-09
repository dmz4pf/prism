'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ArrowLeft,
  Coins,
  ChevronRight,
  Info,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProtocolData } from '@/hooks/wallet/use-protocol-data';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { ConfirmationModal, PendingModal, SuccessModal, TransactionStep } from '@/components/modals';
import { formatUSD, cn } from '@/lib/utils';

const stableProtocols = [
  {
    id: 'sdai',
    name: 'Spark sDAI',
    logo: '/logos/spark.svg',
    inputToken: 'DAI',
    outputToken: 'sDAI',
    apy: 5.8,
    tvl: 1800000000,
    description: 'MakerDAO savings rate',
    riskLevel: 'low' as const,
    riskDescription: 'Backed by MakerDAO, minimal smart contract risk',
  },
  {
    id: 'usdy',
    name: 'Ondo USDY',
    logo: '/logos/ondo.svg',
    inputToken: 'USDC',
    outputToken: 'USDY',
    apy: 4.9,
    tvl: 450000000,
    description: 'US Treasury backed yield',
    riskLevel: 'low' as const,
    riskDescription: 'Backed by short-term US Treasuries',
  },
  {
    id: 'susde',
    name: 'Ethena sUSDe',
    logo: '/logos/ethena.svg',
    inputToken: 'USDC',
    outputToken: 'sUSDe',
    apy: 18.0,
    tvl: 2100000000,
    description: 'Delta-neutral yield',
    riskLevel: 'high' as const,
    riskDescription: 'Higher yield but dependent on funding rates; newer protocol',
  },
];

export default function StableYieldPage() {
  const { isConnected } = useAccount();
  const { hasWallet, tokenBalances } = usePrismWallet();
  const { stableYieldRates } = useProtocolData();

  // State
  const [selectedProtocol, setSelectedProtocol] = useState(stableProtocols[0]);
  const [amount, setAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [pendingSteps, setPendingSteps] = useState<TransactionStep[]>([]);

  // Mock balance
  const tokenBalance = '10000';
  const estimatedReceive = amount ? (parseFloat(amount) * 0.98).toFixed(2) : '0';
  const estimatedValue = amount ? parseFloat(amount) : 0;

  const handleConvert = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setShowPending(true);

    setPendingSteps([
      { label: 'Approve transaction', status: 'in_progress' },
      { label: `Convert ${amount} ${selectedProtocol.inputToken}`, status: 'pending' },
      { label: `Receive ${selectedProtocol.outputToken}`, status: 'pending' },
    ]);

    await new Promise((r) => setTimeout(r, 2000));
    setPendingSteps((prev) => [
      { ...prev[0], status: 'completed' },
      { ...prev[1], status: 'in_progress' },
      prev[2],
    ]);

    await new Promise((r) => setTimeout(r, 3000));
    setPendingSteps((prev) => [
      prev[0],
      { ...prev[1], status: 'completed', txHash: '0x1234...abcd' },
      { ...prev[2], status: 'in_progress' },
    ]);

    await new Promise((r) => setTimeout(r, 1500));
    setPendingSteps((prev) => [
      prev[0],
      prev[1],
      { ...prev[2], status: 'completed' },
    ]);

    setTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    setShowPending(false);
    setShowSuccess(true);
  };

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-secondary-400 mb-6">
            Connect your wallet to convert to yield-bearing stables.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        title="Confirm Conversion"
        description={`Convert ${amount} ${selectedProtocol.inputToken} to ${selectedProtocol.outputToken}`}
        steps={[
          { label: 'Approve transaction', description: 'Sign in your wallet' },
          { label: `Convert to ${selectedProtocol.outputToken}`, description: selectedProtocol.name },
        ]}
        gasEstimate="$2.00"
        totalValue={estimatedValue}
        warning={selectedProtocol.riskLevel === 'high' ? selectedProtocol.riskDescription : undefined}
      />

      <PendingModal
        open={showPending}
        title="Converting..."
        description={`Converting ${amount} ${selectedProtocol.inputToken} to ${selectedProtocol.outputToken}...`}
        steps={pendingSteps}
      />

      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setAmount('');
        }}
        title="Conversion Complete!"
        description={`You have successfully converted to ${selectedProtocol.outputToken}`}
        txHash={txHash}
        amount={estimatedReceive}
        token={selectedProtocol.outputToken}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-secondary-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
            <Coins className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Yield-Bearing Stables</h1>
            <p className="text-secondary-400">
              Convert stablecoins to yield-bearing versions that grow automatically
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-3"
        >
          <h3 className="font-medium text-white">Select Protocol</h3>
          {stableProtocols.map((protocol) => (
            <Card
              key={protocol.id}
              className={cn(
                'p-4 cursor-pointer transition-all',
                selectedProtocol.id === protocol.id
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'hover:border-gray-600'
              )}
              onClick={() => setSelectedProtocol(protocol)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {protocol.outputToken.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{protocol.name}</p>
                    <p className="text-xs text-secondary-400">{protocol.outputToken}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-bold',
                    protocol.riskLevel === 'high' ? 'text-orange-400' : 'text-green-400'
                  )}>
                    {protocol.apy}%
                  </p>
                  <p className="text-xs text-secondary-500">APY</p>
                </div>
              </div>
              {selectedProtocol.id === protocol.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-secondary-400 mb-2">{protocol.description}</p>
                  <div className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    protocol.riskLevel === 'low'
                      ? 'bg-green-500/20 text-green-400'
                      : protocol.riskLevel === 'high'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {protocol.riskLevel === 'low' ? 'Low Risk' : protocol.riskLevel === 'high' ? 'Higher Risk' : 'Medium Risk'}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </motion.div>

        {/* Convert Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 space-y-6">
            {/* From Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-secondary-300">From</label>
                <span className="text-sm text-secondary-400">
                  Balance: {tokenBalance} {selectedProtocol.inputToken}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl h-16 pr-28"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setAmount(tokenBalance)}
                  >
                    MAX
                  </Button>
                  <span className="font-medium text-white">{selectedProtocol.inputToken}</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-secondary-800 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-blue-400" />
              </div>
            </div>

            {/* To Output */}
            <div className="p-4 bg-secondary-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-400">You will receive (approx.)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{estimatedReceive}</span>
                <span className="font-medium text-white">{selectedProtocol.outputToken}</span>
              </div>
            </div>

            {/* APY Info */}
            <div className={cn(
              'flex items-center justify-between p-4 border rounded-lg',
              selectedProtocol.riskLevel === 'high'
                ? 'bg-orange-500/10 border-orange-500/20'
                : 'bg-green-500/10 border-green-500/20'
            )}>
              <div className="flex items-center gap-2">
                <Coins className={cn(
                  'h-5 w-5',
                  selectedProtocol.riskLevel === 'high' ? 'text-orange-400' : 'text-green-400'
                )} />
                <span className={selectedProtocol.riskLevel === 'high' ? 'text-orange-300' : 'text-green-300'}>
                  Yield Rate
                </span>
              </div>
              <span className={cn(
                'text-xl font-bold',
                selectedProtocol.riskLevel === 'high' ? 'text-orange-400' : 'text-green-400'
              )}>
                {selectedProtocol.apy}%
              </span>
            </div>

            {/* Risk Warning for High Risk */}
            {selectedProtocol.riskLevel === 'high' && (
              <div className="flex items-start gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-orange-200 font-medium">Higher Risk Protocol</p>
                  <p className="text-orange-200/70 mt-1">{selectedProtocol.riskDescription}</p>
                </div>
              </div>
            )}

            {/* Protocol Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-400">Protocol TVL</span>
              <span className="text-white">{formatUSD(selectedProtocol.tvl, true)}</span>
            </div>

            {/* Convert Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={handleConvert}
            >
              {!amount || parseFloat(amount) <= 0 ? (
                'Enter amount'
              ) : (
                <>
                  Convert to {selectedProtocol.outputToken}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-secondary-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <p>
                {selectedProtocol.outputToken} is a yield-bearing stablecoin. Your balance will automatically
                increase over time as yield accrues. You can convert back to {selectedProtocol.inputToken} anytime.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
