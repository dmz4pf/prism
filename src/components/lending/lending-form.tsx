'use client';

/**
 * LendingForm Component
 *
 * Form for supply, withdraw, borrow, and repay actions.
 */

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Address, parseUnits, formatUnits } from 'viem';
import { LendingProtocol, LendingMarket, LendingPosition } from '@/types/lending';
import { useRoutingSuggestion, RoutingOption } from '@/hooks/lending';
import { formatNumber, formatPercent } from '@/lib/utils';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProtocolSelector } from './protocol-selector';
import { HealthFactorCard } from './health-factor-display';
import { useSimulateHealthFactor } from '@/hooks/lending/use-health-factor';

// =============================================================================
// TYPES
// =============================================================================

export type LendingFormAction = 'supply' | 'withdraw' | 'borrow' | 'repay';

export interface LendingFormProps {
  /** Form action */
  action: LendingFormAction;
  /** Asset symbol */
  assetSymbol: string;
  /** Asset address */
  assetAddress: Address;
  /** Asset decimals */
  assetDecimals: number;
  /** Pre-selected protocol */
  protocol?: LendingProtocol;
  /** Pre-selected market */
  marketId?: string;
  /** User's existing position (for withdraw/repay) */
  position?: LendingPosition;
  /** On submit */
  onSubmit: (data: {
    protocol: LendingProtocol;
    marketId: string;
    amount: bigint;
    isMax: boolean;
  }) => void;
  /** Loading state */
  isSubmitting?: boolean;
  /** Cancel action */
  onCancel?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LendingForm({
  action,
  assetSymbol,
  assetAddress,
  assetDecimals,
  protocol: initialProtocol,
  marketId: initialMarketId,
  position,
  onSubmit,
  isSubmitting = false,
  onCancel,
}: LendingFormProps) {
  const { address: userAddress } = useAccount();

  // Form state
  const [amountInput, setAmountInput] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<LendingProtocol | null>(
    initialProtocol || null
  );
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    initialMarketId || null
  );

  // Get routing suggestions for supply/borrow
  const showRouting = action === 'supply' || action === 'borrow';
  const {
    allOptions,
    recommendation,
    selectedOption,
    selectOption,
    isLoading: routingLoading,
  } = useRoutingSuggestion({
    assetSymbol,
    action: action as 'supply' | 'borrow',
    enabled: showRouting,
  });

  // Set initial selection from routing
  useEffect(() => {
    if (showRouting && recommendation && !selectedProtocol) {
      setSelectedProtocol(recommendation.protocol);
      setSelectedMarketId(recommendation.marketId);
    }
  }, [recommendation, showRouting, selectedProtocol]);

  // For withdraw/repay, use position's protocol
  useEffect(() => {
    if (!showRouting && position) {
      setSelectedProtocol(position.protocol);
      setSelectedMarketId(position.marketId);
    }
  }, [position, showRouting]);

  // Get wallet balance
  const { data: walletBalance } = useBalance({
    address: userAddress,
    token: assetAddress,
  });

  // Calculate max amounts
  const maxAmount = useMemo(() => {
    switch (action) {
      case 'supply':
        return walletBalance?.value || 0n;
      case 'withdraw':
        return position?.supplyBalance || 0n;
      case 'borrow':
        // Would need market liquidity check
        return selectedOption?.market.availableLiquidity || 0n;
      case 'repay':
        // Min of wallet balance and borrow balance
        const borrowBalance = position?.borrowBalance || 0n;
        const balance = walletBalance?.value || 0n;
        return borrowBalance < balance ? borrowBalance : balance;
      default:
        return 0n;
    }
  }, [action, walletBalance, position, selectedOption]);

  // Parse amount
  const parsedAmount = useMemo(() => {
    if (!amountInput) return 0n;
    try {
      return parseUnits(amountInput, assetDecimals);
    } catch {
      return 0n;
    }
  }, [amountInput, assetDecimals]);

  const isMax = parsedAmount >= maxAmount && maxAmount > 0n;

  // Simulate health factor
  const { simulatedHF, isSimulating } = useSimulateHealthFactor(
    selectedProtocol || 'aave',
    selectedProtocol && parsedAmount > 0n
      ? {
          protocol: selectedProtocol,
          action,
          marketId: selectedMarketId || '',
          asset: assetAddress,
          amount: parsedAmount,
        }
      : null
  );

