/**
 * SIWE Sign-In Component
 *
 * A button/dialog component for Sign-In With Ethereum authentication.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, AlertTriangle, LogOut, Key } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSiweAuth } from '@/hooks/auth';

// =============================================================================
// TYPES
// =============================================================================

interface SiweSignInProps {
  /** Compact mode - just shows a button, no card wrapper */
  compact?: boolean;
  /** Called after successful sign in */
  onSignIn?: () => void;
  /** Called after sign out */
  onSignOut?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SiweSignIn({
  compact = false,
  onSignIn,
  onSignOut,
  className,
}: SiweSignInProps) {
  const { isConnected, address } = useAccount();
  const { isAuthenticated, isLoading, authenticatedAddress, signIn, signOut, error } = useSiweAuth();
  const [showError, setShowError] = useState(false);

  const handleSignIn = async () => {
    setShowError(false);
    try {
      await signIn();
      onSignIn?.();
    } catch {
      setShowError(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  // Not connected - show nothing or placeholder
  if (!isConnected) {
    if (compact) return null;
    return (
      <Card className={`p-4 bg-secondary-800/50 border-secondary-700 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-700 flex items-center justify-center">
            <Shield className="h-5 w-5 text-secondary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-400">Authentication</p>
            <p className="text-xs text-secondary-500">Connect wallet to sign in</p>
          </div>
        </div>
      </Card>
    );
  }

  // Authenticated
  if (isAuthenticated) {
    if (compact) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className={`gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 ${className}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Signed In
        </Button>
      );
    }

    return (
      <Card className={`p-4 bg-green-500/10 border-green-500/30 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Authenticated</p>
              <p className="text-xs text-secondary-400 font-mono">
                {authenticatedAddress?.slice(0, 6)}...{authenticatedAddress?.slice(-4)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-secondary-400 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  // Not authenticated - show sign in
  if (compact) {
    return (
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        size="sm"
        className={`gap-2 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing...
          </>
        ) : (
          <>
            <Key className="h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    );
  }

  return (
    <Card className={`p-4 bg-secondary-800/50 border-secondary-700 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Verify Ownership</p>
            <p className="text-xs text-secondary-400">
              Sign a message to verify you own this wallet
            </p>
          </div>
        </div>
        <Button onClick={handleSignIn} disabled={isLoading} size="sm">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">Sign in failed</p>
                <p className="text-xs text-secondary-400 mt-1">
                  {error.message || 'Please try again'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// =============================================================================
// AUTH GATE COMPONENT
// =============================================================================

interface AuthGateProps {
  /** Content to show when authenticated */
  children: React.ReactNode;
  /** Content to show when not authenticated */
  fallback?: React.ReactNode;
  /** Whether to require authentication */
  required?: boolean;
}

/**
 * Gate component that requires authentication to show children
 */
export function AuthGate({ children, fallback, required = true }: AuthGateProps) {
  const { isConnected } = useAccount();
  const { isAuthenticated, isLoading } = useSiweAuth();

  if (!required) {
    return <>{children}</>;
  }

  if (!isConnected) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="max-w-md mx-auto p-8 text-center">
        <Shield className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-secondary-400 mb-6">
          Please sign in with your wallet to access this feature.
        </p>
        <SiweSignIn />
      </div>
    );
  }

  return <>{children}</>;
}

export default SiweSignIn;
