'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Coins,
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Strategy {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  apy: string;
  tvl: string;
  riskLevel: 'low' | 'medium' | 'high';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  protocols: string[];
  features: string[];
  badge?: string;
}

const strategies: Strategy[] = [
  {
    id: 'eth-yield-maximizer',
    name: 'ETH Yield Maximizer',
    description: 'Stake ETH via Lido, use as collateral on Aave, borrow USDC, convert to sDAI for compounded yields.',
    longDescription: 'This strategy leverages multiple DeFi protocols to maximize your ETH yield. Your ETH is first staked through Lido to earn staking rewards, then used as collateral to borrow stablecoins which are deposited into yield-bearing vaults.',
    apy: '8.4%',
    tvl: '$4.2M',
    riskLevel: 'medium',
    icon: TrendingUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    protocols: ['Lido', 'Aave', 'Spark'],
    features: ['Auto-compound', 'Gas optimized', 'One-click entry'],
    badge: "This Week's Pick",
  },
  {
    id: 'stable-yield-plus',
    name: 'Stable Yield Plus',
    description: 'Convert USDC to sDAI, use as collateral on Aave, loop for enhanced stable yields up to 6.8% APY.',
    longDescription: 'A low-risk strategy focused on stablecoin yields. Convert your USDC to sDAI earning base yield, then use it as collateral to borrow and loop for amplified returns while maintaining low liquidation risk.',
    apy: '6.8%',
    tvl: '$8.1M',
    riskLevel: 'low',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    protocols: ['Spark', 'Aave'],
    features: ['Low risk', 'Stable returns', 'Auto-rebalance'],
    badge: 'Most Popular',
  },
  {
    id: 'leveraged-staking',
    name: 'Leveraged Staking',
    description: 'Amplify ETH staking rewards with recursive leverage through Morpho for up to 12% APY.',
    longDescription: 'For users seeking higher yields with increased risk tolerance. This strategy uses recursive borrowing through Morpho Blue to amplify your stETH position, multiplying your staking rewards.',
    apy: '12.5%',
    tvl: '$2.8M',
    riskLevel: 'high',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    protocols: ['Lido', 'Morpho'],
    features: ['High APY', '3x leverage', 'Auto-deleverage'],
    badge: 'High Yield',
  },
  {
    id: 'delta-neutral',
    name: 'Delta Neutral',
    description: 'Earn yield on ETH without price exposure using Ethena sUSDe and hedged positions.',
    longDescription: 'Perfect for those who want ETH yield without the volatility. This strategy maintains a delta-neutral position using Ethena synthetic dollars, earning funding rates while being protected from price movements.',
    apy: '15.2%',
    tvl: '$1.5M',
    riskLevel: 'medium',
    icon: Layers,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    protocols: ['Ethena', 'Aave'],
    features: ['Market neutral', 'Funding yield', 'Hedged'],
    badge: 'New',
  },
  {
    id: 'liquidity-mining',
    name: 'LP Optimizer',
    description: 'Provide liquidity to top DEX pools with auto-compounding rewards and IL protection.',
    longDescription: 'Automatically allocate your funds to the highest-yielding liquidity pools across DEXs. Smart rebalancing minimizes impermanent loss while maximizing LP rewards and trading fees.',
    apy: '18.3%',
    tvl: '$3.2M',
    riskLevel: 'high',
    icon: BarChart3,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    protocols: ['Uniswap', 'Curve', 'Balancer'],
    features: ['Auto-compound', 'IL mitigation', 'Multi-pool'],
  },
];

