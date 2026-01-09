'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, Shield, Zap, Sparkles, ArrowRight, Flame, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StrategyCard } from '@/components/strategies';
import { useStrategies } from '@/hooks/wallet';
import type { RiskLevel } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'by-risk' | 'by-protocol' | 'trending';
type FilterRisk = RiskLevel | 'all';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function StrategiesPage() {
  const { strategies, featuredStrategy, isLoading } = useStrategies();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [riskFilter, setRiskFilter] = useState<FilterRisk>('all');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');

  // Get unique protocols from strategy flows
  const protocols = Array.from(new Set(strategies.flatMap(s => s.flow.map(step => step.protocol))));

  const filteredStrategies = strategies.filter(s => {
    if (activeTab === 'trending') {
      // Show strategies with highest APY or most TVL
      return s.currentAPY >= 8;
    }
    if (activeTab === 'by-risk' && riskFilter !== 'all') {
      return s.riskLevel === riskFilter;
    }
    if (activeTab === 'by-protocol' && protocolFilter !== 'all') {
      return s.flow.some(step => step.protocol === protocolFilter);
    }
    return true;
  }).sort((a, b) => activeTab === 'trending' ? b.currentAPY - a.currentAPY : 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="prism-section-header"
      >
        <p className="prism-section-label">Yield Opportunities</p>
        <div className="flex items-center justify-center gap-3">
          <h1 className="prism-section-title text-3xl md:text-4xl">Strategy Vaults</h1>
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 mt-1">
            Preview
          </Badge>
        </div>
        <p className="prism-section-subtitle">
          Multi-protocol strategies. One click to deploy.
        </p>
        <p className="text-sm text-yellow-400/70 mt-2">
          Strategy execution will be available on mainnet. Currently showing preview data.
        </p>
      </motion.div>

      {/* AI Recommendations Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-6 bg-secondary-800/50 rounded-xl border border-secondary-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg mb-1">
                  Top Pick This Week
                </h3>
                <p className="text-secondary-400 text-sm mb-3">
                  ETH staking + lending is performing well.
                </p>
                {featuredStrategy && (
                  <Link href={`/strategies/${featuredStrategy.id}`}>
                    <Button size="sm" className="gap-2">
                      View Strategy
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Featured
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="prism-feature-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-secondary-400">Highest APY</p>
            <p className="text-xl font-bold text-white">
              {strategies.length > 0 ? Math.max(...strategies.map(s => s.currentAPY)).toFixed(1) : '0'}%
            </p>
          </div>
        </div>

        <div className="prism-feature-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-secondary-400">Low Risk Options</p>
            <p className="text-xl font-bold text-white">
              {strategies.filter(s => s.riskLevel === 'low').length}
            </p>
          </div>
        </div>

        <div className="prism-feature-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-secondary-400">Total Strategies</p>
            <p className="text-xl font-bold text-white">{strategies.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {/* Main Tabs */}
        <div className="flex gap-2 p-1 bg-surface/50 border border-border rounded-lg w-fit">
          {[
            { id: 'all', label: 'All', icon: Zap },
            { id: 'by-risk', label: 'By Risk', icon: Shield },
            { id: 'by-protocol', label: 'By Protocol', icon: Building2 },
            { id: 'trending', label: 'Trending', icon: Flame },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as FilterTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-primary text-white'
                  : 'text-secondary-400 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Sub-filters based on active tab */}
        {activeTab === 'by-risk' && (
          <div className="flex items-center gap-2 pl-2">
            <span className="text-xs text-secondary-500">Risk Level:</span>
            {(['all', 'low', 'medium', 'high'] as FilterRisk[]).map(risk => (
              <Button
                key={risk}
                variant={riskFilter === risk ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRiskFilter(risk)}
                className={cn(
                  riskFilter === risk
                    ? risk === 'low' ? 'bg-green-600' : risk === 'medium' ? 'bg-yellow-600' : risk === 'high' ? 'bg-red-600' : 'bg-primary'
                    : 'border-border text-secondary-300 hover:bg-surface'
                )}
              >
                {risk === 'all' ? 'All' : risk.charAt(0).toUpperCase() + risk.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {activeTab === 'by-protocol' && (
          <div className="flex items-center gap-2 pl-2 flex-wrap">
            <span className="text-xs text-secondary-500">Protocol:</span>
            <Button
              variant={protocolFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProtocolFilter('all')}
              className={cn(
                protocolFilter === 'all'
                  ? 'bg-primary'
                  : 'border-border text-secondary-300 hover:bg-surface'
              )}
            >
              All
            </Button>
            {protocols.map(protocol => (
              <Button
                key={protocol}
                variant={protocolFilter === protocol ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProtocolFilter(protocol)}
                className={cn(
                  protocolFilter === protocol
                    ? 'bg-primary'
                    : 'border-border text-secondary-300 hover:bg-surface'
                )}
              >
                {protocol}
              </Button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Strategy Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {isLoading ? (
          // Loading skeletons
          [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="prism-feature-card animate-pulse"
            >
              <div className="space-y-4">
                <div className="h-6 bg-surface rounded w-3/4" />
                <div className="h-4 bg-surface rounded w-full" />
                <div className="h-10 bg-surface rounded w-1/2" />
                <div className="h-8 bg-surface rounded" />
              </div>
            </motion.div>
          ))
        ) : filteredStrategies.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-secondary-400">No strategies match your filters.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setActiveTab('all');
                setRiskFilter('all');
                setProtocolFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          filteredStrategies.map(strategy => (
            <motion.div key={strategy.id} variants={itemVariants}>
              <StrategyCard strategy={strategy} />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ delay: 0.5 }}
      >
        <div className="prism-section-box-subtle border-dashed text-center">
          <Badge variant="outline" className="border-secondary-500 text-secondary-400 mb-3">
            Coming Soon
          </Badge>
          <h3 className="text-lg font-semibold text-white mb-2 font-heading">
            Custom Strategy Builder
          </h3>
          <p className="text-sm text-secondary-400 max-w-md mx-auto">
            Build your own multi-protocol strategies with a drag-and-drop interface.
            Combine any protocols in any order.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
