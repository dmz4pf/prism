'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Shield,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLendingMarkets } from '@/hooks/lending/use-lending-markets';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { useLendingActions } from '@/hooks/lending/use-lending-actions';
import { LendingForm } from '@/components/lending/lending-form';
import { MarketCard } from '@/components/lending/market-card';
import { HealthFactorBadge } from '@/components/lending/health-factor-display';
import { PendingModal, SuccessModal } from '@/components/modals';

export default function BorrowPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const marketId = params.marketId as string;

  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();

  // Fetch market data
  const { markets, isLoading: marketsLoading } = useLendingMarkets();
  const market = markets.find((m) => m.id === marketId);

  // Fetch user positions to check collateral
  const { stats: aggregated, isLoading: positionsLoading } = useLendingPositions({
    enabled: isConnected,
  });

  // Lending actions
  const { borrow, state, reset } = useLendingActions();

  const hasCollateral = aggregated.totalSupplyUSD > 0;

  // Handle form submission
  const handleSubmit = async (data: {
    protocol: string;
    marketId: string;
    amount: bigint;
    isMax: boolean;
  }) => {
    if (!market || !address) return;

    try {
      setShowPending(true);

      await borrow(data.protocol as any, {
        marketId: data.marketId,
        asset: market.asset,
        amount: data.amount,
      });

      setTxHash(state.txHash || undefined);
      setShowPending(false);
      setShowSuccess(true);
    } catch (error) {
      setShowPending(false);
      console.error('Borrow failed:', error);
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    setShowSuccess(false);
    reset();
    router.push('/lending/positions');
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to borrow assets
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (marketsLoading || positionsLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Market Not Found</h2>
        <p className="text-gray-400 mb-6">
          The market you're looking for doesn't exist
        </p>
        <Button onClick={() => router.push('/lending/markets')}>
          Browse Markets
        </Button>
      </div>
    );
  }

  // Check if user has collateral
  if (!hasCollateral) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-8 text-center border-orange-500/20 bg-orange-500/5">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            No Collateral Found
          </h2>
          <p className="text-gray-400 mb-6">
            You need to supply collateral before you can borrow. Supply assets
            to any lending protocol to use as collateral.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/lending/markets')}>
              Supply Collateral
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/lending/positions')}
            >
              View Positions
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <PendingModal
        open={showPending}
        title="Borrowing..."
        description={`Borrowing ${market.assetSymbol} from ${market.protocol}...`}
        steps={[
          {
            label: `Borrow ${market.assetSymbol}`,
            status: state.currentStep >= 1 ? 'completed' : 'in_progress',
          },
        ]}
      />

      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="Borrow Successful!"
        description={`You have successfully borrowed ${market.assetSymbol}`}
        txHash={txHash}
        amount={state.calls[0]?.description || ''}
        token={market.assetSymbol}
      />

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Borrow Assets</h1>
        <p className="text-gray-400">
          Borrow {market.assetSymbol} at {market.borrowAPY.toFixed(2)}% APY
        </p>
      </div>

      {/* Collateral Status */}
      <Card className="p-6 bg-green-500/10 border-green-500/20">
        <div className="flex items-center gap-3">
          <Shield className="h-10 w-10 text-green-400" />
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              Collateral Available
            </h3>
            <p className="text-sm text-gray-400">
              You have ${aggregated.totalSupplyUSD.toFixed(2)} in collateral
            </p>
          </div>
          {aggregated.lowestHealthFactor < Infinity && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Health Factor</p>
              <HealthFactorBadge
                healthFactor={aggregated.lowestHealthFactor}
                size="sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Market Preview */}
      <MarketCard market={market} />

      {/* Borrow Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          How much would you like to borrow?
        </h2>

        <LendingForm
          action="borrow"
          assetSymbol={market.assetSymbol}
          assetAddress={market.asset}
          assetDecimals={market.assetDecimals}
          protocol={market.protocol}
          marketId={market.id}
          onSubmit={handleSubmit}
          isSubmitting={state.isPending}
          onCancel={() => router.back()}
        />
      </Card>

      {/* Warning Card */}
      <Card className="p-6 bg-yellow-500/10 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-200 mb-2">
              Important: Liquidation Risk
            </h3>
            <ul className="space-y-1 text-sm text-yellow-200/80">
              <li>
                • Your position can be liquidated if your health factor drops
                below 1.0
              </li>
              <li>
                • Monitor your health factor regularly, especially during
                volatile markets
              </li>
              <li>
                • You'll pay {market.borrowAPY.toFixed(2)}% APY on your borrowed
                amount
              </li>
              <li>
                • Liquidation threshold for this market:{' '}
                {(market.liquidationThreshold * 100).toFixed(1)}%
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
