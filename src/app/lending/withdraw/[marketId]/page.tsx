'use client';

/**
 * Lending Withdraw Page
 * Allows users to withdraw their supplied assets from lending protocols
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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

export default function WithdrawPage() {
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
  const { withdraw, state, reset } = useLendingActions();

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

      await withdraw(data.protocol as any, {
        marketId: data.marketId,
        asset: market.asset,
        amount: data.amount,
        maxWithdraw: data.isMax,
      });

      setTxHash(state.txHash || undefined);
      setShowPending(false);
      setShowSuccess(true);
    } catch (error) {
      setShowPending(false);
      console.error('Withdraw failed:', error);
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
            Connect your wallet to withdraw assets
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

  if (!position || position.supplyBalance === 0n) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Position Found</h2>
        <p className="text-gray-400 mb-6">
          You don't have any {market.assetSymbol} supplied in this market
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.push('/lending/positions')}>
            View Positions
          </Button>
          <Button onClick={() => router.push(`/lending/supply/${marketId}`)}>
            Supply {market.assetSymbol}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <PendingModal
        open={showPending}
        title="Withdrawing..."
        description={`Withdrawing ${market.assetSymbol} from ${market.protocol}...`}
        steps={[
          {
            label: `Withdraw ${market.assetSymbol}`,
            status: state.currentStep >= 1 ? 'completed' : 'in_progress',
          },
        ]}
      />

      <SuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        title="Withdrawal Successful!"
        description={`You have successfully withdrawn ${market.assetSymbol}`}
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
        <h1 className="text-3xl font-bold text-white mb-2">Withdraw Assets</h1>
        <p className="text-gray-400">
          Withdraw your supplied {market.assetSymbol} from {market.protocol}
        </p>
      </div>

      {/* Market Preview */}
      <MarketCard market={market} />

      {/* Position Summary */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/20">
        <h3 className="font-semibold text-white mb-4">Your Position</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Supplied Balance</p>
            <p className="text-lg font-bold text-white">
              {Number(position.supplyBalance) / Math.pow(10, market.assetDecimals)} {market.assetSymbol}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Current APY</p>
            <p className="text-lg font-bold text-green-400">
              {position.currentSupplyAPY?.toFixed(2) || market.supplyAPY.toFixed(2)}%
            </p>
          </div>
          {position.borrowBalance > 0n && (
            <>
              <div>
                <p className="text-sm text-gray-400">Borrow Balance</p>
                <p className="text-lg font-bold text-white">
                  {Number(position.borrowBalance) / Math.pow(10, market.assetDecimals)} {market.assetSymbol}
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
            </>
          )}
        </div>
      </Card>

      {/* Withdraw Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          How much would you like to withdraw?
        </h2>

        <LendingForm
          action="withdraw"
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
      <Card className="p-6 bg-yellow-500/10 border-yellow-500/20">
        <h3 className="font-semibold text-white mb-2">Important</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <span>
              Withdrawing will reduce your collateral and may affect your health factor
            </span>
          </li>
          {position.borrowBalance > 0n && (
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <span>
                You have an active borrow position. Ensure your health factor stays above 1.0 to avoid liquidation
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>
              Withdrawal is subject to available liquidity in the protocol
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
