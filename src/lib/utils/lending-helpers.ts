/**
 * Lending Helper Functions
 *
 * Utility functions for lending operations
 */

import { LendingMarket, LendingPosition, LendingProtocol } from '@/types/lending';

// =============================================================================
// HEALTH FACTOR UTILITIES
// =============================================================================

export function estimateHealthFactorAfterAction(
  currentHF: number,
  currentSupplyUSD: number,
  currentBorrowUSD: number,
  action: 'supply' | 'withdraw' | 'borrow' | 'repay',
  amountUSD: number,
  ltv: number
): number {
  if (currentHF === Infinity || currentBorrowUSD === 0) {
    if (action === 'borrow') {
      return (currentSupplyUSD * ltv) / amountUSD;
    }
    return Infinity;
  }

  let newSupplyUSD = currentSupplyUSD;
  let newBorrowUSD = currentBorrowUSD;

  switch (action) {
    case 'supply':
      newSupplyUSD += amountUSD;
      break;
    case 'withdraw':
      newSupplyUSD -= amountUSD;
      break;
    case 'borrow':
      newBorrowUSD += amountUSD;
      break;
    case 'repay':
      newBorrowUSD -= amountUSD;
      break;
  }

  if (newBorrowUSD <= 0) return Infinity;
  if (newSupplyUSD <= 0) return 0;

  return (newSupplyUSD * ltv) / newBorrowUSD;
}

export function getHealthFactorStatus(hf: number): {
  status: 'safe' | 'warning' | 'danger' | 'critical' | 'none';
  color: string;
  label: string;
} {
  if (!isFinite(hf) || hf === 0) {
    return { status: 'none', color: 'text-gray-400', label: '∞' };
  }
  if (hf < 1) {
    return { status: 'critical', color: 'text-red-500', label: 'Liquidatable' };
  }
  if (hf < 1.1) {
    return { status: 'critical', color: 'text-red-500', label: 'Extreme Risk' };
  }
  if (hf < 1.3) {
    return { status: 'danger', color: 'text-orange-500', label: 'High Risk' };
  }
  if (hf < 1.5) {
    return { status: 'warning', color: 'text-yellow-500', label: 'Moderate Risk' };
  }
  if (hf < 2) {
    return { status: 'safe', color: 'text-green-400', label: 'Healthy' };
  }
  return { status: 'safe', color: 'text-green-500', label: 'Very Safe' };
}

// =============================================================================
// APY UTILITIES
// =============================================================================

export function calculateProjectedEarnings(
  principalUSD: number,
  apy: number,
  days: number
): number {
  const dailyRate = apy / 365 / 100;
  return principalUSD * dailyRate * days;
}

export function calculateNetAPY(
  supplyUSD: number,
  supplyAPY: number,
  borrowUSD: number,
  borrowAPY: number
): number {
  if (supplyUSD === 0) return 0;

  const supplyYield = supplyUSD * (supplyAPY / 100);
  const borrowCost = borrowUSD * (borrowAPY / 100);
  const netYield = supplyYield - borrowCost;

  return (netYield / supplyUSD) * 100;
}

// =============================================================================
// MARKET COMPARISON
// =============================================================================

export function findBestMarket(
  markets: LendingMarket[],
  assetSymbol: string,
  action: 'supply' | 'borrow'
): LendingMarket | null {
  const filtered = markets.filter(
    (m) =>
      m.assetSymbol === assetSymbol &&
      (action === 'supply' ? m.canSupply : m.canBorrow)
  );

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => {
    const bestRate =
      action === 'supply' ? best.netSupplyAPY : best.netBorrowAPY;
    const currentRate =
      action === 'supply' ? current.netSupplyAPY : current.netBorrowAPY;

    if (action === 'supply') {
      return currentRate > bestRate ? current : best;
    } else {
      return currentRate < bestRate ? current : best;
    }
  });
}

export function compareMarkets(
  market1: LendingMarket,
  market2: LendingMarket,
  action: 'supply' | 'borrow'
): {
  better: LendingMarket;
  worse: LendingMarket;
  difference: number;
} {
  const rate1 =
    action === 'supply' ? market1.netSupplyAPY : market1.netBorrowAPY;
  const rate2 =
    action === 'supply' ? market2.netSupplyAPY : market2.netBorrowAPY;

  const better =
    (action === 'supply' ? rate1 > rate2 : rate1 < rate2) ? market1 : market2;
  const worse = better === market1 ? market2 : market1;
  const difference = Math.abs(rate1 - rate2);

  return { better, worse, difference };
}