  // Validation
  const validation = useMemo(() => {
    if (!selectedProtocol) return { valid: false, error: 'Select a protocol' };
    if (!amountInput || parsedAmount === 0n) return { valid: false, error: 'Enter an amount' };
    if (parsedAmount > maxAmount) return { valid: false, error: 'Insufficient balance' };
    if (simulatedHF !== null && simulatedHF < 1) {
      return { valid: false, error: 'Would cause liquidation' };
    }
    return { valid: true, error: null };
  }, [selectedProtocol, amountInput, parsedAmount, maxAmount, simulatedHF]);

  // Handle submit
  const handleSubmit = () => {
    if (!validation.valid || !selectedProtocol || !selectedMarketId) return;

    onSubmit({
      protocol: selectedProtocol,
      marketId: selectedMarketId,
      amount: parsedAmount,
      isMax,
    });
  };

  // Handle max click
  const handleMax = () => {
    setAmountInput(formatUnits(maxAmount, assetDecimals));
  };

  // Handle option select
  const handleOptionSelect = (protocol: LendingProtocol, marketId: string) => {
    setSelectedProtocol(protocol);
    setSelectedMarketId(marketId);
    selectOption(protocol, marketId);
  };

  // Get selected option for display
  const displayOption = useMemo(() => {
    if (!showRouting) return null;
    return allOptions.find(
      (o) => o.protocol === selectedProtocol && o.marketId === selectedMarketId
    );
  }, [showRouting, allOptions, selectedProtocol, selectedMarketId]);

  return (
    <div className="space-y-6">
      {/* Protocol Selector (for supply/borrow) */}
      {showRouting && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Protocol
          </label>
          <ProtocolSelector
            options={allOptions}
            selected={displayOption || null}
            onSelect={handleOptionSelect}
            action={action as 'supply' | 'borrow'}
            isLoading={routingLoading}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Amount Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-400">Amount</label>
          <div className="text-sm text-gray-500">
            {action === 'supply' || action === 'repay' ? 'Balance: ' : 'Available: '}
            <span className="text-gray-300">
              {formatNumber(Number(formatUnits(maxAmount, assetDecimals)))} {assetSymbol}
            </span>
          </div>
        </div>

        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => {
              // Only allow numbers and decimals
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setAmountInput(value);
            }}
            disabled={isSubmitting}
            className="text-xl pr-24"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-gray-400">{assetSymbol}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMax}
              disabled={isSubmitting}
              className="text-prism hover:text-prism/80"
            >
              MAX
            </Button>
          </div>
        </div>

        {/* USD Value */}
        {parsedAmount > 0n && (
          <div className="mt-1 text-sm text-gray-500">
            ≈ ${formatNumber(Number(formatUnits(parsedAmount, assetDecimals)))}
          </div>
        )}
      </div>

      {/* Transaction Preview */}
      {parsedAmount > 0n && selectedOption && (
        <div className="prism-feature-card p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Transaction Preview</h4>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Protocol</span>
            <span>{selectedOption.market.protocol}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {action === 'supply' || action === 'withdraw' ? 'Supply APY' : 'Borrow APY'}
            </span>
            <span className={action === 'supply' ? 'text-green-500' : 'text-orange-500'}>
              {formatPercent(selectedOption.apy)}
            </span>
          </div>

          {/* Health Factor Simulation */}
          {(action === 'withdraw' || action === 'borrow') && position && (
            <HealthFactorCard
              healthFactor={position.healthFactor || Infinity}
              simulatedHF={simulatedHF ?? undefined}
              isSimulating={isSimulating}
            />
          )}
        </div>
      )}

      {/* Validation Error */}
      {!validation.valid && validation.error && amountInput && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {validation.error}
        </div>
      )}

      {/* Health Factor Warning */}
      {simulatedHF !== null && simulatedHF < 1.3 && simulatedHF >= 1 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-500">
          <AlertCircle className="w-4 h-4" />
          This transaction will significantly reduce your health factor
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!validation.valid || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              {action === 'supply' && 'Supply'}
              {action === 'withdraw' && 'Withdraw'}
              {action === 'borrow' && 'Borrow'}
              {action === 'repay' && 'Repay'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default LendingForm;
