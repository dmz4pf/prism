/**
 * Lending Risk Management Utilities
 *
 * Functions for calculating and managing lending risk.
 */

import { LendingMarket, LendingPosition, LendingActionParams } from '@/types/lending';

// =============================================================================
// TYPES
// =============================================================================

export interface RiskAssessment {
  /** Overall risk level */
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  /** Risk score 0-100 */
  score: number;
  /** Human readable message */
  message: string;
  /** Specific warnings */
  warnings: string[];
  /** Recommended actions */
  recommendations: string[];
}

export interface LiquidationRisk {
  /** Is position at risk of liquidation */
  isAtRisk: boolean;
  /** Health factor */
  healthFactor: number;
  /** Price drop % before liquidation */
  priceDropToLiquidation: number;
  /** Amount in USD at risk */
  amountAtRisk: number;
  /** Liquidation penalty % */
  liquidationPenalty: number;
}

export interface BorrowCapacity {
  /** Maximum borrowable in USD */
  maxBorrowUSD: number;
  /** Current borrow in USD */
  currentBorrowUSD: number;
  /** Available to borrow in USD */
  availableBorrowUSD: number;
  /** Utilization % (0-100) */
  utilizationPercent: number;
  /** Safe borrow limit (80% of max) */
  safeBorrowUSD: number;
}

// =============================================================================
// HEALTH FACTOR CALCULATIONS
// =============================================================================

/**
 * Calculate health factor from collateral and debt values
 *
 * HF = (Collateral * Liquidation Threshold) / Debt
 */
export function calculateHealthFactor(
  collateralValueUSD: number,
  debtValueUSD: number,
  liquidationThreshold: number
): number {
  if (debtValueUSD === 0) return Infinity;
  return (collateralValueUSD * liquidationThreshold) / debtValueUSD;
}

/**
 * Calculate how much collateral value can drop before liquidation
 */
export function calculatePriceDropToLiquidation(healthFactor: number): number {
  if (!isFinite(healthFactor) || healthFactor <= 0) return 0;
  if (healthFactor >= 100) return 99; // Cap at 99%

  // Price can drop by (1 - 1/HF) * 100%
  return Math.max(0, (1 - 1 / healthFactor) * 100);
}

/**
 * Calculate new health factor after an action
 */
export function simulateHealthFactor(
  currentHF: number,
  action: 'supply' | 'withdraw' | 'borrow' | 'repay',
  actionValueUSD: number,
  currentCollateralUSD: number,
  currentDebtUSD: number,
  liquidationThreshold: number
): number {
  let newCollateral = currentCollateralUSD;
  let newDebt = currentDebtUSD;

  switch (action) {
    case 'supply':
      newCollateral += actionValueUSD;
      break;
    case 'withdraw':
      newCollateral = Math.max(0, newCollateral - actionValueUSD);
      break;
    case 'borrow':
      newDebt += actionValueUSD;
      break;
    case 'repay':
      newDebt = Math.max(0, newDebt - actionValueUSD);
      break;
  }

  return calculateHealthFactor(newCollateral, newDebt, liquidationThreshold);
}

// =============================================================================
// RISK ASSESSMENT
// =============================================================================

/**
 * Assess overall risk of a lending position
 */
