'use client';

/**
 * CreateWalletModal - Smart Wallet Creation Flow
 *
 * This modal guides users through the smart wallet creation process:
 *
 * Step 1: Connect Wallet
 * - User connects their EOA (MetaMask, WalletConnect, etc.)
 * - Automatic network switching if needed
 *
 * Step 2: Create PRISM Wallet
 * - User signs a message to authorize smart wallet creation
 * - ZeroDev creates a Kernel smart account owned by the EOA
 * - Address is computed counterfactually (no gas until first tx)
 *
 * Benefits of Smart Wallet:
 * - Batched transactions (gas savings)
 * - Gas sponsorship (pay in tokens or free)
 * - Session keys (automation)
 * - Enhanced security via validators
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Loader2,
  Layers,
  Sparkles,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePrismWallet, useNetworkSwitch } from '@/hooks/wallet';

interface CreateWalletModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'connect' | 'create' | 'success';

const connectFeatures = [
  {
    icon: Shield,
    title: 'Secure Connection',
    description: 'Connect with MetaMask, WalletConnect, or Coinbase Wallet',
  },
  {
    icon: Zap,
    title: 'No Setup Required',
    description: 'Use your existing wallet - no new keys to manage',
  },
];

const smartWalletFeatures = [
  {
    icon: Layers,
    title: 'Batched Transactions',
    description: 'Execute multiple DeFi actions in a single transaction',
  },
  {
    icon: Sparkles,
    title: 'Gas Sponsorship',
    description: 'Transactions can be sponsored - pay less or no gas',
  },
  {
    icon: Shield,
    title: 'Enhanced Security',
    description: 'Smart contract wallet with customizable security rules',
  },
  {
    icon: Wallet,
    title: 'Full Control',
    description: 'Your EOA always controls the smart wallet',
  },
];

export function CreateWalletModal({
  open,
  onClose,
  onSuccess,
}: CreateWalletModalProps) {
  const { isConnected, address } = useAccount();
  const { isCorrectNetwork, switchToTarget, targetNetwork } = useNetworkSwitch();
  const {
    hasSmartWallet,
    smartWalletAddress,
    isCreatingSmartWallet,
    smartWalletError,
    createSmartWallet,
  } = usePrismWallet();

  const [step, setStep] = useState<Step>('connect');
  const [copied, setCopied] = useState(false);

  // Determine current step based on state
  useEffect(() => {
    if (!isConnected) {
      setStep('connect');
    } else if (hasSmartWallet) {
      setStep('success');
    } else {
      setStep('create');
    }
  }, [isConnected, hasSmartWallet]);

  // Auto-close on success if callback provided
  useEffect(() => {
    if (step === 'success' && hasSmartWallet && open) {
      const timer = setTimeout(() => {
        onSuccess?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, hasSmartWallet, open, onSuccess]);

  const handleCreateWallet = async () => {
    try {
      await createSmartWallet();
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to create smart wallet:', error);
    }
  };

  const handleCopyAddress = () => {
    if (smartWalletAddress) {
      navigator.clipboard.writeText(smartWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <AnimatePresence mode="wait">
          {/* Step 1: Connect Wallet */}
          {step === 'connect' && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-blue-400" />
                </div>
                <DialogTitle className="text-center text-xl">
                  Connect Your Wallet
                </DialogTitle>
                <DialogDescription className="text-center">
                  First, connect your existing wallet to get started with PRISM.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                {connectFeatures.map((feature) => (
                  <div key={feature.title} className="prism-feature-item">
                    <div className="prism-feature-icon">
                      <feature.icon className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{feature.title}</p>
                      <p className="text-xs text-secondary-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <ConnectButton />
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                <div className="w-2 h-2 rounded-full bg-gray-600" />
              </div>
            </motion.div>
          )}

          {/* Step 2: Create Smart Wallet */}
          {step === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-400/30 flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-8 w-8 text-blue-400" />
                </div>
                <DialogTitle className="text-center text-xl">
                  Create PRISM Wallet
                </DialogTitle>
                <DialogDescription className="text-center">
                  Create a smart wallet to unlock advanced DeFi features.
                  Your connected wallet ({formatAddress(address ?? '')}) will control it.
                </DialogDescription>
              </DialogHeader>

              {/* Network check */}
              {!isCorrectNetwork && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 my-4">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-400">
                      Please switch to {targetNetwork.name}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => switchToTarget()}
                    className="text-xs"
                  >
                    Switch
                  </Button>
                </div>
              )}

              <div className="space-y-2 py-4">
                {smartWalletFeatures.map((feature) => (
                  <div key={feature.title} className="prism-feature-item">
                    <div className="prism-feature-icon">
                      <feature.icon className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{feature.title}</p>
                      <p className="text-xs text-secondary-400">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error display */}
              {smartWalletError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">
                    {smartWalletError.message || 'Failed to create wallet. Please try again.'}
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateWallet}
                disabled={isCreatingSmartWallet || !isCorrectNetwork}
                className="w-full"
              >
                {isCreatingSmartWallet ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Wallet...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create PRISM Wallet
                  </>
                )}
              </Button>

              <p className="text-xs text-secondary-500 text-center mt-3">
                You&apos;ll be asked to sign a message. This is free and doesn&apos;t cost gas.
              </p>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-gray-600" />
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <DialogHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <DialogTitle className="text-center text-xl text-green-400">
                  PRISM Wallet Created!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Your smart wallet is ready. You can now access all PRISM features.
                </DialogDescription>
              </DialogHeader>

              {/* Wallet address display */}
              {smartWalletAddress && (
                <div className="mt-6 p-4 bg-surface/50 border border-border rounded-lg">
                  <p className="text-xs text-secondary-400 mb-2">Your PRISM Wallet Address</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm text-white font-mono">
                      {formatAddress(smartWalletAddress)}
                    </code>
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopyAddress}
                        className="p-1.5 rounded-md hover:bg-surface transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-secondary-400" />
                        )}
                      </button>
                      <a
                        href={`https://basescan.org/address/${smartWalletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-surface transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="h-4 w-4 text-secondary-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="prism-info-box-success mt-4">
                <p className="text-xs text-green-400 text-center">
                  Your wallet will be deployed on-chain when you make your first transaction.
                  Until then, no gas is required!
                </p>
              </div>

              <Button onClick={onClose} className="w-full mt-4">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
