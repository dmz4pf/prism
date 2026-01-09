'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  SmartWalletCardV2,
  DepositModalV2,
  WithdrawModalV2,
  SwapModalV2,
} from '@/components/wallet';
import { useSmartWallet } from '@/hooks/wallet';

export default function WalletPage() {
  const { isConnected } = useAccount();
  const { smartWallet, isConnected: hasSmartWallet, isInitializing } = useSmartWallet();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const handleDeposit = () => {
    setShowDepositModal(true);
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  const handleSwap = () => {
    setShowSwapModal(true);
  };

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prism-section-box max-w-lg text-center space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-secondary-700 flex items-center justify-center">
            <Wallet className="h-10 w-10 text-secondary-400" />
          </div>
          <h1 className="text-3xl font-bold text-white font-heading">Connect Your Wallet</h1>
          <p className="text-secondary-400">
            Connect to access your Smart Wallet and start earning.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </motion.div>
      </div>
    );
  }

  // Show loading while wallet is initializing
  if (isInitializing) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-secondary-400">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="prism-section-header"
      >
        <p className="prism-section-label">Smart Wallet</p>
        <h1 className="prism-section-title text-3xl md:text-4xl">Prism Smart Wallet</h1>
        <p className="prism-section-subtitle">
          Deposit, swap, and execute DeFi strategies in one place.
        </p>
      </motion.div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto"
      >
        <SmartWalletCardV2
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          onSwap={handleSwap}
        />
      </motion.div>

      {/* How It Works */}
      {!hasSmartWallet && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-16"
        >
          <div className="prism-section-box-subtle">
            <div className="prism-section-header mb-10">
              <p className="prism-section-label">Getting Started</p>
              <h2 className="prism-section-title text-2xl md:text-3xl">How It Works</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: '1',
                  title: 'Connect Wallet',
                  description: 'Your smart wallet address is instantly derived from your EOA - no gas needed.',
                },
                {
                  step: '2',
                  title: 'Deposit Funds',
                  description: 'Transfer ETH or tokens from your EOA. Wallet deploys on first transaction.',
                },
                {
                  step: '3',
                  title: 'Trade & Earn',
                  description: 'Swap tokens, execute strategies, and access DeFi with batched transactions.',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ delay: index * 0.1 }}
                  className="prism-feature-card text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-medium text-white mb-2 font-heading">{item.title}</h3>
                  <p className="text-sm text-secondary-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <DepositModalV2
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
      <WithdrawModalV2
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
      />
      <SwapModalV2
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
      />
    </div>
  );
}
