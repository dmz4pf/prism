'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLendingMarkets } from '@/hooks/lending/use-lending-markets';
import { useLendingActions } from '@/hooks/lending/use-lending-actions';
import { LendingForm } from '@/components/lending/lending-form';
import { MarketCard } from '@/components/lending/market-card';
import { PendingModal, SuccessModal } from '@/components/modals';

export default function SupplyPage() {
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

  // Lending actions
  const { supply, state, reset } = useLendingActions();

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

      await supply(data.protocol as any, {
        marketId: data.marketId,
        asset: market.asset,
        amount: data.amount,
        enableAsCollateral: true,
      });

      setTxHash(state.txHash || undefined);
      setShowPending(false);
      setShowSuccess(true);
    } catch (error) {
      setShowPending(false);
      console.error('Supply failed:', error);
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
            Connect your wallet to supply assets
          </p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  if (marketsLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-400">Loading market data...</p>
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <PendingModal
        open={showPending}
        title="Supplying..."
        description={`Supplying ${market.assetSymbol} to ${market.protocol}...`}
        steps={[
          {
            label: 'Approve token',
            status: state.currentStep >= 1 ? 'completed' : 'in_progress',
          },
          {
            label: `Supply ${market.assetSymbol}`,
            status:
              state.currentStep >= 2
                ? 'completed'
                : state.currentStep === 1
                ? 'in_progress'
                : 'pending',
          },
        ]}
      />

      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="Supply Successful!"
        description={`You have successfully supplied ${market.assetSymbol}`}
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
        <h1 className="text-3xl font-bold text-white mb-2">Supply Assets</h1>
        <p className="text-gray-400">
          Supply {market.assetSymbol} to earn{' '}
          {market.supplyAPY.toFixed(2)}% APY
        </p>
      </div>

      {/* Market Preview */}
      <MarketCard market={market} />

      {/* Supply Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          How much would you like to supply?
        </h2>

        <LendingForm
          action="supply"
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

      {/* Info Card */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/20">
        <h3 className="font-semibold text-white mb-2">What happens next?</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              Your {market.assetSymbol} will be supplied to {market.protocol}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              You'll start earning {market.supplyAPY.toFixed(2)}% APY
              immediately
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              Your supplied assets can be used as collateral for borrowing
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>You can withdraw anytime (subject to available liquidity)</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
