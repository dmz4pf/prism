'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Link2,
  Coins,
  Plus,
  ArrowRight,
  Wallet,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  // Preview content - represents what UI to show
  previewTitle: string;
  previewSubtitle: string;
}

const features: Feature[] = [
  {
    id: 0,
    title: 'Smart Wallet',
    description: 'Batched transactions in one click.',
    icon: Shield,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    previewTitle: 'Portfolio',
    previewSubtitle: 'Your unified DeFi dashboard',
  },
  {
    id: 1,
    title: 'One-Click Strategies',
    description: 'One transaction, multiple protocols.',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    previewTitle: 'Strategies',
    previewSubtitle: 'Curated yield opportunities',
  },
  {
    id: 2,
    title: 'Unified Dashboard',
    description: 'All positions in one view.',
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    previewTitle: 'Dashboard',
    previewSubtitle: 'All positions at a glance',
  },
  {
    id: 3,
    title: 'Real-Time APYs',
    description: 'Live rates from top protocols.',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    previewTitle: 'Live Yields',
    previewSubtitle: 'Updated every block',
  },
  {
    id: 4,
    title: 'Cross-Protocol',
    description: 'Automatic protocol routing.',
    icon: Link2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    previewTitle: 'Protocol Flow',
    previewSubtitle: 'Automated rebalancing',
  },
  {
    id: 5,
    title: 'Gas Optimized',
    description: 'Transactions on Base cost less than $0.01.',
    icon: Coins,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    previewTitle: 'Low Cost',
    previewSubtitle: 'Built on Base L2',
  },
];

// Preview mockup data for each feature - typed individually for type safety
interface WalletPreview { balance: string; change: string; assets: string[] }
interface StrategiesPreview { strategies: string[]; apys: string[] }
interface DashboardPreview { positions: number; protocols: number; totalYield: string }
interface RatesPreview { rates: { name: string; apy: string }[] }
interface FlowPreview { from: string; to: string; via: string }
interface GasPreview { l1Cost: string; baseCost: string; savings: string }

const walletPreview: WalletPreview = { balance: '$168,698', change: '+$2,250', assets: ['ETH', 'USDC', 'stETH'] };
const strategiesPreview: StrategiesPreview = { strategies: ['ETH Staking', 'Stable Yield', 'Leveraged'], apys: ['4.2%', '8.1%', '12.5%'] };
const dashboardPreview: DashboardPreview = { positions: 4, protocols: 3, totalYield: '$1,240' };
const ratesPreview: RatesPreview = { rates: [{ name: 'Lido', apy: '3.4%' }, { name: 'Aave', apy: '4.2%' }, { name: 'Spark', apy: '5.8%' }] };
const flowPreview: FlowPreview = { from: 'USDC', to: 'sDAI', via: 'Spark' };
const gasPreview: GasPreview = { l1Cost: '$12.50', baseCost: '$0.002', savings: '99.9%' };

export function FeatureAccordion() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Boxed Section Container */}
        <div className="prism-section-box">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            className="text-center mb-10 md:mb-14"
          >
            <p className="text-sm text-secondary-500 font-medium uppercase tracking-wider mb-3">
              Platform Features
            </p>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Key features
            </h2>
            <p className="text-secondary-400 text-lg max-w-2xl mx-auto">
              Everything you need in one platform.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Left - Feature Accordion */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="space-y-3"
          >
            {features.map((feature, index) => {
              const isActive = activeFeature === index;
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => setActiveFeature(index)}
                    className={cn(
                      'w-full p-4 rounded-xl border transition-all duration-300 text-left',
                      isActive
                        ? 'border-secondary-600 bg-secondary-800/50'
                        : 'border-border hover:border-secondary-600 bg-transparent'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        feature.bgColor
                      )}>
                        <Icon className={cn('h-5 w-5', feature.color)} />
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg">
                          {feature.title}
                        </h3>

                        {/* Expandable Description */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                              className="text-secondary-400 text-sm mt-2 overflow-hidden"
                            >
                              {feature.description}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Plus/Minus Icon */}
                      <Plus
                        className={cn(
                          'h-5 w-5 text-secondary-400 flex-shrink-0 transition-transform duration-300',
                          isActive && 'rotate-45 text-blue-400'
                        )}
                      />
                    </div>
                  </button>
                </motion.div>
              );
            })}

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ delay: 0.3 }}
              className="pt-4"
            >
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right - Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-[4/3]">
              {/* Desktop Mockup Frame */}
              <div className="absolute inset-0 rounded-xl border border-border bg-background-card shadow-2xl overflow-hidden">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-surface text-xs text-secondary-500">
                      app.prism.fi
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="p-6"
                  >
                    <PreviewContent featureIndex={activeFeature} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Mobile Mockup Overlay */}
              <div className="absolute -bottom-4 -left-4 w-36 z-10">
                <div className="rounded-2xl border-4 border-secondary-800 bg-background-card shadow-2xl overflow-hidden">
                  {/* Phone Notch */}
                  <div className="h-6 bg-surface/50 flex items-center justify-center">
                    <div className="w-16 h-1 rounded-full bg-secondary-700" />
                  </div>

                  {/* Mobile Preview */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeature}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3"
                    >
                      <MobilePreviewContent featureIndex={activeFeature} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Desktop Preview Content Component
