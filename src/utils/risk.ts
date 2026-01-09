/**
 * Risk Management Utilities
 * Health factor calculations, liquidation warnings, and risk assessment
 */

import type {
  RiskLevel,
  RiskAssessment,
  RiskFactor,
  HealthFactorAlert,
  AavePosition,
} from '@/types/staking';

// ============================================
// HEALTH FACTOR CALCULATIONS
// ============================================

/**
 * Health factor thresholds
 */
export const HEALTH_FACTOR_THRESHOLDS = {
  SAFE: 2.0, // Very safe, can borrow more
  WARNING: 1.5, // Getting risky
  DANGER: 1.2, // Danger zone
  CRITICAL: 1.05, // At risk of liquidation
  LIQUIDATION: 1.0, // Will be liquidated
};

/**
 * Calculate health factor
 * HF = (Collateral * Liquidation Threshold) / Debt
 */
export function calculateHealthFactor(
  collateralValueUsd: number,
  debtValueUsd: number,
  liquidationThreshold: number = 0.83 // 83% for most assets
): number {
  if (debtValueUsd === 0) return Infinity;
  return (collateralValueUsd * liquidationThreshold) / debtValueUsd;
}

/**
 * Calculate max additional borrow amount
 */
export function calculateMaxBorrow(
  collateralValueUsd: number,
  currentDebtUsd: number,
  ltv: number = 0.8, // 80% LTV for most assets
  targetHealthFactor: number = HEALTH_FACTOR_THRESHOLDS.SAFE
): number {
  const maxDebt = (collateralValueUsd * ltv) / targetHealthFactor;
  return Math.max(0, maxDebt - currentDebtUsd);
}

/**
 * Calculate liquidation price for ETH collateral
 */
export function calculateLiquidationPrice(
  collateralAmount: number,
  collateralPriceUsd: number,
  debtValueUsd: number,
  liquidationThreshold: number = 0.83
): number {
  if (collateralAmount === 0) return 0;
  // Price at which HF = 1
  return debtValueUsd / (collateralAmount * liquidationThreshold);
}

/**
 * Get health factor status
 */
export function getHealthFactorStatus(
  healthFactor: number
): 'safe' | 'warning' | 'danger' | 'critical' {
  if (healthFactor >= HEALTH_FACTOR_THRESHOLDS.SAFE) return 'safe';
  if (healthFactor >= HEALTH_FACTOR_THRESHOLDS.WARNING) return 'warning';
  if (healthFactor >= HEALTH_FACTOR_THRESHOLDS.DANGER) return 'danger';
  return 'critical';
}

/**
 * Get health factor alert if needed
 */
export function getHealthFactorAlert(
  healthFactor: number
): HealthFactorAlert | null {
  if (healthFactor >= HEALTH_FACTOR_THRESHOLDS.SAFE) return null;

  if (healthFactor < HEALTH_FACTOR_THRESHOLDS.LIQUIDATION) {
    return {
      type: 'critical',
      healthFactor,
      message: 'Position at immediate risk of liquidation!',
      action: {
        label: 'Repay Debt Now',
        handler: () => {}, // Placeholder
      },
    };
  }

  if (healthFactor < HEALTH_FACTOR_THRESHOLDS.DANGER) {
    return {
      type: 'danger',
      healthFactor,
      message: 'Health factor critically low. Add collateral or repay debt.',
      action: {
        label: 'Add Collateral',
        handler: () => {},
      },
    };
  }

  if (healthFactor < HEALTH_FACTOR_THRESHOLDS.WARNING) {
    return {
      type: 'warning',
      healthFactor,
      message: 'Health factor getting low. Consider reducing debt exposure.',
    };
  }

  return null;
}

// ============================================
// RISK ASSESSMENT
// ============================================

/**
 * Protocol risk scores (1-10, higher = riskier)
 */
const PROTOCOL_RISK_SCORES: Record<string, number> = {
  lido: 2, // Battle-tested, largest TVL
  coinbase: 2, // Institutional, centralized but reliable
  aave: 2, // Battle-tested lending
  origin: 5, // Newer, more complex
  etherfi: 4, // Restaking complexity
  morpho: 4, // Newer lending protocol
};

/**
 * Staking type risk scores
 */
const TYPE_RISK_SCORES: Record<string, number> = {
  'liquid-staking': 2,
  lending: 3,
  'liquid-restaking': 5,
  'supercharged-lst': 6,
};

/**
 * Assess overall risk for a staking option
 */