// =============================================================================
// POSITION UTILITIES
// =============================================================================

export function calculateUserTVL(positions: LendingPosition[]): number {
  return positions.reduce((sum, pos) => sum + pos.supplyBalanceUSD, 0);
}

export function calculateUserDebt(positions: LendingPosition[]): number {
  return positions.reduce((sum, pos) => sum + pos.borrowBalanceUSD, 0);
}

export function calculateNetWorth(positions: LendingPosition[]): number {
  const supply = calculateUserTVL(positions);
  const borrow = calculateUserDebt(positions);
  return supply - borrow;
}

export function calculateWeightedAvgAPY(
  positions: LendingPosition[],
  type: 'supply' | 'borrow'
): number {
  const relevantPositions = positions.filter((p) =>
    type === 'supply' ? p.supplyBalance > 0n : p.borrowBalance > 0n
  );

  if (relevantPositions.length === 0) return 0;

  const totalValue = relevantPositions.reduce(
    (sum, pos) =>
      sum + (type === 'supply' ? pos.supplyBalanceUSD : pos.borrowBalanceUSD),
    0
  );

  if (totalValue === 0) return 0;

  const weightedSum = relevantPositions.reduce((sum, pos) => {
    const value =
      type === 'supply' ? pos.supplyBalanceUSD : pos.borrowBalanceUSD;
    const apy = type === 'supply' ? pos.currentSupplyAPY : pos.currentBorrowAPY;
    return sum + value * apy;
  }, 0);

  return weightedSum / totalValue;
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

export function formatHealthFactor(hf: number): string {
  if (!isFinite(hf)) return '∞';
  if (hf < 0.01) return '< 0.01';
  if (hf > 1000) return '> 1000';
  return hf.toFixed(2);
}

export function formatAPYWithColor(
  apy: number,
  type: 'supply' | 'borrow'
): {
  formatted: string;
  color: string;
} {
  const formatted = `${apy.toFixed(2)}%`;
  const color = type === 'supply' ? 'text-green-500' : 'text-orange-500';
  return { formatted, color };
}

// =============================================================================
// VALIDATION
// =============================================================================

export function canUserBorrow(
  totalSupplyUSD: number,
  totalBorrowUSD: number,
  newBorrowUSD: number,
  ltv: number
): {
  canBorrow: boolean;
  reason?: string;
  maxBorrowUSD?: number;
} {
  if (totalSupplyUSD === 0) {
    return {
      canBorrow: false,
      reason: 'No collateral supplied',
    };
  }

  const maxBorrowUSD = totalSupplyUSD * ltv;
  const availableBorrowUSD = maxBorrowUSD - totalBorrowUSD;

  if (newBorrowUSD > availableBorrowUSD) {
    return {
      canBorrow: false,
      reason: 'Insufficient collateral',
      maxBorrowUSD: availableBorrowUSD,
    };
  }

  return {
    canBorrow: true,
    maxBorrowUSD: availableBorrowUSD,
  };
}

export function canUserWithdraw(
  supplyBalance: bigint,
  borrowBalanceUSD: number,
  withdrawAmountUSD: number,
  ltv: number
): {
  canWithdraw: boolean;
  reason?: string;
} {
  if (supplyBalance === 0n) {
    return {
      canWithdraw: false,
      reason: 'No balance to withdraw',
    };
  }

  if (borrowBalanceUSD === 0) {
    return { canWithdraw: true };
  }

  const remainingCollateralUSD = Number(supplyBalance) - withdrawAmountUSD;
  const requiredCollateralUSD = borrowBalanceUSD / ltv;

  if (remainingCollateralUSD < requiredCollateralUSD) {
    return {
      canWithdraw: false,
      reason: 'Would cause liquidation',
    };
  }

  return { canWithdraw: true };
}

// =============================================================================
// PROTOCOL UTILITIES
// =============================================================================

export function getProtocolDisplayName(protocol: LendingProtocol): string {
  const names: Record<LendingProtocol, string> = {
    aave: 'Aave V3',
    morpho: 'Morpho Blue',
    compound: 'Compound III',
    moonwell: 'Moonwell',
  };
  return names[protocol];
}

export function getProtocolColor(protocol: LendingProtocol): string {
  const colors: Record<LendingProtocol, string> = {
    aave: '#B6509E',
    morpho: '#0067FF',
    compound: '#00D395',
    moonwell: '#06B6D4',
  };
  return colors[protocol];
}