function PreviewContent({ featureIndex }: { featureIndex: number }) {
  const feature = features[featureIndex];
  if (!feature) return null;
  const Icon = feature.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', feature.bgColor)}>
          <Icon className={cn('h-4 w-4', feature.color)} />
        </div>
        <div>
          <h4 className="text-white font-semibold">{feature.previewTitle}</h4>
          <p className="text-xs text-secondary-500">{feature.previewSubtitle}</p>
        </div>
      </div>

      {/* Dynamic Content based on feature */}
      {featureIndex === 0 && (
        // Smart Wallet - Portfolio
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-surface/50 border border-border">
            <p className="text-sm text-secondary-400">Total Balance</p>
            <p className="text-3xl font-bold text-white font-mono">{walletPreview.balance}</p>
            <p className="text-sm text-green-400">{walletPreview.change} today</p>
          </div>
          <div className="flex gap-2">
            {walletPreview.assets.map((asset) => (
              <div key={asset} className="px-3 py-2 rounded-lg bg-surface/30 border border-border text-sm text-secondary-300">
                {asset}
              </div>
            ))}
          </div>
        </div>
      )}

      {featureIndex === 1 && (
        // One-Click Strategies
        <div className="space-y-2">
          {strategiesPreview.strategies.map((strategy, i) => (
            <div key={strategy} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border">
              <span className="text-white">{strategy}</span>
              <span className="text-green-400 font-mono">{strategiesPreview.apys[i]}</span>
            </div>
          ))}
        </div>
      )}

      {featureIndex === 2 && (
        // Unified Dashboard
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-surface/50 border border-border text-center">
            <p className="text-2xl font-bold text-white">{dashboardPreview.positions}</p>
            <p className="text-xs text-secondary-500">Positions</p>
          </div>
          <div className="p-3 rounded-lg bg-surface/50 border border-border text-center">
            <p className="text-2xl font-bold text-white">{dashboardPreview.protocols}</p>
            <p className="text-xs text-secondary-500">Protocols</p>
          </div>
          <div className="p-3 rounded-lg bg-surface/50 border border-border text-center">
            <p className="text-2xl font-bold text-green-400">{dashboardPreview.totalYield}</p>
            <p className="text-xs text-secondary-500">Yield</p>
          </div>
        </div>
      )}

      {featureIndex === 3 && (
        // Real-Time APYs
        <div className="space-y-2">
          {ratesPreview.rates.map((rate) => (
            <div key={rate.name} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                </div>
                <span className="text-white">{rate.name}</span>
              </div>
              <span className="text-green-400 font-mono">{rate.apy}</span>
            </div>
          ))}
        </div>
      )}

      {featureIndex === 4 && (
        // Cross-Protocol
        <div className="p-4 rounded-lg bg-surface/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <Wallet className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-white font-medium">{flowPreview.from}</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20">
                <Link2 className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400">{flowPreview.via}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-white font-medium">{flowPreview.to}</p>
            </div>
          </div>
        </div>
      )}

      {featureIndex === 5 && (
        // Gas Optimized
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-secondary-400">Ethereum L1</span>
            <span className="text-red-400 font-mono line-through">{gasPreview.l1Cost}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-secondary-400">Base L2</span>
            <span className="text-green-400 font-mono">{gasPreview.baseCost}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <span className="text-green-400 font-bold">{gasPreview.savings} savings</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile Preview Content Component
function MobilePreviewContent({ featureIndex }: { featureIndex: number }) {
  const feature = features[featureIndex];
  if (!feature) return null;
  const Icon = feature.icon;

  return (
    <div className="space-y-2">
      <div className={cn('w-6 h-6 rounded flex items-center justify-center', feature.bgColor)}>
        <Icon className={cn('h-3 w-3', feature.color)} />
      </div>
      <p className="text-xs font-medium text-white">{feature.previewTitle}</p>
      <div className="h-16 rounded bg-surface/50 border border-border flex items-center justify-center">
        <span className="text-[10px] text-secondary-500">Preview</span>
      </div>
    </div>
  );
}