export function assessRisk(
  protocol: string,
  type: string,
  apy: number,
  tvl: number
): RiskAssessment {
  const factors: RiskFactor[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Protocol risk
  const protocolScore = PROTOCOL_RISK_SCORES[protocol.toLowerCase()] || 5;
  factors.push({
    name: 'Protocol Risk',
    level: protocolScore <= 2 ? 'low' : protocolScore <= 5 ? 'medium' : 'high',
    description: `${protocol} has a risk score of ${protocolScore}/10`,
    mitigation: protocolScore > 3 ? 'Consider diversifying across protocols' : undefined,
  });

  // Type risk
  const typeScore = TYPE_RISK_SCORES[type] || 5;
  factors.push({
    name: 'Strategy Type Risk',
    level: typeScore <= 2 ? 'low' : typeScore <= 4 ? 'medium' : 'high',
    description: `${type} strategies have inherent complexity`,
  });

  // APY risk (high APY often = high risk)
  if (apy > 10) {
    factors.push({
      name: 'High APY Risk',
      level: 'high',
      description: 'High yields often indicate higher risk or unsustainable rewards',
      mitigation: 'Monitor for APY sustainability',
    });
    warnings.push('Exceptionally high APY may not be sustainable');
  } else if (apy > 6) {
    factors.push({
      name: 'Elevated APY',
      level: 'medium',
      description: 'Above-average yields may indicate additional risk factors',
    });
  }

  // TVL risk
  if (tvl < 10_000_000) {
    factors.push({
      name: 'Low TVL',
      level: 'medium',
      description: 'Lower TVL means less battle-tested and potentially lower liquidity',
      mitigation: 'Start with smaller positions',
    });
    warnings.push('Lower TVL protocols may have liquidity constraints');
  } else if (tvl > 1_000_000_000) {
    factors.push({
      name: 'High TVL',
      level: 'low',
      description: 'Large TVL indicates market confidence and liquidity',
    });
  }

  // Smart contract risk
  factors.push({
    name: 'Smart Contract Risk',
    level: 'low',
    description: 'All integrated protocols have been audited',
    mitigation: 'Only interact through verified contracts',
  });

  // Calculate overall risk
  const avgScore =
    factors.reduce(
      (sum, f) => sum + (f.level === 'low' ? 1 : f.level === 'medium' ? 2 : 3),
      0
    ) / factors.length;

  const overallRisk: RiskLevel =
    avgScore <= 1.3 ? 'low' : avgScore <= 2 ? 'medium' : 'high';

  // Add recommendations
  if (overallRisk === 'high') {
    recommendations.push('Consider allocating only a small portion of portfolio');
    recommendations.push('Monitor position regularly');
  } else if (overallRisk === 'medium') {
    recommendations.push('Diversify across multiple protocols');
  }

  return {
    overallRisk,
    factors,
    warnings,
    recommendations,
  };
}

/**
 * Format health factor for display
 */
export function formatHealthFactor(hf: number): string {
  if (hf === Infinity) return '∞';
  if (hf > 100) return '>100';
  return hf.toFixed(2);
}

/**
 * Get color for health factor display
 */
export function getHealthFactorColor(hf: number): string {
  const status = getHealthFactorStatus(hf);
  switch (status) {
    case 'safe':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'danger':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

// ============================================
// AAVE-SPECIFIC HELPERS
// ============================================

/**
 * Calculate new health factor after a borrow
 */
export function calculateHFAfterBorrow(
  currentCollateralUsd: number,
  currentDebtUsd: number,
  additionalBorrowUsd: number,
  liquidationThreshold: number = 0.83
): number {
  const newDebt = currentDebtUsd + additionalBorrowUsd;
  return calculateHealthFactor(currentCollateralUsd, newDebt, liquidationThreshold);
}

/**
 * Calculate new health factor after adding collateral
 */
export function calculateHFAfterDeposit(
  currentCollateralUsd: number,
  currentDebtUsd: number,
  additionalCollateralUsd: number,
  liquidationThreshold: number = 0.83
): number {
  const newCollateral = currentCollateralUsd + additionalCollateralUsd;
  return calculateHealthFactor(newCollateral, currentDebtUsd, liquidationThreshold);
}

/**
 * Calculate amount needed to repay to reach target HF
 */
export function calculateRepayAmountForTargetHF(
  collateralValueUsd: number,
  currentDebtUsd: number,
  targetHF: number,
  liquidationThreshold: number = 0.83
): number {
  // Target debt = (Collateral * LT) / Target HF
  const targetDebt = (collateralValueUsd * liquidationThreshold) / targetHF;
  return Math.max(0, currentDebtUsd - targetDebt);
}

/**
 * Check if an Aave position is safe for looping
 */
export function isPositionSafeForLooping(position: AavePosition): boolean {
  // Must have health factor above 2.0 to safely loop
  return position.healthFactor >= HEALTH_FACTOR_THRESHOLDS.SAFE;
}

/**
 * Calculate max loop iterations based on current health factor
 */
export function calculateMaxLoopIterations(
  healthFactor: number,
  ltv: number = 0.8
): number {
  if (healthFactor < HEALTH_FACTOR_THRESHOLDS.SAFE) return 0;

  // Conservative: allow looping while maintaining HF > 1.5
  // Each loop compounds at LTV rate
  let iterations = 0;
  let projectedHF = healthFactor;

  while (projectedHF > HEALTH_FACTOR_THRESHOLDS.WARNING && iterations < 5) {
    projectedHF = projectedHF * (1 - ltv);
    if (projectedHF > HEALTH_FACTOR_THRESHOLDS.WARNING) {
      iterations++;
    }
  }

  return iterations;
}