export function assessPositionRisk(
  positions: LendingPosition[]
): RiskAssessment {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Calculate totals
  const totalSupply = positions.reduce((sum, p) => sum + p.supplyBalanceUSD, 0);
  const totalBorrow = positions.reduce((sum, p) => sum + p.borrowBalanceUSD, 0);

  // Find lowest health factor
  const healthFactors = positions
    .filter((p) => p.healthFactor && isFinite(p.healthFactor))
    .map((p) => p.healthFactor!);

  const lowestHF = healthFactors.length > 0 ? Math.min(...healthFactors) : Infinity;

  // Check for concentrated positions
  const largestPosition = positions.reduce(
    (max, p) => (p.supplyBalanceUSD > max ? p.supplyBalanceUSD : max),
    0
  );
  const concentrationRatio = totalSupply > 0 ? largestPosition / totalSupply : 0;

  if (concentrationRatio > 0.8) {
    warnings.push('High concentration in a single position');
    recommendations.push('Consider diversifying across protocols');
  }

  // Assess based on health factor
  let level: RiskAssessment['level'];
  let score: number;
  let message: string;

  if (lowestHF < 1) {
    level = 'critical';
    score = 100;
    message = 'Position is liquidatable';
    warnings.push('Immediate liquidation risk!');
    recommendations.push('Repay debt or add collateral immediately');
  } else if (lowestHF < 1.1) {
    level = 'critical';
    score = 90;
    message = 'Extreme liquidation risk';
    warnings.push('Position very close to liquidation');
    recommendations.push('Add collateral or repay debt urgently');
  } else if (lowestHF < 1.3) {
    level = 'high';
    score = 70;
    message = 'High liquidation risk';
    warnings.push('Small price movement could trigger liquidation');
    recommendations.push('Consider reducing leverage');
  } else if (lowestHF < 1.5) {
    level = 'medium';
    score = 50;
    message = 'Moderate risk - monitor closely';
    recommendations.push('Keep an eye on health factor');
  } else if (lowestHF < 2) {
    level = 'low';
    score = 25;
    message = 'Low risk position';
  } else {
    level = 'safe';
    score = 10;
    message = 'Position is well-collateralized';
  }

  // Check for protocol-specific risks
  const protocols = new Set(positions.map((p) => p.protocol));
  if (protocols.size === 1 && positions.length > 1) {
    warnings.push('All positions in single protocol');
    recommendations.push('Consider spreading across multiple protocols');
  }

  return {
    level,
    score,
    message,
    warnings,
    recommendations,
  };
}

/**
 * Calculate liquidation risk details
 */
export function calculateLiquidationRisk(
  position: LendingPosition,
  market: LendingMarket
): LiquidationRisk {
  const healthFactor = position.healthFactor ?? Infinity;
  const isAtRisk = healthFactor < 1.5;
  const priceDropToLiquidation = calculatePriceDropToLiquidation(healthFactor);

  // Calculate amount at risk (debt that would be liquidated)
  const amountAtRisk = position.borrowBalanceUSD;
  const liquidationPenalty = market.liquidationPenalty * 100;

  return {
    isAtRisk,
    healthFactor,
    priceDropToLiquidation,
    amountAtRisk,
    liquidationPenalty,
  };
}

// =============================================================================
// BORROW CAPACITY
// =============================================================================

/**
 * Calculate borrow capacity for a user
 */
export function calculateBorrowCapacity(
  positions: LendingPosition[],
  markets: LendingMarket[]
): BorrowCapacity {
  // Calculate total collateral value (only positions marked as collateral)
  let totalCollateralUSD = 0;
  let weightedLTV = 0;

  for (const position of positions) {
    if (!position.isCollateralEnabled) continue;

    const market = markets.find((m) => m.id === position.marketId);
    if (!market) continue;

    const collateralValue = position.supplyBalanceUSD;
    totalCollateralUSD += collateralValue;
    weightedLTV += collateralValue * market.ltv;
  }

  // Calculate average LTV
  const avgLTV = totalCollateralUSD > 0 ? weightedLTV / totalCollateralUSD : 0;

  // Max borrowable
  const maxBorrowUSD = totalCollateralUSD * avgLTV;

  // Current borrow
  const currentBorrowUSD = positions.reduce(
    (sum, p) => sum + p.borrowBalanceUSD,
    0
  );

  // Available
  const availableBorrowUSD = Math.max(0, maxBorrowUSD - currentBorrowUSD);

  // Utilization
  const utilizationPercent =
    maxBorrowUSD > 0 ? (currentBorrowUSD / maxBorrowUSD) * 100 : 0;

  // Safe limit (80% of max for buffer)
  const safeBorrowUSD = maxBorrowUSD * 0.8;

  return {
    maxBorrowUSD,
    currentBorrowUSD,
    availableBorrowUSD,
    utilizationPercent,
    safeBorrowUSD,
  };
}

// =============================================================================
// RATE CHANGE ALERTS
// =============================================================================

export interface RateAlert {
  protocol: string;
  asset: string;
  rateType: 'supply' | 'borrow';
  previousRate: number;
  currentRate: number;
  changePercent: number;
  isSignificant: boolean;
}

