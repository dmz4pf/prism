'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Shield, Zap, BarChart3, Wallet, TrendingUp, Layers, CircleDot, CheckCircle2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StrategyAPYTooltip } from '@/components/ui/apy-tooltip';
import { ProtocolLogo } from '@/components/ui/token-logo';
import { CountUp, CountUpCurrency } from '@/components/ui/count-up';
import { CreateWalletModal } from '@/components/modals';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { useStrategies } from '@/hooks/wallet/use-strategies';
import { formatUSD } from '@/lib/utils';
import { FeatureAccordion, StrategyCarousel } from '@/components/landing';
import { useRef } from 'react';

const features = [
  {
    icon: Shield,
    title: 'Smart Wallet',
    description: 'Batched transactions in one click.',
    color: 'text-green-400',
  },
  {
    icon: Zap,
    title: 'Real-Time APYs',
    description: 'Live rates from 50+ protocols.',
    color: 'text-yellow-400',
  },
  {
    icon: BarChart3,
    title: 'Visual Strategies',
    description: 'See how your funds flow.',
    color: 'text-blue-400',
  },
  {
    icon: Wallet,
    title: 'One-Click Deposit',
    description: 'One transaction entry.',
    color: 'text-secondary-400',
  },
];

const stats = [
  { label: 'Total Value Locked', value: 12400000, type: 'currency' as const },
  { label: 'Protocols Integrated', value: 50, suffix: '+', type: 'number' as const },
  { label: 'Avg Strategy APY', value: 8.4, suffix: '%', decimals: 1, type: 'number' as const },
  { label: 'Active Strategies', value: 3, type: 'number' as const },
];

