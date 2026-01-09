# PRISM Frontend - Volume 1 Codebase Snapshot
**Date:** January 3, 2026
**Version:** Pre-UI-Redesign Baseline

---

## Project Overview

PRISM is a DeFi yield aggregator on Base that provides:
- Smart wallet for one-click multi-protocol strategies
- Simple actions (Stake, Lend, Stable Yield)
- Visual strategy flows showing where yield comes from

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom theme
- **State:** TanStack Query + wagmi
- **Wallet:** RainbowKit + wagmi
- **Animations:** Framer Motion
- **UI Components:** Radix UI primitives

---

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── page.tsx             # Landing page
│   │   ├── globals.css          # Global styles + CSS variables
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Dashboard with position cards
│   │   ├── wallet/
│   │   │   └── page.tsx         # Wallet management page
│   │   ├── strategies/
│   │   │   ├── page.tsx         # Strategy listing
│   │   │   └── [id]/page.tsx    # Strategy detail + deposit
│   │   ├── simple/
│   │   │   ├── page.tsx         # Simple actions hub
│   │   │   ├── stake/page.tsx   # ETH staking
│   │   │   ├── lend/page.tsx    # Lending/borrowing
│   │   │   └── stable/page.tsx  # Stable yield conversion
│   │   └── settings/
│   │       └── page.tsx         # User settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx       # Navigation header
│   │   │   └── footer.tsx       # Site footer
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── slider.tsx
│   │   ├── modals/
│   │   │   ├── index.ts
│   │   │   ├── confirmation-modal.tsx
│   │   │   ├── pending-modal.tsx
│   │   │   ├── success-modal.tsx
│   │   │   └── create-wallet-modal.tsx
│   │   ├── strategies/
│   │   │   ├── strategy-card.tsx
│   │   │   └── strategy-flow.tsx
│   │   └── wallet/
│   │       ├── prism-wallet-card.tsx
│   │       └── deposit-withdraw.tsx
│   ├── hooks/
│   │   └── wallet/
│   │       ├── index.ts
│   │       ├── use-prism-wallet.ts
│   │       ├── use-strategies.ts
│   │       └── use-protocol-data.ts
│   ├── contracts/
│   │   ├── addresses.ts         # Contract addresses
│   │   └── abis.ts              # Contract ABIs
│   ├── lib/
│   │   ├── utils.ts             # Utility functions
│   │   ├── api.ts               # API client
│   │   └── wagmi.ts             # Wagmi config
│   └── types/
│       └── index.ts             # TypeScript types
├── public/
│   └── logos/                   # Protocol logos (placeholder)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Core Files

### 1. Landing Page (`src/app/page.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, TrendingUp, Layers, ChevronRight, Star, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { useStrategies } from '@/hooks/wallet/use-strategies';
import { CreateWalletModal } from '@/components/modals';

const stats = [
  { label: 'Total Value Locked', value: '$12.4M' },
  { label: 'Protocols Integrated', value: '50+' },
  { label: 'Avg Strategy APY', value: '8.4%' },
  { label: 'Active Strategies', value: '3' },
];

const features = [
  {
    icon: Shield,
    title: 'Smart Wallet Security',
    description: 'Your assets stay in your control through audited smart contracts. No custody, no counterparty risk.',
  },
  {
    icon: Zap,
    title: 'One-Click Strategies',
    description: 'Execute complex multi-protocol strategies in a single transaction. Save 50-70% on gas.',
  },
  {
    icon: TrendingUp,
    title: 'Curated Yields',
    description: 'Expert-reviewed strategies with transparent risk ratings. Know exactly where your yield comes from.',
  },
  {
    icon: Layers,
    title: 'Visual Flow',
    description: 'See exactly how your funds flow through protocols. Full transparency on every step.',
  },
];

