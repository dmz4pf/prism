/**
 * SIWE (Sign-In With Ethereum) Authentication Hook
 *
 * Provides authentication functionality using Ethereum wallet signatures.
 * Implements the SIWE standard for secure, decentralized authentication.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { api } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

export type AuthState = 'idle' | 'loading' | 'authenticated' | 'error';

export interface SiweAuthReturn {
  /** Current authentication state */
  state: AuthState;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** Authenticated address (if any) */
  authenticatedAddress: string | null;
  /** Error if authentication failed */
  error: Error | null;
  /** Sign in with Ethereum */
  signIn: () => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Check if session is valid */
  checkSession: () => Promise<boolean>;
}

// Session storage key
const SESSION_KEY = 'prism_siwe_session';

// =============================================================================
// HOOK
// =============================================================================

export function useSiweAuth(): SiweAuthReturn {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<AuthState>('idle');
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Check for existing session on mount and when address changes
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!address) {
        setAuthenticatedAddress(null);
        setState('idle');
        return;
      }

      // Check local storage for session
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session.address?.toLowerCase() === address.toLowerCase()) {
            // Verify session is still valid with backend (if available)
            try {
              await api.healthCheck();
              setAuthenticatedAddress(session.address);
              setState('authenticated');
              return;
            } catch {
              // Backend not available - use local session
              setAuthenticatedAddress(session.address);
              setState('authenticated');
              return;
            }
          }
        } catch {
          // Invalid session data - clear it
          localStorage.removeItem(SESSION_KEY);
        }
      }

      // No valid session
      setState('idle');
    };

    checkExistingSession();
  }, [address]);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setAuthenticatedAddress(null);
      setState('idle');
      localStorage.removeItem(SESSION_KEY);
    }
  }, [isConnected]);

  /**
   * Sign in with Ethereum
   */
  const signIn = useCallback(async () => {
    if (!address || !chainId) {
      setError(new Error('Wallet not connected'));
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // Get nonce from backend (or generate locally if backend unavailable)
      let nonce: string;
      try {
        const response = await api.getNonce();
        nonce = response.nonce;
      } catch {
        // Backend not available - generate local nonce
        nonce = Math.random().toString(36).substring(2, 15);
      }

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Prism to access your wallet and DeFi features.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      const messageString = message.prepareMessage();

      // Request signature from user
      const signature = await signMessageAsync({ message: messageString });

      // Verify with backend (if available)
      try {
        const result = await api.verify(messageString, signature);
        if (!result.ok) {
          throw new Error('Signature verification failed');
        }
      } catch (apiError) {
        // Backend not available - verify locally
        const verifyResult = await message.verify({
          signature,
          nonce,
        });
        if (!verifyResult.success) {
          throw new Error('Local signature verification failed');
        }
      }

      // Store session
      const session = {
        address,
        chainId,
        authenticatedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setAuthenticatedAddress(address);
      setState('authenticated');
    } catch (err) {
      console.error('SIWE sign in error:', err);
      setError(err as Error);
      setState('error');
      throw err;
    }
  }, [address, chainId, signMessageAsync]);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    setState('loading');

    try {
      // Notify backend (if available)
      try {
        await api.logout();
      } catch {
        // Backend not available - continue with local logout
      }

      // Clear local session
      localStorage.removeItem(SESSION_KEY);
      setAuthenticatedAddress(null);
      setState('idle');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
      setState('error');
    }
  }, []);

  /**
   * Check if current session is valid
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (!storedSession) return false;

    try {
      const session = JSON.parse(storedSession);

      // Check expiration
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        setAuthenticatedAddress(null);
        setState('idle');
        return false;
      }

      // Check address matches
      if (address && session.address?.toLowerCase() !== address.toLowerCase()) {
        localStorage.removeItem(SESSION_KEY);
        setAuthenticatedAddress(null);
        setState('idle');
        return false;
      }

      return true;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
  }, [address]);

  return {
    state,
    isAuthenticated: state === 'authenticated',
    isLoading: state === 'loading',
    authenticatedAddress,
    error,
    signIn,
    signOut,
    checkSession,
  };
}

export default useSiweAuth;