const howItWorksSteps = [
  {
    step: 1,
    title: 'Connect Wallet',
    description: 'Connect MetaMask, Coinbase, or any wallet.',
    icon: Wallet,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    step: 2,
    title: 'Create Smart Wallet',
    description: 'One signature, no gas.',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    step: 3,
    title: 'Start Earning',
    description: 'Deposit and start earning.',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
];

const integratedProtocols = [
  { name: 'Aave', description: 'Lending & Borrowing' },
  { name: 'Lido', description: 'Liquid Staking' },
  { name: 'Compound', description: 'Money Markets' },
  { name: 'Spark', description: 'DAI Savings' },
  { name: 'Morpho', description: 'Optimized Lending' },
  { name: 'Ethena', description: 'Synthetic Yield' },
];

export default function LandingPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const { hasWallet, isLoading: walletLoading } = usePrismWallet();
  const { strategies } = useStrategies();
  const [showCreateWallet, setShowCreateWallet] = useState(false);

  // Track tagline visibility for animation restart
  const taglineRef = useRef(null);
  const isInView = useInView(taglineRef, { once: false, amount: 0.5 });
  const [animationKey, setAnimationKey] = useState(0);

  // Track stats visibility for animation restart
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: false, amount: 0.5 });
  const [statsAnimationKey, setStatsAnimationKey] = useState(0);

  // Show wallet creation modal for connected users without a Prism wallet
  // Note: We no longer auto-redirect - users can browse the landing page
  useEffect(() => {
    if (isConnected && !walletLoading && !hasWallet) {
      setShowCreateWallet(true);
    }
  }, [isConnected, hasWallet, walletLoading]);

  // Restart animation when coming into view
  useEffect(() => {
    if (isInView) {
      setAnimationKey(prev => prev + 1);
    }
  }, [isInView]);

  // Restart stats animation when coming into view
  useEffect(() => {
    if (statsInView) {
      setStatsAnimationKey(prev => prev + 1);
    }
  }, [statsInView]);

  const handleWalletCreated = () => {
    setShowCreateWallet(false);
    router.push('/dashboard');
  };

  // Featured strategies for preview
  const featuredStrategies = strategies.filter(s => s.featured).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Create Wallet Modal */}
      <CreateWalletModal
        open={showCreateWallet}
        onClose={() => setShowCreateWallet(false)}
        onSuccess={handleWalletCreated}
      />

      {/* Hero Section */}
      <section className="relative overflow-visible py-20 lg:py-32">
        {/* Mesh Gradient Background - Blue-Cyan Harmony - Animated & Extended */}
        <div
          className="absolute inset-0 -bottom-[600px] -z-10 overflow-visible"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
          }}
        >
          {/* Layer 1: Top-Left Blue - Primary glow */}
          <div
            className="gradient-blob-1 absolute -top-32 -left-32 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgb(99 102 241) 0%, transparent 70%)',
              '--opacity-start': '0.18',
              '--opacity-end': '0.35',
            } as React.CSSProperties}
          />

          {/* Layer 2: Top-Right Cyan - Accent glow */}
          <div
            className="gradient-blob-2 absolute -top-20 -right-20 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgb(6 182 212) 0%, transparent 65%)',
              '--opacity-start': '0.15',
              '--opacity-end': '0.3',
            } as React.CSSProperties}
          />

          {/* Layer 3: Center-Right Light Blue - Mid-section accent */}
          <div
            className="gradient-blob-3 absolute top-1/3 -right-40 w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] lg:w-[650px] lg:h-[650px] blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgb(56 189 248) 0%, transparent 60%)',
              '--opacity-start': '0.12',
              '--opacity-end': '0.25',
            } as React.CSSProperties}
          />

          {/* Layer 4: Bottom-Center Blue - Foundation glow */}
          <div
            className="gradient-blob-4 absolute -bottom-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgb(37 99 235) 0%, transparent 55%)',
              '--opacity-start': '0.1',
              '--opacity-end': '0.22',
            } as React.CSSProperties}
          />

          {/* Layer 5: Center Subtle Glow - Depth enhancer */}
          <div
            className="gradient-blob-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[500px] lg:h-[500px] blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgb(99 102 241) 0%, transparent 50%)',
              '--opacity-start': '0.08',
              '--opacity-end': '0.18',
            } as React.CSSProperties}
          />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-800 border border-secondary-700 mb-6"
            >
              <Layers className="h-4 w-4 text-secondary-400" />
              <span className="text-sm text-secondary-300">Built on Base</span>
            </motion.div>

            <motion.h1
              ref={taglineRef}
              className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold mb-6 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <span
                key={`defi-${animationKey}`}
                className="shimmer-text shimmer-text-complete inline-block"
                data-text="DeFi. "
              >
                DeFi.{' '}
              </span>
              <span
                key={`simplified-${animationKey}`}
                className="shimmer-text shimmer-text-complete inline-block"
                data-text="Simplified."
                style={{ animationDelay: '0.4s' } as React.CSSProperties}
              >
                Simplified.
              </span>
            </motion.h1>

            <p className="text-lg md:text-xl text-secondary-400 mb-8 max-w-2xl mx-auto">
              Stake, lend, and earn. One click.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Launch App
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button size="lg" onClick={openConnectModal} className="w-full sm:w-auto">
                      Launch App
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </ConnectButton.Custom>
              )}
              <a href="https://docs.prism.xyz" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Documentation
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={`stat-${stat.label}-${statsAnimationKey}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center p-4 rounded-xl bg-surface/50 border border-border"
              >
                <p className="text-2xl md:text-3xl font-bold font-mono text-white">
                  {stat.type === 'currency' ? (
                    <CountUpCurrency end={stat.value} compact duration={2.5} />
                  ) : (
                    <CountUp
                      end={stat.value}
                      suffix={stat.suffix || ''}
                      decimals={stat.decimals || 0}
                      duration={2}
                    />
                  )}
                </p>
                <p className="text-sm text-secondary-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Strategies Carousel */}
      <StrategyCarousel />

      {/* How It Works Section - UNBOXED */}
      <section className="prism-section-unboxed-bordered">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            className="prism-section-header"
          >
            <p className="prism-section-label">Getting Started</p>
            <h2 className="prism-section-title">
              How It Works
            </h2>
            <p className="prism-section-subtitle">
              Three steps to start earning.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorksSteps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {/* Connector line (hidden on mobile, shown between items) */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-border to-border/50" />
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Step number circle */}
                  <div className={`relative w-24 h-24 rounded-full ${item.bgColor} border ${item.borderColor} flex items-center justify-center mb-4`}>
                    <item.icon className={`h-10 w-10 ${item.color}`} />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{item.step}</span>
                    </div>
                  </div>

                  <h3 className="font-heading font-semibold text-white text-xl mb-2">
                    {item.title}
                  </h3>
                  <p className="text-secondary-400 text-sm max-w-xs">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Gas cost callout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">
                Transactions on Base cost less than $0.01
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Accordion Section */}
      <FeatureAccordion />

      {/* Protocol Partners Section - UNBOXED with subtle bg */}
      <section className="py-16 md:py-20 bg-surface/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            className="text-center mb-10 md:mb-14"
          >
            <p className="text-sm text-secondary-500 uppercase tracking-wider mb-3">
              Integrated Protocols
            </p>
            <h3 className="font-heading text-xl md:text-2xl text-secondary-300">
              Built on trusted DeFi infrastructure
            </h3>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {integratedProtocols.map((protocol, i) => (
              <motion.div
                key={protocol.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center p-4 rounded-xl bg-surface/50 border border-border hover:border-secondary-600 transition-colors group"
              >
                <ProtocolLogo protocol={protocol.name} size="lg" />
                <span className="text-sm font-medium text-white mt-2 group-hover:text-blue-400 transition-colors">
                  {protocol.name}
                </span>
                <span className="text-xs text-secondary-500 text-center">
                  {protocol.description}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - UNBOXED with individual cards */}
      <section className="prism-section-unboxed-bordered">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            className="prism-section-header"
          >
            <h2 className="prism-section-title">
              Why PRISM?
            </h2>
            <p className="prism-section-subtitle">
              The tools you need.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="prism-feature-card-hover h-full">
                  <feature.icon className={`h-8 w-8 ${feature.color} mb-4`} />
                  <h3 className="font-heading font-semibold text-white text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-400 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="relative rounded-2xl bg-secondary-800/50 border border-secondary-700 p-8 md:p-12 text-center overflow-hidden"
          >
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              Start earning
            </h2>
            <p className="text-secondary-300 mb-8 max-w-xl mx-auto">
              Connect your wallet to get started.
            </p>
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button size="lg" onClick={openConnectModal}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : (
              <Link href="/dashboard">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