const RISK_STYLES = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function LandingPage() {
  const { isConnected } = useAccount();
  const { hasWallet } = usePrismWallet();
  const { strategies } = useStrategies();
  const router = useRouter();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Redirect connected users with wallet to dashboard
  useEffect(() => {
    if (isConnected && hasWallet) {
      router.push('/dashboard');
    }
  }, [isConnected, hasWallet, router]);

  const handleGetStarted = () => {
    if (!isConnected) {
      // RainbowKit will handle this
      return;
    }
    if (!hasWallet) {
      setShowWalletModal(true);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative">
      <CreateWalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSuccess={() => router.push('/dashboard')}
      />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-prism/20 via-transparent to-transparent" />

        <div className="container relative z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge variant="outline" className="mb-6 border-prism/50 text-prism">
              Base-First DeFi Yield Aggregator
            </Badge>

            <h1 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Your Yield,{' '}
              <span className="text-transparent bg-clip-text bg-prism">
                Optimized
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              PRISM simplifies DeFi with smart wallet strategies. One click to deploy,
              one click to withdraw. See exactly where your yield comes from.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button size="xl" onClick={openConnectModal}>
                      Connect Wallet
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  )}
                </ConnectButton.Custom>
              ) : !hasWallet ? (
                <Button size="xl" onClick={handleGetStarted}>
                  Create Smart Wallet
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button size="xl" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              <Button variant="outline" size="xl" asChild>
                <Link href="/strategies">
                  Explore Strategies
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-background/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              DeFi Made Simple
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Complex yield strategies, simplified into one-click actions.
              Full transparency on where your yield comes from.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-surface hover:border-prism/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-prism/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-prism" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategies Preview Section */}
      <section className="py-20 bg-surface/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12"
          >
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">
                Featured Strategies
              </h2>
              <p className="text-gray-400">
                Expert-curated strategies with transparent risk ratings
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/strategies">
                View All Strategies
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.slice(0, 3).map((strategy, index) => {
              const riskStyle = RISK_STYLES[strategy.riskLevel];
              return (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/strategies/${strategy.id}`}>
                    <Card className="h-full cursor-pointer hover:border-prism/50 transition-colors">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {strategy.weeksPick && (
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              )}
                              <h3 className="font-semibold text-white">{strategy.name}</h3>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {strategy.description}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-500" />
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-green-400">
                            {strategy.currentAPY.toFixed(1)}%
                          </span>
                          <span className="text-sm text-gray-400">APY</span>
                        </div>

                        <div className="flex items-center gap-4 pt-2 border-t border-border">
                          <div className={`flex items-center gap-1 ${riskStyle.text}`}>
                            {strategy.riskLevel === 'high' && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <span className="text-xs capitalize">{strategy.riskLevel} Risk</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">
                              {strategy.timeHorizon === 'long' ? '6+ months' :
                               strategy.timeHorizon === 'medium' ? '1-6 months' : 'Short-term'}
                            </span>
                          </div>
                          <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-300 text-xs">
                            {strategy.inputToken}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Optimize Your Yield?
            </h2>
            <p className="text-gray-400 mb-8">
              Create your Prism Smart Wallet and start earning optimized yields in minutes.
            </p>
            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button size="xl" onClick={openConnectModal}>
                    Connect Wallet to Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </ConnectButton.Custom>
            ) : (
              <Button size="xl" onClick={handleGetStarted}>
                {hasWallet ? 'Go to Dashboard' : 'Create Smart Wallet'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
```

---

### 2. Dashboard Page (`src/app/dashboard/page.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Landmark,
  Coins,
  ArrowRight,
  Plus,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrismWallet } from '@/hooks/wallet/use-prism-wallet';
import { useStrategies } from '@/hooks/wallet/use-strategies';
import { CreateWalletModal } from '@/components/modals';
import { formatUSD, cn } from '@/lib/utils';

// Mock data for dashboard positions
const mockPositions = {
  staking: [
    { id: '1', protocol: 'Lido', token: 'stETH', balance: '2.5', valueUsd: 5750, apy: 3.4 },
  ],
  lending: [
    { id: '2', protocol: 'Aave', token: 'USDC', balance: '5000', valueUsd: 5000, apy: 4.2, type: 'supply' },
  ],
  stableYield: [
    { id: '3', protocol: 'Spark', token: 'sDAI', balance: '3000', valueUsd: 3000, apy: 5.8 },
  ],
  strategies: [
    { id: '4', name: 'ETH Yield Maximizer', valueUsd: 5000, apy: 8.4, profit: 420, health: 1.8 },
  ],
};

const categoryCards = [
  {
    title: 'Staking',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    href: '/simple/stake',
    positions: mockPositions.staking,
  },
  {
    title: 'Lending',
    icon: Landmark,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    href: '/simple/lend',
    positions: mockPositions.lending,
  },
  {
    title: 'Stable Yield',
    icon: Coins,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    href: '/simple/stable',
    positions: mockPositions.stableYield,
  },
];

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { hasWallet, isLoading } = usePrismWallet();
  const { positions: strategyPositions } = useStrategies();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Calculate totals from mock data
  const totalValue = 15034; // Sum of all positions
  const yieldEarned = 1284;
  const blendedAPY = 5.2;

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Wallet className="h-16 w-16 text-prism mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h1>
          <p className="text-gray-400 mb-6">
            Connect your wallet to view your PRISM dashboard and manage your positions.
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (!hasWallet && !isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <CreateWalletModal
          open={showWalletModal}
          onClose={() => setShowWalletModal(false)}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Wallet className="h-16 w-16 text-prism mx-auto mb-6" />
          <h1 className="font-heading text-2xl font-bold text-white mb-4">
            Create Your Prism Wallet
          </h1>
          <p className="text-gray-400 mb-6">
            Deploy your smart wallet to start using PRISM strategies and earn optimized yields.
          </p>
          <Button size="lg" onClick={() => setShowWalletModal(true)}>
            Create Smart Wallet
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <CreateWalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <Card className="md:col-span-2 bg-gradient-to-br from-prism/10 to-purple-600/10 border-prism/30">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-white mb-4">{formatUSD(totalValue)}</p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-400">Yield Earned</p>
                <p className="text-lg font-semibold text-green-400">+{formatUSD(yieldEarned)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Blended APY</p>
                <p className="text-lg font-semibold text-white">{blendedAPY}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/wallet">
                <Wallet className="h-4 w-4 mr-2" />
                Manage Wallet
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/strategies">
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore Strategies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Strategy Positions */}
      {mockPositions.strategies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-semibold text-white">Active Strategies</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/strategies">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {mockPositions.strategies.map((position) => (
              <Card key={position.id} className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{position.name}</h3>
                      <p className="text-2xl font-bold text-white mt-1">{formatUSD(position.valueUsd)}</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      +{formatUSD(position.profit)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-400">APY:</span>
                      <span className="text-green-400 ml-1">{position.apy}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Health:</span>
                      <span className="text-white ml-1">{position.health}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Position Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-heading text-xl font-semibold text-white mb-4">Simple Positions</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {categoryCards.map((category) => (
            <Card key={category.title} className={cn('border', category.borderColor)}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', category.bgColor)}>
                    <category.icon className={cn('h-4 w-4', category.color)} />
                  </div>
                  <span className="text-white">{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.positions.length > 0 ? (
                  category.positions.map((pos: any) => (
                    <div key={pos.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                      <div>
                        <p className="text-sm font-medium text-white">{pos.token}</p>
                        <p className="text-xs text-gray-400">{pos.protocol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{formatUSD(pos.valueUsd)}</p>
                        <p className="text-xs text-green-400">{pos.apy}% APY</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No {category.title.toLowerCase()} positions</p>
                  </div>
                )}
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href={category.href}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
```

---

### 3. Strategy Card Component (`src/components/strategies/strategy-card.tsx`)

```tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Star, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StrategyRecommendation, RiskLevel, TimeHorizon } from '@/types';

interface StrategyCardProps {
  strategy: StrategyRecommendation;
  featured?: boolean;
}

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const TIME_HORIZON_LABELS: Record<TimeHorizon, string> = {
  long: '6+ months',
  medium: '1-6 months',
  opportunistic: 'Short-term',
};

export function StrategyCard({ strategy, featured = false }: StrategyCardProps) {
  const riskStyle = RISK_STYLES[strategy.riskLevel];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/strategies/${strategy.id}`}>
        <Card
          className={`h-full cursor-pointer transition-colors ${
            featured
              ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30'
              : 'bg-slate-800 border-slate-700 hover:border-slate-600'
          }`}
        >
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {strategy.weeksPick && (
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  )}
                  <h3 className="font-semibold text-white">{strategy.name}</h3>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">
                  {strategy.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 flex-shrink-0" />
            </div>

            {/* APY Display */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-green-400">
                {strategy.currentAPY.toFixed(1)}%
              </span>
              <span className="text-sm text-slate-400">APY</span>
            </div>

            {/* Strategy Flow Preview */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {strategy.flow.slice(0, 3).map((step, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="border-slate-600 text-slate-300 text-xs whitespace-nowrap"
                  >
                    {step.protocol}
                  </Badge>
                  {idx < Math.min(strategy.flow.length - 1, 2) && (
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                  )}
                </div>
              ))}
              {strategy.flow.length > 3 && (
                <span className="text-xs text-slate-500">
                  +{strategy.flow.length - 3} more
                </span>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex items-center gap-3">
                {/* Risk Badge */}
                <div className={`flex items-center gap-1 ${riskStyle.text}`}>
                  {strategy.riskLevel === 'high' && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <span className="text-xs capitalize">{strategy.riskLevel} Risk</span>
                </div>

                {/* Time Horizon */}
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {TIME_HORIZON_LABELS[strategy.timeHorizon]}
                  </span>
                </div>
              </div>

              {/* Input Token */}
              <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                {strategy.inputToken}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
```

---

### 4. Types (`src/types/index.ts`)

```typescript
import type { Address } from 'viem';

// ============================================
// PRISM SMART WALLET TYPES
// ============================================

export interface PrismWallet {
  address: Address;
  owner: Address;
  createdAt: string;
  totalValueUsd: number;
  isDeployed: boolean;
}

export interface WalletBalance {
  token: string;
  tokenAddress: Address;
  symbol: string;
  balance: string;
  balanceUsd: number;
  decimals: number;
}

// ============================================
// STRATEGY TYPES (Core Innovation)
// ============================================

export type TimeHorizon = 'long' | 'medium' | 'opportunistic';
export type RiskLevel = 'low' | 'medium' | 'high';
export type StrategyAction = 'stake' | 'supply' | 'borrow' | 'convert' | 'loop';

export interface StrategyStep {
  protocol: string;
  protocolLogo?: string;
  action: StrategyAction;
  tokenIn: string;
  tokenOut: string;
  apy: number;
  description?: string;
}

export interface StrategyRecommendation {
  id: string;
  name: string;
  description: string;
  timeHorizon: TimeHorizon;
  currentAPY: number;
  calculatedAt: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  flow: StrategyStep[];
  recommendedSince: string;
  lastReviewedAt: string;
  reviewNotes?: string;
  historicalAPY: { date: string; apy: number }[];
  tvlUsd: number;
  minDeposit: number;
  maxDeposit: number;
  inputToken: string;
  inputTokenAddress: Address;
  vaultAddress?: Address;
  featured?: boolean;
  weeksPick?: boolean;
}

export interface StrategyPosition {
  id: string;
  strategyId: string;
  strategyName: string;
  wallet: Address;
  prismWallet: Address;
  originalDeposit: number;
  currentValue: number;
  profit: number;
  runningAPY: number;
  healthFactor: number;
  createdAt: string;
  lastUpdated: string;
  flow: StrategyStep[];
  breakdown: StrategyBreakdown;
  status: 'active' | 'pending' | 'withdrawing' | 'closed';
}

export interface StrategyBreakdown {
  collateral: { token: string; amount: string; valueUsd: number }[];
  debt: { token: string; amount: string; valueUsd: number; interestRate: number }[];
  holdings: { token: string; amount: string; valueUsd: number; apy: number }[];
}

// ... (additional types truncated for brevity - see full file)
```

---

### 5. Tailwind Config (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // PRISM brand colors
        prism: {
          DEFAULT: 'hsl(var(--prism))',
          50: 'hsl(var(--prism-50))',
          100: 'hsl(var(--prism-100))',
          200: 'hsl(var(--prism-200))',
          300: 'hsl(var(--prism-300))',
          400: 'hsl(var(--prism-400))',
          500: 'hsl(var(--prism-500))',
          600: 'hsl(var(--prism-600))',
          700: 'hsl(var(--prism-700))',
          800: 'hsl(var(--prism-800))',
          900: 'hsl(var(--prism-900))',
        },
        // Semantic colors
        background: {
          DEFAULT: 'hsl(var(--background))',
          card: 'hsl(var(--background-card))',
        },
        foreground: 'hsl(var(--foreground))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          hover: 'hsl(var(--surface-hover))',
        },
        border: 'hsl(var(--border))',
        // Status colors
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'prism': 'linear-gradient(135deg, hsl(var(--prism)) 0%, hsl(280 100% 60%) 100%)',
        'prism-subtle': 'linear-gradient(135deg, hsl(var(--prism) / 0.1) 0%, hsl(280 100% 60% / 0.1) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

### 6. Global CSS Variables (`src/app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* PRISM brand gradient - vibrant purple/blue */
    --prism: 260 100% 60%;
    --prism-50: 260 100% 97%;
    --prism-100: 260 100% 94%;
    --prism-200: 260 100% 86%;
    --prism-300: 260 100% 76%;
    --prism-400: 260 100% 66%;
    --prism-500: 260 100% 60%;
    --prism-600: 260 100% 50%;
    --prism-700: 260 100% 40%;
    --prism-800: 260 100% 30%;
    --prism-900: 260 100% 20%;

    /* Dark theme (default) */
    --background: 222 47% 6%;
    --background-card: 222 47% 8%;
    --foreground: 210 40% 98%;
    --surface: 217 33% 12%;
    --surface-hover: 217 33% 16%;
    --border: 217 33% 18%;

    /* Status colors */
    --success: 142 76% 45%;
    --warning: 45 93% 47%;
    --error: 0 84% 60%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-background;
}

::-webkit-scrollbar-thumb {
  @apply bg-surface rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-surface-hover;
}
```

---

## Package Dependencies

```json
{
  "name": "prism-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.2.4",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "@tanstack/react-query": "^5.64.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "next": "15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "viem": "^2.22.8",
    "wagmi": "^2.14.6"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^8",
    "eslint-config-next": "15.1.3",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

---

## Current UI State Summary

### Pages Implemented:
1. **Landing** (`/`) - Hero, stats, features, strategy preview, CTA
2. **Dashboard** (`/dashboard`) - Portfolio summary, strategy positions, category cards
3. **Wallet** (`/wallet`) - Prism wallet management, deposit/withdraw
4. **Strategies** (`/strategies`) - Strategy listing with cards
5. **Strategy Detail** (`/strategies/[id]`) - Flow visualization, deposit form
6. **Simple Actions**:
   - Stake (`/simple/stake`) - ETH staking via Lido/cbETH
   - Lend (`/simple/lend`) - Supply/borrow via Aave/Compound
   - Stable (`/simple/stable`) - sDAI/sUSDe conversion

### Components Built:
- `Header` - Navigation with dropdown
- `Footer` - Links and branding
- `Button`, `Card`, `Input`, `Badge`, `Dialog`, `Skeleton`, `Slider`
- `StrategyCard`, `StrategyFlow`
- `ConfirmationModal`, `PendingModal`, `SuccessModal`, `CreateWalletModal`
- `PrismWalletCard`, `DepositWithdrawModal`

### Design System:
- Dark theme with purple/blue gradient accents
- CSS variables for colors
- Tailwind with custom config
- Framer Motion animations
- Radix UI primitives

---

## Known Issues / Placeholders

1. **Mock Data** - Stats, positions, and balances are hardcoded
2. **Contract Addresses** - All PRISM contracts are `0x000...` (TBD)
3. **No Real API Calls** - All data fetching returns static values
4. **Gas Estimates** - Hardcoded values (`~$5`, `~$0.02`)
5. **Token Logos** - Using text initials, not real logo images

---

## UI Redesign Plan (Next Steps)

After this Volume 1 snapshot, the following UI improvements are planned:

1. **APY Tooltips** - Hover to see APY breakdown
2. **Token Logos** - Real token images instead of initials
3. **How It Works Section** - 3-step visual guide on landing
4. **Protocol Logo Cloud** - Trust indicators on landing
5. **Better Empty States** - Illustrations + compelling CTAs
6. **Enhanced Transaction Modals** - Step-by-step progress

---

*End of Volume 1 Snapshot*
