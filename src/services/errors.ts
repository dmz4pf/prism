/**
 * Staking Error System
 * Comprehensive error types with user-friendly messages and recovery suggestions
 */

/**
 * Error codes for all possible staking failures
 */
export enum StakingErrorCode {
  // Balance & Amount Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  AMOUNT_TOO_LOW = 'AMOUNT_TOO_LOW',
  AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH',
  INVALID_AMOUNT = 'INVALID_AMOUNT',

  // Transaction Errors
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIMULATION_FAILED = 'SIMULATION_FAILED',

  // Approval Errors
  APPROVAL_FAILED = 'APPROVAL_FAILED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',

  // User Action Errors
  USER_REJECTED = 'USER_REJECTED',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Protocol Errors
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  QUOTE_FAILED = 'QUOTE_FAILED',
  ADAPTER_NOT_FOUND = 'ADAPTER_NOT_FOUND',
  POSITION_FETCH_FAILED = 'POSITION_FETCH_FAILED',

  // Data Errors
  PRICE_FEED_ERROR = 'PRICE_FEED_ERROR',
  YIELD_DATA_ERROR = 'YIELD_DATA_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels for UI display
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Custom error class for staking operations
 */
export class StakingError extends Error {
  public readonly code: StakingErrorCode;
  public readonly userMessage: string;
  public readonly recovery?: string;
  public readonly severity: ErrorSeverity;
  public readonly originalError?: Error;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: StakingErrorCode,
    userMessage: string,
    options?: {
      recovery?: string;
      severity?: ErrorSeverity;
      originalError?: Error;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'StakingError';
    this.code = code;
    this.userMessage = userMessage;
    this.recovery = options?.recovery;
    this.severity = options?.severity || 'error';
    this.originalError = options?.originalError;
    this.metadata = options?.metadata;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StakingError);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes = [
      StakingErrorCode.NETWORK_ERROR,
      StakingErrorCode.RPC_ERROR,
      StakingErrorCode.TIMEOUT,
      StakingErrorCode.GAS_ESTIMATION_FAILED,
      StakingErrorCode.QUOTE_FAILED,
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      recovery: this.recovery,
      severity: this.severity,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

/**
 * Parse unknown errors and convert to StakingError
 */
export function parseError(error: unknown): StakingError {
  // Already a StakingError
  if (error instanceof StakingError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Insufficient balance
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return new StakingError(
        error.message,
        StakingErrorCode.INSUFFICIENT_BALANCE,
        "You don't have enough ETH for this transaction",
        {
          recovery: 'Add more ETH to your wallet or reduce the stake amount',
          originalError: error,
        }
      );
    }

    // User rejected
    if (message.includes('user rejected') || message.includes('user denied')) {
      return new StakingError(
        error.message,
        StakingErrorCode.USER_REJECTED,
        'Transaction was cancelled',
        {
          recovery: 'Click the stake button again to retry',
          severity: 'info',
          originalError: error,
        }
      );
    }

    // Slippage exceeded
    if (message.includes('slippage') || message.includes('price')) {
      return new StakingError(
        error.message,
        StakingErrorCode.SLIPPAGE_EXCEEDED,
        'Price moved too much during transaction',
        {
          recovery: 'Try increasing slippage tolerance or reducing the stake amount',
          originalError: error,
        }
      );
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return new StakingError(
        error.message,
        StakingErrorCode.NETWORK_ERROR,
        'Network connection issue',
        {
          recovery: 'Check your internet connection and try again',
          originalError: error,
        }
      );
    }

    // Timeout
    if (message.includes('timeout')) {
      return new StakingError(
        error.message,
        StakingErrorCode.TIMEOUT,
        'Request timed out',
        {
          recovery: 'The network is slow. Please wait and try again',
          originalError: error,
        }
      );
    }

    // Wrong network
    if (message.includes('chain') || message.includes('network')) {
      return new StakingError(
        error.message,
        StakingErrorCode.WRONG_NETWORK,
        'Wrong network',
        {
          recovery: 'Please switch to Base network in your wallet',
          originalError: error,
        }
      );
    }

    // Gas estimation failed
    if (message.includes('gas') || message.includes('estimate')) {
      return new StakingError(
        error.message,
        StakingErrorCode.GAS_ESTIMATION_FAILED,
        'Unable to estimate transaction cost',
        {
          recovery: 'The transaction may fail. Try reducing the amount',
          severity: 'warning',
          originalError: error,
        }
      );
    }

    // Generic transaction failure
    if (message.includes('transaction') || message.includes('revert')) {
      return new StakingError(
        error.message,
        StakingErrorCode.TRANSACTION_FAILED,
        'Transaction failed',
        {
          recovery: 'Please try again or contact support if the issue persists',
          originalError: error,
        }
      );
    }

    // Fallback for other Error instances
    return new StakingError(
      error.message,
      StakingErrorCode.UNKNOWN_ERROR,
      'Something went wrong',
      {
        recovery: 'Please try again or contact support',
        originalError: error,
      }
    );
  }

  // String error
  if (typeof error === 'string') {
    return new StakingError(
      error,
      StakingErrorCode.UNKNOWN_ERROR,
      error,
      {
        recovery: 'Please try again',
      }
    );
  }

  // Unknown type
  return new StakingError(
    'Unknown error occurred',
    StakingErrorCode.UNKNOWN_ERROR,
    'Something unexpected happened',
    {
      recovery: 'Please refresh the page and try again',
      metadata: { error: String(error) },
    }
  );
}

/**
 * Create specific error instances (factory functions)
 */
export const createStakingErrors = {
  insufficientBalance: (required: string, available: string) =>
    new StakingError(
      `Insufficient balance: required ${required}, available ${available}`,
      StakingErrorCode.INSUFFICIENT_BALANCE,
      `You need ${required} ETH but only have ${available} ETH`,
      {
        recovery: 'Add more ETH to your wallet or reduce the stake amount',
        metadata: { required, available },
      }
    ),

  amountTooLow: (min: string) =>
    new StakingError(
      `Amount below minimum: ${min}`,
      StakingErrorCode.AMOUNT_TOO_LOW,
      `Minimum stake amount is ${min} ETH`,
      {
        recovery: `Enter at least ${min} ETH`,
        metadata: { min },
      }
    ),

  amountTooHigh: (max: string, reason?: string) =>
    new StakingError(
      `Amount exceeds maximum: ${max}`,
      StakingErrorCode.AMOUNT_TOO_HIGH,
      `Amount may cause high slippage or exceed liquidity`,
      {
        recovery: `Try reducing to ${max} ETH or less`,
        severity: 'warning',
        metadata: { max, reason },
      }
    ),

  invalidAmount: () =>
    new StakingError(
      'Invalid amount',
      StakingErrorCode.INVALID_AMOUNT,
      'Please enter a valid amount',
      {
        recovery: 'Enter a positive number',
      }
    ),

  slippageExceeded: (expected: string, actual: string) =>
    new StakingError(
      `Slippage exceeded: expected ${expected}, got ${actual}`,
      StakingErrorCode.SLIPPAGE_EXCEEDED,
      'Price moved too much during the transaction',
      {
        recovery: 'Try increasing slippage tolerance or reducing the amount',
        metadata: { expected, actual },
      }
    ),

  insufficientLiquidity: (protocol: string) =>
    new StakingError(
      `Insufficient liquidity in ${protocol}`,
      StakingErrorCode.INSUFFICIENT_LIQUIDITY,
      `Not enough liquidity available for this swap`,
      {
        recovery: 'Try a smaller amount or choose a different protocol',
        metadata: { protocol },
      }
    ),

  walletNotConnected: () =>
    new StakingError(
      'Wallet not connected',
      StakingErrorCode.WALLET_NOT_CONNECTED,
      'Please connect your wallet',
      {
        recovery: 'Click the Connect Wallet button',
        severity: 'info',
      }
    ),

  wrongNetwork: (expected: string, actual: string) =>
    new StakingError(
      `Wrong network: expected ${expected}, got ${actual}`,
      StakingErrorCode.WRONG_NETWORK,
      'Please switch to Base network',
      {
        recovery: 'Open your wallet and switch to Base',
        metadata: { expected, actual },
      }
    ),

  quoteFailed: (protocol: string) =>
    new StakingError(
      `Failed to get quote from ${protocol}`,
      StakingErrorCode.QUOTE_FAILED,
      'Unable to calculate swap rate',
      {
        recovery: 'Try again or choose a different protocol',
        metadata: { protocol },
      }
    ),

  adapterNotFound: (protocolId: string) =>
    new StakingError(
      `No adapter found for ${protocolId}`,
      StakingErrorCode.ADAPTER_NOT_FOUND,
      'This protocol is not supported',
      {
        recovery: 'Choose a different staking protocol',
        metadata: { protocolId },
      }
    ),

  networkError: (details?: string) =>
    new StakingError(
      `Network error: ${details || 'unknown'}`,
      StakingErrorCode.NETWORK_ERROR,
      'Connection issue',
      {
        recovery: 'Check your internet connection and try again',
        metadata: { details },
      }
    ),

  simulationFailed: (reason: string) =>
    new StakingError(
      `Transaction simulation failed: ${reason}`,
      StakingErrorCode.SIMULATION_FAILED,
      'This transaction would fail',
      {
        recovery: 'Try adjusting the amount or slippage tolerance',
        severity: 'warning',
        metadata: { reason },
      }
    ),
};

/**
 * Log error to console (and optionally to external service like Sentry)
 */
export function logError(error: StakingError | Error, context?: Record<string, unknown>) {
  const errorData = error instanceof StakingError ? error.toJSON() : {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  console.error('[Staking Error]', {
    ...errorData,
    context,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to Sentry or other error tracking service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Type guard to check if error is a StakingError
 */
export function isStakingError(error: unknown): error is StakingError {
  return error instanceof StakingError;
}