/**
 * Check for significant rate changes
 */
export function checkRateChanges(
  currentMarkets: LendingMarket[],
  previousMarkets: LendingMarket[],
  threshold: number = 10 // 10% change threshold
): RateAlert[] {
  const alerts: RateAlert[] = [];

  for (const current of currentMarkets) {
    const previous = previousMarkets.find(
      (p) => p.id === current.id && p.protocol === current.protocol
    );

    if (!previous) continue;

    // Check supply rate
    if (previous.supplyAPY > 0) {
      const supplyChange =
        ((current.supplyAPY - previous.supplyAPY) / previous.supplyAPY) * 100;

      if (Math.abs(supplyChange) >= threshold) {
        alerts.push({
          protocol: current.protocol,
          asset: current.assetSymbol,
          rateType: 'supply',
          previousRate: previous.supplyAPY,
          currentRate: current.supplyAPY,
          changePercent: supplyChange,
          isSignificant: true,
        });
      }
    }

    // Check borrow rate
    if (previous.borrowAPY > 0) {
      const borrowChange =
        ((current.borrowAPY - previous.borrowAPY) / previous.borrowAPY) * 100;

      if (Math.abs(borrowChange) >= threshold) {
        alerts.push({
          protocol: current.protocol,
          asset: current.assetSymbol,
          rateType: 'borrow',
          previousRate: previous.borrowAPY,
          currentRate: current.borrowAPY,
          changePercent: borrowChange,
          isSignificant: true,
        });
      }
    }
  }

  return alerts;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate a lending action won't cause issues
 */
export function validateLendingAction(
  action: LendingActionParams,
  positions: LendingPosition[],
  market: LendingMarket
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find user's position in this market
  const position = positions.find((p) => p.marketId === market.id);

  switch (action.action) {
    case 'supply':
      // Check if market accepts supply
      if (!market.canSupply) {
        errors.push('Supply is disabled for this market');
      }
      if (market.isFrozen) {
        errors.push('Market is frozen');
      }
      // Check supply cap
      if (market.supplyCap && market.supplyCap > 0n) {
        const remaining = market.supplyCap - market.totalSupply;
        if (action.amount > remaining) {
          errors.push('Amount exceeds supply cap');
        }
      }
      break;

    case 'withdraw':
      // Check if user has enough supplied
      if (!position || position.supplyBalance < action.amount) {
        errors.push('Insufficient supply balance');
      }
      // Check liquidity
      if (action.amount > market.availableLiquidity) {
        errors.push('Insufficient market liquidity');
      }
      break;

    case 'borrow':
      // Check if market allows borrowing
      if (!market.canBorrow) {
        errors.push('Borrowing is disabled for this market');
      }
      // Check liquidity
      if (action.amount > market.availableLiquidity) {
        errors.push('Insufficient market liquidity');
      }
      // Check borrow cap
      if (market.borrowCap && market.borrowCap > 0n) {
        const remaining = market.borrowCap - market.totalBorrow;
        if (action.amount > remaining) {
          errors.push('Amount exceeds borrow cap');
        }
      }
      break;

    case 'repay':
      // Check if user has borrows to repay
      if (!position || position.borrowBalance === 0n) {
        errors.push('No borrow to repay');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format health factor for display
 */
export function formatHealthFactor(hf: number): string {
  if (!isFinite(hf)) return '∞';
  if (hf <= 0) return '0.00';
  if (hf > 99) return '>99';
  return hf.toFixed(2);
}

/**
 * Get health factor color class
 */
export function getHealthFactorColor(hf: number): string {
  if (hf < 1) return 'text-red-500';
  if (hf < 1.1) return 'text-red-500';
  if (hf < 1.3) return 'text-orange-500';
  if (hf < 1.5) return 'text-yellow-500';
  if (hf < 2) return 'text-green-400';
  return 'text-green-500';
}

/**
 * Get risk level color class
 */
export function getRiskLevelColor(level: RiskAssessment['level']): string {
  switch (level) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-400';
    case 'safe':
      return 'text-green-500';
    default:
      return 'text-gray-400';
  }
}
