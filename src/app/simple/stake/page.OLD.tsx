'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ArrowLeft,
  TrendingUp,
  Check,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProtocolData } from '@/hooks/wallet/use-protocol-data';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { ConfirmationModal, PendingModal, SuccessModal, TransactionStep } from '@/components/modals';
import { formatUSD, cn } from '@/lib/utils';

// Staking protocols with details
const stakingProtocols = [
  {
    id: 'lido',
    name: 'Lido',
    logo: '/logos/lido.svg',
    token: 'stETH',
    apy: 3.4,
    tvl: 28500000000,
    description: 'Largest liquid staking protocol',
    features: ['No minimum', 'Instant liquidity', 'DeFi compatible'],
    riskLevel: 'low' as const,
  },
  {
    id: 'rocketpool',
    name: 'Rocket Pool',
    logo: '/logos/rocketpool.svg',
    token: 'rETH',
    apy: 3.1,
    tvl: 4200000000,
    description: 'Decentralized staking protocol',
    features: ['No minimum', 'Decentralized', 'Self-custody'],
    riskLevel: 'low' as const,
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '/logos/coinbase.svg',
    token: 'cbETH',
    apy: 2.9,
    tvl: 2800000000,
    description: 'Institutional-grade staking',
    features: ['Trusted brand', 'Insurance backed', 'Easy redemption'],
    riskLevel: 'low' as const,
  },
];

export default function StakePage() {
  const { isConnected } = useAccount();
  const { hasWallet, prismWalletAddress, ethBalance } = usePrismWallet();
  const { stakingRates } = useProtocolData();

  // State
  const [selectedProtocol, setSelectedProtocol] = useState(stakingProtocols[0]);
  const [amount, setAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [pendingSteps, setPendingSteps] = useState<TransactionStep[]>([]);

  // Calculate estimated receive amount (accounting for any fees)
  const estimatedReceive = amount ? parseFloat(amount) * 0.999 : 0;
  const estimatedValue = amount ? parseFloat(amount) * 2300 : 0; // Mock ETH price

  const handleStake = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setShowPending(true);

    setPendingSteps([
      { label: 'Approve transaction', status: 'in_progress' },
      { label: `Stake ${amount} ETH on ${selectedProtocol.name}`, status: 'pending' },
      { label: `Receive ${estimatedReceive.toFixed(4)} ${selectedProtocol.token}`, status: 'pending' },
    ]);

    // Simulate transaction steps
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
            Connect your wallet to stake ETH.
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
        title="Confirm Stake"
        description={`Stake ${amount} ETH on ${selectedProtocol.name}`}
        steps={[
          { label: 'Approve transaction', description: 'Sign in your wallet' },
          { label: `Stake ETH`, description: `Deposit to ${selectedProtocol.name}` },
          { label: `Receive ${selectedProtocol.token}`, description: 'Liquid staking token' },
        ]}
        gasEstimate="$2.50"
        totalValue={estimatedValue}
      />

      <PendingModal
        open={showPending}
        title="Staking ETH"
        description={`Staking ${amount} ETH on ${selectedProtocol.name}...`}
        steps={pendingSteps}
      />

      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setAmount('');
        }}
        title="Stake Complete!"
        description={`You have successfully staked ${amount} ETH`}
        txHash={txHash}
        amount={estimatedReceive.toFixed(4)}
        token={selectedProtocol.token}
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
          <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stake ETH</h1>
            <p className="text-secondary-400">
              Earn yield by staking ETH through liquid staking protocols
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
          {stakingProtocols.map((protocol) => (
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
                      {protocol.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{protocol.name}</p>
                    <p className="text-sm text-secondary-400">{protocol.token}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">{protocol.apy}%</p>
                  <p className="text-xs text-secondary-500">APY</p>
                </div>
              </div>
              {selectedProtocol.id === protocol.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-secondary-400 mb-2">{protocol.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {protocol.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs px-2 py-0.5 bg-secondary-800 rounded-full text-secondary-300"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </motion.div>

        {/* Stake Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 space-y-6">
            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-secondary-300">Amount</label>
                <span className="text-sm text-secondary-400">
                  Balance: {parseFloat(ethBalance || '0').toFixed(4)} ETH
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl h-16 pr-24"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setAmount(ethBalance || '0')}
                  >
                    MAX
                  </Button>
                  <span className="font-medium text-white">ETH</span>
                </div>
              </div>
              {amount && (
                <p className="text-sm text-secondary-400 mt-2">
                  ≈ {formatUSD(estimatedValue)}
                </p>
              )}
            </div>

            {/* Receive Estimate */}
            <div className="p-4 bg-secondary-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-400">You will receive</span>
                <div className="flex items-center gap-2 text-sm text-secondary-400">
                  <Info className="h-3.5 w-3.5" />
                  <span>~0.1% protocol fee</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {estimatedReceive.toFixed(4)}
                </span>
                <span className="font-medium text-white">{selectedProtocol.token}</span>
              </div>
            </div>

            {/* APY Info */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-green-300">Estimated APY</span>
              </div>
              <span className="text-xl font-bold text-green-400">
                {selectedProtocol.apy}%
              </span>
            </div>

            {/* Protocol Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-400">Protocol TVL</span>
              <span className="text-white">{formatUSD(selectedProtocol.tvl, true)}</span>
            </div>

            {/* Stake Button */}
            <Button
              size="lg"
              className="w-full"
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={handleStake}
            >
              {!amount || parseFloat(amount) <= 0 ? (
                'Enter amount'
              ) : (
                <>
                  Stake {amount} ETH
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-secondary-400">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <p>
                {selectedProtocol.token} is a liquid staking token that represents your staked ETH.
                You can use it in DeFi protocols while earning staking rewards.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
