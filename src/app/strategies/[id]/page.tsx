'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  TrendingUp,
  Shield,
  Info,
  Loader2,
  CheckCircle2,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StrategyFlow } from '@/components/strategies';
import { useStrategies, usePrismWallet } from '@/hooks/wallet';
import { ConfirmationModal, PendingModal, SuccessModal, TransactionStep } from '@/components/modals';
import type { RiskLevel } from '@/types';
import { cn, formatUSD } from '@/lib/utils';

type ActionTab = 'deposit' | 'withdraw' | 'details';

const RISK_STYLES: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function StrategyDetailPage() {
  const params = useParams();
  const strategyId = params.id as string;
  const { getStrategy, enterStrategy, getPositionForStrategy, isPending } = useStrategies();
  const { hasWallet, prismWalletAddress } = usePrismWallet();

  // State
  const [activeTab, setActiveTab] = useState<ActionTab>('deposit');
  const [amount, setAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [pendingSteps, setPendingSteps] = useState<TransactionStep[]>([]);
  const [currentAction, setCurrentAction] = useState<'deposit' | 'withdraw'>('deposit');

  const strategy = getStrategy(strategyId);
  const existingPosition = getPositionForStrategy(strategyId);

  if (!strategy) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/strategies"
          className="inline-flex items-center gap-2 text-secondary-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Strategies
        </Link>
        <div className="text-center py-12">
          <p className="text-secondary-400">Strategy not found.</p>
        </div>
      </div>
    );
  }

  const riskStyle = RISK_STYLES[strategy.riskLevel];

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setCurrentAction('deposit');
    setShowConfirmation(true);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !existingPosition) return;
    setCurrentAction('withdraw');
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setShowPending(true);

    const actionAmount = currentAction === 'deposit' ? amount : withdrawAmount;
    const steps: TransactionStep[] = currentAction === 'deposit'
      ? [
          { label: 'Approve tokens', status: 'in_progress' },
          { label: `Deposit ${actionAmount} ${strategy.inputToken}`, status: 'pending' },
          { label: 'Execute strategy', status: 'pending' },
        ]
      : [
          { label: 'Initiate withdrawal', status: 'in_progress' },
          { label: 'Unwind positions', status: 'pending' },
          { label: `Receive ${actionAmount} ${strategy.inputToken}`, status: 'pending' },
        ];

    setPendingSteps(steps);

    // Simulate transaction steps
    await new Promise((r) => setTimeout(r, 2000));
    setPendingSteps((prev) => [
      { ...prev[0], status: 'completed' },
      { ...prev[1], status: 'in_progress' },
      prev[2],
    ]);

    await new Promise((r) => setTimeout(r, 3000));
    setPendingSteps((prev) => [
      prev[0],
      { ...prev[1], status: 'completed', txHash: '0x1234...abcd' },
      { ...prev[2], status: 'in_progress' },
    ]);

    await new Promise((r) => setTimeout(r, 1500));
    setPendingSteps((prev) => [
      prev[0],
      prev[1],
      { ...prev[2], status: 'completed' },
    ]);

    setTxHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    setShowPending(false);
    setShowSuccess(true);
  };

  const estimatedYearlyEarnings =
    amount && parseFloat(amount) > 0
      ? (parseFloat(amount) * (strategy.currentAPY / 100)).toFixed(4)
      : '0';

  const actionAmount = currentAction === 'deposit' ? amount : withdrawAmount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Modals */}
      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirm}
        title={currentAction === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
        description={
          currentAction === 'deposit'
            ? `Deposit ${amount} ${strategy.inputToken} into ${strategy.name}`
            : `Withdraw ${withdrawAmount} ${strategy.inputToken} from ${strategy.name}`
        }
        steps={
          currentAction === 'deposit'
            ? [
                { label: 'Approve tokens', description: 'Sign approval transaction' },
                { label: 'Deposit funds', description: `Deposit ${amount} ${strategy.inputToken}` },
                { label: 'Execute strategy', description: 'Deploy across protocols' },
              ]
            : [
                { label: 'Initiate withdrawal', description: 'Sign withdrawal request' },
                { label: 'Unwind positions', description: 'Exit protocol positions' },
                { label: 'Receive funds', description: `Receive ${withdrawAmount} ${strategy.inputToken}` },
              ]
        }
        gasEstimate="$5.00"
        totalValue={parseFloat(actionAmount || '0')}
        warning={strategy.riskLevel === 'high' ? 'This is a high-risk strategy with potential for significant losses.' : undefined}
      />

      <PendingModal
        open={showPending}
        title={currentAction === 'deposit' ? 'Depositing...' : 'Withdrawing...'}
        description={
          currentAction === 'deposit'
            ? `Depositing ${amount} ${strategy.inputToken} into strategy...`
            : `Withdrawing ${withdrawAmount} ${strategy.inputToken} from strategy...`
        }
        steps={pendingSteps}
      />

      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setAmount('');
          setWithdrawAmount('');
        }}
        title={currentAction === 'deposit' ? 'Deposit Complete!' : 'Withdrawal Complete!'}
        description={
          currentAction === 'deposit'
            ? `You have successfully deposited into ${strategy.name}`
            : `You have successfully withdrawn from ${strategy.name}`
        }
        txHash={txHash}
        amount={actionAmount}
        token={strategy.inputToken}
      />

      {/* Back Link */}
      <Link
        href="/strategies"
        className="inline-flex items-center gap-2 text-secondary-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Strategies
      </Link>

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Strategy Execution Coming Soon</h3>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                Testnet Preview
              </Badge>
            </div>
            <p className="text-sm text-secondary-400">
              Multi-protocol strategies will be available on mainnet. Currently showing preview data and simulated transactions.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{strategy.name}</h1>
            <p className="text-secondary-400 mt-2 max-w-2xl">{strategy.description}</p>
          </div>
          <Badge className={`${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
            {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-secondary-800/50 border-secondary-700">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-400">
                {strategy.currentAPY.toFixed(1)}%
              </p>
              <p className="text-xs text-secondary-400">Current APY</p>
            </CardContent>
          </Card>

          <Card className="bg-secondary-800/50 border-secondary-700">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">
                {strategy.timeHorizon === 'long'
                  ? '6+ mo'
                  : strategy.timeHorizon === 'medium'
                  ? '1-6 mo'
                  : 'Short'}
              </p>
              <p className="text-xs text-secondary-400">Time Horizon</p>
            </CardContent>
          </Card>

          <Card className="bg-secondary-800/50 border-secondary-700">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 text-blue-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{strategy.flow.length}</p>
              <p className="text-xs text-secondary-400">Steps</p>
            </CardContent>
          </Card>

          <Card className="bg-secondary-800/50 border-secondary-700">
            <CardContent className="p-4 text-center">
              <div className="w-5 h-5 rounded-full bg-secondary-700 mx-auto mb-2 flex items-center justify-center text-xs font-bold">
                {strategy.inputToken.slice(0, 2)}
              </div>
              <p className="text-lg font-bold text-white">{strategy.inputToken}</p>
              <p className="text-xs text-secondary-400">Input Token</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Strategy Flow - Takes 3 columns */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <Card className="bg-secondary-800 border-secondary-700">
            <CardHeader>
              <CardTitle className="text-white">Strategy Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyFlow steps={strategy.flow} size="lg" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Panel - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4"
        >
          <Card className="bg-secondary-800 border-secondary-700">
            {/* Tabs */}
            <div className="flex border-b border-secondary-700">
              {[
                { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine },
                { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
                { id: 'details', label: 'Details', icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as ActionTab)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-secondary-400 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Deposit Tab */}
              {activeTab === 'deposit' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-secondary-400">Amount</label>
                      <span className="text-xs text-secondary-500">
                        Min: {strategy.minDeposit} {strategy.inputToken}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-secondary-900 border-secondary-600 text-white text-lg pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                        {strategy.inputToken}
                      </span>
                    </div>
                  </div>

                  {amount && parseFloat(amount) > 0 && (
                    <div className="p-3 bg-secondary-900 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary-400">Expected APY</span>
                        <span className="text-green-400 font-medium">
                          {strategy.currentAPY.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary-400">Est. Yearly Earnings</span>
                        <span className="text-white">
                          ~{estimatedYearlyEarnings} {strategy.inputToken}
                        </span>
                      </div>
                    </div>
                  )}

                  {strategy.riskLevel === 'high' && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-secondary-300">
                        High-risk strategy. Only invest what you can afford to lose.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleDeposit}
                    disabled={
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      parseFloat(amount) < strategy.minDeposit ||
                      isEntering ||
                      isPending ||
                      !hasWallet
                    }
                    className="w-full"
                  >
                    {!hasWallet ? (
                      'Create Prism Wallet First'
                    ) : (
                      <>
                        Deposit {amount || '0'} {strategy.inputToken}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {!hasWallet && (
                    <Link href="/wallet">
                      <Button variant="outline" className="w-full border-secondary-600">
                        Create Prism Wallet
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {/* Withdraw Tab */}
              {activeTab === 'withdraw' && (
                <>
                  {existingPosition ? (
                    <>
                      <div className="p-3 bg-secondary-900 rounded-lg space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary-400">Position Value</span>
                          <span className="text-white font-medium">
                            {formatUSD(existingPosition.currentValue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary-400">Profit</span>
                          <span className="text-green-400 font-medium">
                            +{formatUSD(existingPosition.profit)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-secondary-400">Withdraw Amount</label>
                          <button
                            className="text-xs text-blue-400 hover:underline"
                            onClick={() => setWithdrawAmount(existingPosition.currentValue.toString())}
                          >
                            MAX
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            value={withdrawAmount}
                            onChange={e => setWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-secondary-900 border-secondary-600 text-white text-lg pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                            {strategy.inputToken}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-secondary-300">
                          Withdrawals may take 1-3 blocks to process. A 0.1% exit fee applies.
                        </p>
                      </div>

                      <Button
                        onClick={handleWithdraw}
                        disabled={
                          !withdrawAmount ||
                          parseFloat(withdrawAmount) <= 0 ||
                          parseFloat(withdrawAmount) > existingPosition.currentValue ||
                          isEntering ||
                          isPending
                        }
                        variant="outline"
                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        Withdraw {withdrawAmount || '0'} {strategy.inputToken}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Wallet className="h-12 w-12 text-secondary-600 mx-auto mb-3" />
                      <p className="text-secondary-400 mb-2">No Active Position</p>
                      <p className="text-sm text-secondary-500 mb-4">
                        Deposit funds first to create a position
                      </p>
                      <Button onClick={() => setActiveTab('deposit')} variant="outline">
                        Go to Deposit
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Position Details Tab */}
              {activeTab === 'details' && (
                <>
                  {existingPosition ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-secondary-900 rounded-lg">
                          <p className="text-xs text-secondary-400 mb-1">Original Deposit</p>
                          <p className="text-lg font-bold text-white">
                            {formatUSD(existingPosition.originalDeposit)}
                          </p>
                        </div>
                        <div className="p-3 bg-secondary-900 rounded-lg">
                          <p className="text-xs text-secondary-400 mb-1">Current Value</p>
                          <p className="text-lg font-bold text-green-400">
                            {formatUSD(existingPosition.currentValue)}
                          </p>
                        </div>
                        <div className="p-3 bg-secondary-900 rounded-lg">
                          <p className="text-xs text-secondary-400 mb-1">Total Profit</p>
                          <p className="text-lg font-bold text-green-400">
                            +{formatUSD(existingPosition.profit)}
                          </p>
                        </div>
                        <div className="p-3 bg-secondary-900 rounded-lg">
                          <p className="text-xs text-secondary-400 mb-1">Running APY</p>
                          <p className="text-lg font-bold text-green-400">
                            {existingPosition.runningAPY.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-secondary-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-secondary-400">Health Factor</p>
                          <p className={cn(
                            'font-bold',
                            existingPosition.healthFactor > 1.5 ? 'text-green-400' :
                            existingPosition.healthFactor > 1.2 ? 'text-yellow-400' : 'text-red-400'
                          )}>
                            {existingPosition.healthFactor.toFixed(2)}
                          </p>
                        </div>
                        <div className="h-2 bg-secondary-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              existingPosition.healthFactor > 1.5 ? 'bg-green-500' :
                              existingPosition.healthFactor > 1.2 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(existingPosition.healthFactor * 50, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-secondary-500">
                        <p>Position opened: {new Date(existingPosition.createdAt).toLocaleDateString()}</p>
                        <p>Last updated: {new Date(existingPosition.lastUpdated).toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-secondary-600 mx-auto mb-3" />
                      <p className="text-secondary-400 mb-2">No Position Data</p>
                      <p className="text-sm text-secondary-500 mb-4">
                        Deposit funds to start tracking your position
                      </p>
                      <Button onClick={() => setActiveTab('deposit')} variant="outline">
                        Go to Deposit
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Fee Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-secondary-400">
              Entry: 0.1% fee | Exit: 0.1% fee | Performance: 10% of profit
            </p>
          </div>

          {/* Risk Factors */}
          <Card className="bg-secondary-800 border-secondary-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strategy.riskFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-secondary-400">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
