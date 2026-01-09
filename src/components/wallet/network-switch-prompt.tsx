'use client';

/**
 * NetworkSwitchPrompt - Inline network switching component
 *
 * Displays a prompt when the user is on the wrong network.
 * Can be used on any page to ensure users are on the correct chain.
 */

import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useNetworkSwitch } from '@/hooks/wallet';
import { Button } from '@/components/ui/button';

interface NetworkSwitchPromptProps {
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export function NetworkSwitchPrompt({
  className = '',
  variant = 'banner',
}: NetworkSwitchPromptProps) {
  const {
    isConnected,
    isCorrectNetwork,
    currentNetwork,
    targetNetwork,
    switchToTarget,
    isSwitching,
  } = useNetworkSwitch();

  // Don't render if not connected or already on correct network
  if (!isConnected || isCorrectNetwork) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-yellow-400 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Wrong network</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => switchToTarget()}
          disabled={isSwitching}
          className="h-7 px-2 text-xs border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
        >
          {isSwitching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>Switch to {targetNetwork.shortName}</>
          )}
        </Button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-400 mb-1">Wrong Network</h3>
            <p className="text-sm text-gray-400 mb-3">
              You're connected to {currentNetwork?.name || 'an unsupported network'}.
              Please switch to {targetNetwork.name} to use PRISM.
            </p>
            <Button
              onClick={() => switchToTarget()}
              disabled={isSwitching}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Switch to {targetNetwork.name}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: banner variant
  return (
    <div
      className={`w-full py-3 px-4 bg-yellow-500/10 border-b border-yellow-500/30 ${className}`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-400">
              Wrong Network Detected
            </p>
            <p className="text-xs text-gray-400">
              Connected to {currentNetwork?.name || 'unknown'}.
              Switch to {targetNetwork.name} to continue.
            </p>
          </div>
        </div>
        <Button
          onClick={() => switchToTarget()}
          disabled={isSwitching}
          size="sm"
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Switching...
            </>
          ) : (
            <>
              Switch Network
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
