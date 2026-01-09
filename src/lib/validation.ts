/**
 * Validation Utilities for Staking
 * Client-side validation for amounts, slippage, and other inputs
 */

import { parseEther, formatEther } from 'viem';
import type { Address } from 'viem';
import { createStakingErrors, StakingError } from '@/services/errors';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: StakingError;
}

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  // Amount constraints
  MIN_STAKE_AMOUNT: '0.001', // 0.001 ETH minimum
  MAX_STAKE_AMOUNT: '1000', // 1000 ETH maximum (safety limit)

  // Slippage constraints
  MIN_SLIPPAGE: 0.1, // 0.1%
  MAX_SLIPPAGE: 50, // 50% (very high, but allowed)
  DEFAULT_SLIPPAGE: 0.5, // 0.5%

  // Price impact warnings
  WARNING_PRICE_IMPACT: 1, // Warn if > 1%
  CRITICAL_PRICE_IMPACT: 5, // Critical if > 5%

  // Liquidity check (% of protocol TVL)
  MAX_TRADE_SIZE_PCT: 10, // 10% of pool
} as const;

/**
 * Validate stake amount
 */
export function validateStakeAmount(
  amount: string,
  balance?: bigint,
  protocolLiquidity?: number
): ValidationResult {
  // Check if amount is provided
  if (!amount || amount.trim() === '') {
    return {
      isValid: false,
      error: createStakingErrors.invalidAmount(),
    };
  }

  // Parse amount
  let numAmount: number;
  try {
    numAmount = parseFloat(amount);
  } catch {
    return {
      isValid: false,
      error: createStakingErrors.invalidAmount(),
    };
  }

  // Check if valid number
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return {
      isValid: false,
      error: createStakingErrors.invalidAmount(),
    };
  }

  // Check if positive
  if (numAmount <= 0) {
    return {
      isValid: false,
      error: createStakingErrors.invalidAmount(),
    };
  }

  // Check minimum
  if (numAmount < parseFloat(VALIDATION_CONSTRAINTS.MIN_STAKE_AMOUNT)) {
    return {
      isValid: false,
      error: createStakingErrors.amountTooLow(VALIDATION_CONSTRAINTS.MIN_STAKE_AMOUNT),
    };
  }

  // Check maximum
  if (numAmount > parseFloat(VALIDATION_CONSTRAINTS.MAX_STAKE_AMOUNT)) {
    return {
      isValid: false,
      error: createStakingErrors.amountTooHigh(
        VALIDATION_CONSTRAINTS.MAX_STAKE_AMOUNT,
        'Safety limit exceeded'
      ),
    };
  }

  // Check balance if provided
  if (balance !== undefined) {
    try {
      const amountWei = parseEther(amount);
      // Leave 0.01 ETH for gas
      const gasReserve = parseEther('0.01');
      const availableBalance = balance > gasReserve ? balance - gasReserve : 0n;

      if (amountWei > availableBalance) {
        return {
          isValid: false,
          error: createStakingErrors.insufficientBalance(
            amount,
            formatEther(availableBalance)
          ),
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: createStakingErrors.invalidAmount(),
      };
    }
  }

  // Check liquidity if provided
  if (protocolLiquidity !== undefined && protocolLiquidity > 0) {
    const amountUsd = numAmount * 2300; // Approximate ETH price
    const maxTradeSize = protocolLiquidity * (VALIDATION_CONSTRAINTS.MAX_TRADE_SIZE_PCT / 100);

    if (amountUsd > maxTradeSize) {
      const maxEth = (maxTradeSize / 2300).toFixed(4);
      return {
        isValid: false,
        error: createStakingErrors.amountTooHigh(
          maxEth,
          'Exceeds recommended trade size for this protocol'
        ),
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate slippage tolerance
 */
export function validateSlippage(slippage: number): ValidationResult {
  // Check if valid number
  if (isNaN(slippage) || !isFinite(slippage)) {
    return {
      isValid: false,
      error: new StakingError(
        'Invalid slippage',
        'INVALID_AMOUNT' as any,
        'Please enter a valid slippage tolerance',
        { recovery: 'Enter a number between 0.1 and 50' }
      ),
    };
  }

  // Check minimum
  if (slippage < VALIDATION_CONSTRAINTS.MIN_SLIPPAGE) {
    return {
      isValid: false,
      error: new StakingError(
        `Slippage too low: ${slippage}`,
        'INVALID_AMOUNT' as any,
        `Minimum slippage is ${VALIDATION_CONSTRAINTS.MIN_SLIPPAGE}%`,
        {
          recovery: `Use at least ${VALIDATION_CONSTRAINTS.MIN_SLIPPAGE}% slippage`,
          severity: 'warning',
        }
      ),
    };
  }

  // Check maximum
  if (slippage > VALIDATION_CONSTRAINTS.MAX_SLIPPAGE) {
    return {
      isValid: false,
      error: new StakingError(
        `Slippage too high: ${slippage}`,
        'INVALID_AMOUNT' as any,
        `Maximum slippage is ${VALIDATION_CONSTRAINTS.MAX_SLIPPAGE}%`,
        { recovery: 'Reduce slippage tolerance' }
      ),
    };
  }

  // Warning for high slippage
  if (slippage > 5) {
    return {
      isValid: true,
      error: new StakingError(
        `High slippage: ${slippage}`,
        'INVALID_AMOUNT' as any,
        'Slippage tolerance is very high',
        {
          recovery: 'You may receive less than expected. Consider reducing slippage',
          severity: 'warning',
        }
      ),
    };
  }

  return { isValid: true };
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim() === '') {
    return {
      isValid: false,
      error: new StakingError(
        'Empty address',
        'WALLET_NOT_CONNECTED' as any,
        'Wallet address is required',
        { recovery: 'Please connect your wallet' }
      ),
    };
  }

  // Basic Ethereum address format check
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return {
      isValid: false,
      error: new StakingError(
        `Invalid address: ${address}`,
        'WALLET_NOT_CONNECTED' as any,
        'Invalid wallet address format',
        { recovery: 'Please reconnect your wallet' }
      ),
    };
  }

  return { isValid: true };
}

/**
 * Check price impact and return severity
 */
export function checkPriceImpact(priceImpact: number): {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  shouldWarn: boolean;
} {
  if (priceImpact < VALIDATION_CONSTRAINTS.WARNING_PRICE_IMPACT) {
    return {
      severity: 'low',
      message: 'Price impact is minimal',
      shouldWarn: false,
    };
  }

  if (priceImpact < 3) {
    return {
      severity: 'medium',
      message: 'Moderate price impact',
      shouldWarn: true,
    };
  }

  if (priceImpact < VALIDATION_CONSTRAINTS.CRITICAL_PRICE_IMPACT) {
    return {
      severity: 'high',
      message: 'High price impact - you may receive significantly less',
      shouldWarn: true,
    };
  }

  return {
    severity: 'critical',
    message: 'Critical price impact - strongly consider reducing amount',
    shouldWarn: true,
  };
}

/**
 * Format validation error for display
 */
export function formatValidationError(error: StakingError): {
  title: string;
  message: string;
  recovery?: string;
  severity: 'error' | 'warning' | 'info';
} {
  return {
    title: error.userMessage,
    message: error.message,
    recovery: error.recovery,
    severity: error.severity,
  };
}

/**
 * Sanitize numeric input
 * Prevents non-numeric characters and formats correctly
 */
export function sanitizeNumericInput(value: string, decimals: number = 18): string {
  // Remove non-numeric characters except decimal point
  let sanitized = value.replace(/[^\d.]/g, '');

  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places
  if (parts.length === 2 && parts[1].length > decimals) {
    sanitized = parts[0] + '.' + parts[1].substring(0, decimals);
  }

  // Remove leading zeros (except for 0.x)
  if (sanitized.startsWith('0') && !sanitized.startsWith('0.') && sanitized.length > 1) {
    sanitized = sanitized.replace(/^0+/, '');
  }

  return sanitized;
}

/**
 * Calculate percentage of amount relative to total
 */
export function calculatePercentage(amount: string, total: number): number {
  try {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || total === 0) return 0;
    return (numAmount / total) * 100;
  } catch {
    return 0;
  }
}

/**
 * Check if amount is dust (too small to be meaningful)
 */
export function isDustAmount(amount: string): boolean {
  try {
    const numAmount = parseFloat(amount);
    return numAmount < 0.000001; // Less than 1 gwei
  } catch {
    return false;
  }
}

/**
 * Validate transaction deadline
 */
export function validateDeadline(deadline: number): ValidationResult {
  const now = Math.floor(Date.now() / 1000);

  if (deadline <= now) {
    return {
      isValid: false,
      error: new StakingError(
        'Deadline expired',
        'TRANSACTION_FAILED' as any,
        'Transaction deadline has passed',
        { recovery: 'Try again with a new transaction' }
      ),
    };
  }

  // Warn if deadline is too far in future (> 1 hour)
  if (deadline > now + 3600) {
    return {
      isValid: true,
      error: new StakingError(
        'Deadline too far',
        'TRANSACTION_FAILED' as any,
        'Transaction deadline is very long',
        {
          recovery: 'This may allow unfavorable price movements',
          severity: 'warning',
        }
      ),
    };
  }

  return { isValid: true };
}

/**
 * Batch validate all inputs for staking
 */
export function validateStakingInputs(params: {
  amount: string;
  slippage: number;
  address?: Address;
  balance?: bigint;
  protocolLiquidity?: number;
  priceImpact?: number;
}): {
  isValid: boolean;
  errors: StakingError[];
  warnings: StakingError[];
} {
  const errors: StakingError[] = [];
  const warnings: StakingError[] = [];

  // Validate amount
  const amountValidation = validateStakeAmount(
    params.amount,
    params.balance,
    params.protocolLiquidity
  );
  if (!amountValidation.isValid && amountValidation.error) {
    if (amountValidation.error.severity === 'warning') {
      warnings.push(amountValidation.error);
    } else {
      errors.push(amountValidation.error);
    }
  }

  // Validate slippage
  const slippageValidation = validateSlippage(params.slippage);
  if (!slippageValidation.isValid && slippageValidation.error) {
    if (slippageValidation.error.severity === 'warning') {
      warnings.push(slippageValidation.error);
    } else {
      errors.push(slippageValidation.error);
    }
  } else if (slippageValidation.error) {
    // Valid but has warning
    warnings.push(slippageValidation.error);
  }

  // Validate address if provided
  if (params.address) {
    const addressValidation = validateAddress(params.address);
    if (!addressValidation.isValid && addressValidation.error) {
      errors.push(addressValidation.error);
    }
  }

  // Check price impact if provided
  if (params.priceImpact !== undefined) {
    const impactCheck = checkPriceImpact(params.priceImpact);
    if (impactCheck.shouldWarn) {
      warnings.push(
        new StakingError(
          `Price impact: ${params.priceImpact}%`,
          'SLIPPAGE_EXCEEDED' as any,
          impactCheck.message,
          {
            recovery: 'Consider reducing the stake amount',
            severity: impactCheck.severity === 'critical' ? 'error' : 'warning',
          }
        )
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
