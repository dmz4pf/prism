/**
 * Error Modal Component
 *
 * A modal for displaying critical errors that require user attention.
 * Features:
 * - User-friendly error messages
 * - Technical details (collapsible)
 * - Retry action if available
 * - Copy error details for support
 * - Links to help documentation
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorDetails {
  /** User-friendly error title */
  title: string;
  /** User-friendly error description */
  message: string;
  /** Technical error code (optional) */
  code?: string;
  /** Technical error details for debugging */
  technicalDetails?: string;
  /** Whether error is retryable */
  isRetryable?: boolean;
  /** Recovery suggestions */
  suggestions?: string[];
  /** Help link URL */
  helpUrl?: string;
}

export interface ErrorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Error details to display */
  error: ErrorDetails;
  /** Callback when user clicks retry */
  onRetry?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ErrorModal({ open, onClose, error, onRetry }: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy error details to clipboard
  const handleCopy = useCallback(async () => {
    const errorText = [
      `Error: ${error.title}`,
      `Message: ${error.message}`,
      error.code ? `Code: ${error.code}` : null,
      error.technicalDetails ? `Details: ${error.technicalDetails}` : null,
      `Timestamp: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [error]);

  // Handle retry
  const handleRetry = useCallback(() => {
    onRetry?.();
    onClose();
  }, [onRetry, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-md bg-secondary-900 border-secondary-800"
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on click outside
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                {error.title}
              </DialogTitle>
              {error.code && (
                <p className="text-xs text-secondary-500 mt-0.5">
                  Error Code: {error.code}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Main Message */}
          <DialogDescription className="text-secondary-300 text-sm">
            {error.message}
          </DialogDescription>

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="p-3 bg-secondary-800/50 rounded-lg">
              <p className="text-xs font-medium text-secondary-400 mb-2">
                What you can try:
              </p>
              <ul className="space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-secondary-300 flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Details (Collapsible) */}
          {error.technicalDetails && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-secondary-500 hover:text-secondary-300 transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Technical Details
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 bg-secondary-950 rounded-lg">
                      <code className="text-xs text-secondary-400 break-all whitespace-pre-wrap">
                        {error.technicalDetails}
                      </code>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {/* Retry Button */}
          {error.isRetryable && onRetry && (
            <Button
              onClick={handleRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="outline"
            className={cn(
              'flex-1 border-secondary-700 hover:bg-secondary-800',
              !error.isRetryable && 'flex-none'
            )}
          >
            {error.isRetryable ? 'Cancel' : 'Close'}
          </Button>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            {/* Copy Error */}
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="icon"
              className="text-secondary-500 hover:text-white"
              title="Copy error details"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            {/* Help Link */}
            {error.helpUrl && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-secondary-500 hover:text-white"
                title="Get help"
              >
                <a href={error.helpUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// HOOK FOR MANAGING ERROR MODAL
// =============================================================================

import { useState as useStateHook } from 'react';

export interface UseErrorModalReturn {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current error being displayed */
  error: ErrorDetails | null;
  /** Show error modal with given error */
  showError: (error: ErrorDetails, onRetry?: () => void) => void;
  /** Close the modal */
  closeError: () => void;
  /** Retry callback */
  onRetry: (() => void) | undefined;
}

export function useErrorModal(): UseErrorModalReturn {
  const [isOpen, setIsOpen] = useStateHook(false);
  const [error, setError] = useStateHook<ErrorDetails | null>(null);
  const [retryCallback, setRetryCallback] = useStateHook<(() => void) | undefined>(undefined);

  const showError = useCallback((newError: ErrorDetails, onRetry?: () => void) => {
    setError(newError);
    setRetryCallback(() => onRetry);
    setIsOpen(true);
  }, []);

  const closeError = useCallback(() => {
    setIsOpen(false);
    // Delay clearing error to allow animation
    setTimeout(() => {
      setError(null);
      setRetryCallback(undefined);
    }, 200);
  }, []);

  return {
    isOpen,
    error,
    showError,
    closeError,
    onRetry: retryCallback,
  };
}

// =============================================================================
// HELPER: Convert StakingError to ErrorDetails
// =============================================================================

// Import type from errors service if needed
interface StakingError {
  code: string;
  message: string;
  userMessage?: string;
  severity?: 'error' | 'warning' | 'info';
  context?: Record<string, unknown>;
  recoveryAction?: string;
  isRetryable?: boolean;
}

export function stakingErrorToDetails(error: StakingError): ErrorDetails {
  return {
    title: getErrorTitle(error.code),
    message: error.userMessage || error.message,
    code: error.code,
    technicalDetails: error.context ? JSON.stringify(error.context, null, 2) : undefined,
    isRetryable: error.isRetryable ?? isRetryableError(error.code),
    suggestions: getErrorSuggestions(error.code, error.recoveryAction),
  };
}

function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    INSUFFICIENT_BALANCE: 'Insufficient Balance',
    ALLOWANCE_TOO_LOW: 'Approval Required',
    TRANSACTION_FAILED: 'Transaction Failed',
    SIMULATION_FAILED: 'Transaction Would Fail',
    USER_REJECTED: 'Transaction Cancelled',
    NETWORK_ERROR: 'Network Error',
    RPC_ERROR: 'Connection Error',
    TIMEOUT: 'Request Timeout',
    SLIPPAGE_EXCEEDED: 'Price Changed',
    GAS_ESTIMATION_FAILED: 'Gas Estimation Failed',
    PROTOCOL_ERROR: 'Protocol Error',
  };
  return titles[code] || 'Something Went Wrong';
}

function isRetryableError(code: string): boolean {
  const retryable = [
    'NETWORK_ERROR',
    'RPC_ERROR',
    'TIMEOUT',
    'GAS_ESTIMATION_FAILED',
  ];
  return retryable.includes(code);
}

function getErrorSuggestions(code: string, recoveryAction?: string): string[] {
  const suggestions: string[] = [];

  if (recoveryAction) {
    suggestions.push(recoveryAction);
  }

  switch (code) {
    case 'INSUFFICIENT_BALANCE':
      suggestions.push('Check your wallet balance');
      suggestions.push('Make sure you have enough for gas fees');
      break;
    case 'ALLOWANCE_TOO_LOW':
      suggestions.push('Approve the protocol to spend your tokens');
      break;
    case 'NETWORK_ERROR':
    case 'RPC_ERROR':
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few seconds');
      break;
    case 'USER_REJECTED':
      suggestions.push('Click the button again to retry');
      break;
    case 'SLIPPAGE_EXCEEDED':
      suggestions.push('Increase your slippage tolerance');
      suggestions.push('Try a smaller amount');
      break;
    default:
      suggestions.push('Refresh the page and try again');
  }

  return suggestions;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ErrorModal;