// Visual mockup component for each strategy
function StrategyVisual({ strategy, isActive }: { strategy: Strategy; isActive: boolean }) {
  const Icon = strategy.icon;

  return (
    <div className="relative h-full flex items-center justify-center">
      {/* Background glow */}
      <div
        className={cn(
          'absolute inset-0 opacity-20 blur-3xl transition-opacity duration-500',
          isActive ? 'opacity-30' : 'opacity-10'
        )}
        style={{
          background: `radial-gradient(circle at center, ${
            strategy.riskLevel === 'low' ? 'rgb(59, 130, 246)' :
            strategy.riskLevel === 'medium' ? 'rgb(124, 58, 237)' :
            'rgb(234, 179, 8)'
          } 0%, transparent 70%)`
        }}
      />

      {/* Mockup card stack */}
      <div className="relative w-full max-w-sm">
        {/* Background cards */}
        <motion.div
          className="absolute -top-2 left-4 right-4 h-48 rounded-2xl bg-surface/30 border border-border"
          animate={{ y: isActive ? -4 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute -top-1 left-2 right-2 h-48 rounded-2xl bg-surface/50 border border-border"
          animate={{ y: isActive ? -2 : 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        />

        {/* Main card */}
        <motion.div
          className="relative rounded-2xl bg-background-card border border-border p-6 shadow-2xl"
          animate={{ y: isActive ? 0 : 4 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', strategy.bgColor)}>
              <Icon className={cn('h-6 w-6', strategy.color)} />
            </div>
            <div>
              <h4 className="font-semibold text-white">{strategy.name}</h4>
              <p className="text-xs text-secondary-500">via {strategy.protocols.join(' + ')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-surface/50 border border-border">
              <p className="text-xs text-secondary-500 mb-1">Current APY</p>
              <p className="text-xl font-bold text-green-400 font-mono">{strategy.apy}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface/50 border border-border">
              <p className="text-xs text-secondary-500 mb-1">Total TVL</p>
              <p className="text-xl font-bold text-white font-mono">{strategy.tvl}</p>
            </div>
          </div>

          {/* Protocol logos placeholder */}
          <div className="flex items-center gap-2">
            {strategy.protocols.map((protocol, i) => (
              <div
                key={protocol}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center"
              >
                <span className="text-xs font-bold text-secondary-400">{protocol[0]}</span>
              </div>
            ))}
            <span className="text-xs text-secondary-500 ml-2">Integrated protocols</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function StrategyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const goToNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % strategies.length);
  }, []);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + strategies.length) % strategies.length);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(goToNext, 5000); // 5 seconds per slide
    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  const activeStrategy = strategies[activeIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <section className="pt-32 md:pt-40 lg:pt-48 pb-16 md:pb-20 lg:pb-24">
      <div className="container mx-auto px-4">
        <div className="prism-section-box">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-2">
                Yield Opportunities
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">
                Featured Strategies
              </h2>
              <p className="text-secondary-400">Curated DeFi strategies with optimized yields</p>
            </div>
            <Link href="/strategies">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Carousel Container */}
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[400px]">
              {/* Left - Strategy Info */}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="space-y-6"
                  >
                    {/* Badge */}
                    {activeStrategy.badge && (
                      <span className="inline-block px-3 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded-full">
                        {activeStrategy.badge}
                      </span>
                    )}

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-heading text-2xl md:text-3xl font-bold text-white mb-3">
                        {activeStrategy.name}
                      </h3>
                      <p className="text-secondary-400 text-lg leading-relaxed">
                        {activeStrategy.longDescription}
                      </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-sm text-secondary-500 mb-1">APY</p>
                        <p className="text-3xl font-bold text-green-400 font-mono">{activeStrategy.apy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 mb-1">TVL</p>
                        <p className="text-3xl font-bold text-white font-mono">{activeStrategy.tvl}</p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 mb-1">Risk</p>
                        <p className={cn(
                          'text-xl font-semibold capitalize',
                          activeStrategy.riskLevel === 'low' ? 'text-green-400' :
                          activeStrategy.riskLevel === 'medium' ? 'text-yellow-400' :
                          'text-red-400'
                        )}>
                          {activeStrategy.riskLevel}
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {activeStrategy.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1.5 text-sm bg-surface/50 border border-border rounded-lg text-gray-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link href={`/strategies/${activeStrategy.id}`}>
                      <Button size="lg" className="mt-2">
                        Enter Strategy
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right - Visual */}
              <div className="hidden lg:block relative h-[350px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    <StrategyVisual strategy={activeStrategy} isActive={true} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-surface/80 border border-border flex items-center justify-center text-secondary-400 hover:text-white hover:border-slate-600 transition-all hidden lg:flex"
              aria-label="Previous strategy"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-surface/80 border border-border flex items-center justify-center text-secondary-400 hover:text-white hover:border-slate-600 transition-all hidden lg:flex"
              aria-label="Next strategy"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {strategies.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'transition-all duration-300',
                  index === activeIndex
                    ? 'w-8 h-2 bg-primary rounded-full'
                    : 'w-2 h-2 bg-gray-600 rounded-full hover:bg-gray-500'
                )}
                aria-label={`Go to strategy ${index + 1}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-0.5 bg-surface rounded-full overflow-hidden max-w-md mx-auto">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: isPaused ? `${((activeIndex + 1) / strategies.length) * 100}%` : '100%' }}
              transition={{ duration: isPaused ? 0 : 5, ease: 'linear' }}
              key={activeIndex}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
