'use client';

/**
 * Lending Repay Page
 * Allows users to repay their borrowed assets to lending protocols
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLendingMarkets } from '@/hooks/lending/use-lending-markets';
import { useLendingPositions } from '@/hooks/lending/use-lending-positions';
import { useLendingActions } from '@/hooks/lending/use-lending-actions';
import { LendingForm } from '@/components/lending/lending-form';
import { MarketCard } from '@/components/lending/market-card';
import { PendingModal, SuccessModal } from '@/components/modals';
import { formatUSD } from '@/lib/utils';

export default function RepayPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const marketId = params.marketId as string;

  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();

  // Fetch market and position data
  const { markets, isLoading: marketsLoading } = useLendingMarkets();
  const { positions, isLoading: positionsLoading } = useLendingPositions();
  const market = markets.find((m) => m.id === marketId);
  const position = positions.find((p) => p.marketId === marketId);

  // Lending actions
  const { repay, state, reset } = useLendingActions();

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

      await repay(data.protocol as any, {
        marketId: data.marketId,
        asset: market.asset,
        amount: data.amount,
        maxRepay: data.isMax,
      });

      setTxHash(state.txHash || undefined);
      setShowPending(false);
      setShowSuccess(true);
    } catch (error) {
      setShowPending(false);
      console.error('Repay failed:', error);
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
            Connect your wallet to repay loans
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

  if (!position || position.borrowBalance === 0n) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Debt Found</h2>
        <p className="text-gray-400 mb-6">
          You don't have any {market.assetSymbol} borrowed from this market
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push('/lending/positions')}>
            View Positions
          </Button>
          <Button onClick={() => router.push(`/lending/borrow/${marketId}`)}>
            Borrow {market.assetSymbol}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate interest accrued (simplified display)
  const borrowBalanceDisplay = Number(position.borrowBalance) / Math.pow(10, market.assetDecimals);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <PendingModal
        open={showPending}
        title="Repaying..."
        description={`Repaying ${market.assetSymbol} to ${market.protocol}...`}
        steps={[
          {
            label: 'Approve token',
            status: state.currentStep >= 1 ? 'completed' : 'in_progress',
          },
          {
            label: `Repay ${market.assetSymbol}`,
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
        title="Repayment Successful!"
        description={`You have successfully repaid ${market.assetSymbol}`}
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
        <h1 className="text-3xl font-bold text-white mb-2">Repay Loan</h1>
        <p className="text-gray-400">
          Repay your borrowed {market.assetSymbol} to {market.protocol}
        </p>
      </div>

      {/* Market Preview */}
      <MarketCard market={market} />

      {/* Debt Summary */}
      <Card className="p-6 bg-red-500/10 border-red-500/20">
        <h3 className="font-semibold text-white mb-4">Your Debt</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Outstanding Debt</p>
            <p className="text-lg font-bold text-white">
              {borrowBalanceDisplay.toFixed(6)} {market.assetSymbol}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Borrow APY</p>
            <p className="text-lg font-bold text-red-400">
              {position.currentBorrowAPY?.toFixed(2) || market.borrowAPY.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Health Factor</p>
            {(() => {
              const hf = position.healthFactor ?? 0;
              return (
                <Badge
                  variant="outline"
                  className={
                    hf > 1.5
                      ? 'text-green-400 border-green-400'
                      : hf > 1.2
                      ? 'text-yellow-400 border-yellow-400'
                      : 'text-red-400 border-red-400'
                  }
                >
                  {hf > 0 ? hf.toFixed(2) : 'N/A'}
                </Badge>
              );
            })()}
          </div>
          {position.supplyBalance > 0n && (
            <div>
              <p className="text-sm text-gray-400">Collateral</p>
              <p className="text-lg font-bold text-white">
                {Number(position.supplyBalance) / Math.pow(10, market.assetDecimals)} {market.assetSymbol}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Health Factor Improvement Preview */}
      {(position.healthFactor ?? 0) > 0 && (position.healthFactor ?? 0) < 2.0 && (
        <Card className="p-6 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-green-400" />
            <div>
              <h3 className="font-semibold text-white">Improve Your Health Factor</h3>
              <p className="text-sm text-gray-400">
                Repaying your debt will increase your health factor and reduce liquidation risk
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Repay Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          How much would you like to repay?
        </h2>

        <LendingForm
          action="repay"
          assetSymbol={market.assetSymbol}
          assetAddress={market.asset}
          assetDecimals={market.assetDecimals}
          protocol={market.protocol}
          marketId={market.id}
          position={position}
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
              Your {market.assetSymbol} will be used to repay your debt on {market.protocol}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              Your health factor will increase, reducing liquidation risk
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              You'll stop accruing interest on the repaid amount immediately
            </span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <span>
              Use "Repay All" to fully close your debt position (recommended)
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
