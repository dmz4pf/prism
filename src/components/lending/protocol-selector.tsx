'use client';

/**
 * ProtocolSelector Component
 *
 * Allows users to select from available protocols with routing suggestions.
 * Shows recommendation but allows manual selection.
 */

import { useState } from 'react';
import { LendingProtocol, LendingMarket } from '@/types/lending';
import { PROTOCOL_INFO } from '@/services/lending';
import { formatPercent } from '@/lib/utils';
import { Check, ChevronDown, Star, Zap } from 'lucide-react';
import { RoutingOption } from '@/hooks/lending/use-routing-suggestion';

// =============================================================================
// TYPES
// =============================================================================

export interface ProtocolSelectorProps {
  /** Available options */
  options: RoutingOption[];
  /** Currently selected option */
  selected: RoutingOption | null;
  /** On option select */
  onSelect: (protocol: LendingProtocol, marketId: string) => void;
  /** Action type for labeling */
  action: 'supply' | 'borrow';
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProtocolSelector({
  options,
  selected,
  onSelect,
  action,
  isLoading = false,
  disabled = false,
}: ProtocolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="prism-feature-card p-4 animate-pulse">
        <div className="h-6 bg-surface rounded w-1/3 mb-2" />
        <div className="h-8 bg-surface rounded w-1/2" />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="prism-feature-card p-4 text-center text-gray-400">
        No protocols available for this asset
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Protocol Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full prism-feature-card p-4 text-left transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-prism/50'}
          ${isOpen ? 'ring-2 ring-prism' : ''}
        `}
      >
        {selected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Protocol Icon */}
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
                <span className="text-lg font-semibold">
                  {selected.protocol[0].toUpperCase()}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {PROTOCOL_INFO[selected.protocol]?.name}
                  </span>
                  {selected.isRecommended && (
                    <span className="px-2 py-0.5 text-xs bg-prism/20 text-prism rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Best
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {action === 'supply' ? 'Supply' : 'Borrow'} APY:{' '}
                  <span className={action === 'supply' ? 'text-green-500' : 'text-orange-500'}>
                    {formatPercent(selected.apy)}
                  </span>
                </div>
              </div>
            </div>

            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-gray-400">
            <span>Select a protocol</span>
            <ChevronDown className="w-5 h-5" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Options */}
          <div className="absolute top-full left-0 right-0 mt-2 z-20 prism-feature-card p-2 shadow-xl max-h-80 overflow-auto">
            {/* Recommendation Header */}
            <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Smart Routing Suggestions
            </div>

            {options.map((option) => {
              const isSelected =
                selected?.protocol === option.protocol &&
                selected?.marketId === option.marketId;

              return (
                <button
                  key={`${option.protocol}-${option.marketId}`}
                  type="button"
                  onClick={() => {
                    onSelect(option.protocol, option.marketId);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                    ${isSelected ? 'bg-prism/10 border border-prism/30' : 'hover:bg-surface/50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Protocol Icon */}
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-border">
                      <span className="text-sm font-medium">
                        {option.protocol[0].toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {PROTOCOL_INFO[option.protocol]?.name}
                        </span>
                        {option.isRecommended && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-prism/20 text-prism rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{option.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold ${
                        action === 'supply' ? 'text-green-500' : 'text-orange-500'
                      }`}
                    >
                      {formatPercent(option.apy)}
                    </span>

                    {isSelected && (
                      <Check className="w-4 h-4 text-prism" />
                    )}
                  </div>
                </button>
              );
            })}

            {/* Footer note */}
            <div className="px-3 py-2 text-[10px] text-gray-500 border-t border-border mt-2">
              You can choose any protocol. Recommendations are based on APY and liquidity.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProtocolSelector;
