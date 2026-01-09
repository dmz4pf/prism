/**
 * Mock Positions Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateMockStakingPositions,
  generateMockStablePositions,
  calculateMockStakingStats,
  calculateMockStableStats,
} from '../mock-positions';
import type { Address } from 'viem';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;
const TEST_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;

describe('Mock Positions Service', () => {
  describe('generateMockStakingPositions', () => {
    it('generates deterministic positions for same address', () => {
      const positions1 = generateMockStakingPositions(TEST_ADDRESS);
      const positions2 = generateMockStakingPositions(TEST_ADDRESS);

      expect(positions1.length).toBe(positions2.length);
      if (positions1.length > 0) {
        expect(positions1[0]?.id).toBe(positions2[0]?.id);
        expect(positions1[0]?.balance).toBe(positions2[0]?.balance);
      }
    });

    it('generates different positions for different addresses', () => {
      const positions1 = generateMockStakingPositions(TEST_ADDRESS);
      const positions2 = generateMockStakingPositions(TEST_ADDRESS_2);

      // Different addresses may have different number of positions
      // or different values
      const sameData =
        positions1.length === positions2.length &&
        positions1.every(
          (p, i) => p.balance === positions2[i]?.balance
        );

      expect(sameData).toBe(false);
    });

    it('respects config options', () => {
      const positions = generateMockStakingPositions(TEST_ADDRESS, {
        includeLido: true,
        includeCoinbase: false,
        includeEtherfi: false,
        includeOrigin: false,
        includeAave: false,
      });

      // Should only have Lido positions (if seed allows)
      const protocols = positions.map((p) => p.protocol);
      expect(protocols.every((p) => p === 'Lido' || protocols.length === 0)).toBe(
        true
      );
    });

    it('generates realistic APYs', () => {
      const positions = generateMockStakingPositions(TEST_ADDRESS);

      for (const pos of positions) {
        // APYs should be between 1% and 15%
        expect(pos.apy).toBeGreaterThanOrEqual(1);
        expect(pos.apy).toBeLessThanOrEqual(15);
      }
    });

    it('generates positive balances and values', () => {
      const positions = generateMockStakingPositions(TEST_ADDRESS);

      for (const pos of positions) {
        expect(parseFloat(pos.balance)).toBeGreaterThan(0);
        expect(pos.balanceUsd).toBeGreaterThan(0);
        expect(pos.earnedTotalUsd).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('generateMockStablePositions', () => {
    it('generates deterministic positions for same address', () => {
      const positions1 = generateMockStablePositions(TEST_ADDRESS);
      const positions2 = generateMockStablePositions(TEST_ADDRESS);

      expect(positions1.length).toBe(positions2.length);
    });

    it('generates realistic stablecoin amounts', () => {
      const positions = generateMockStablePositions(TEST_ADDRESS);

      for (const pos of positions) {
        // Stablecoin amounts should be reasonable ($100 - $50,000)
        expect(pos.supplied.usd).toBeGreaterThan(100);
        expect(pos.supplied.usd).toBeLessThan(50000);
      }
    });

    it('includes proper pool data', () => {
      const positions = generateMockStablePositions(TEST_ADDRESS, {
        includeAave: true,
      });

      for (const pos of positions) {
        expect(pos.pool).toBeDefined();
        expect(pos.pool.protocol).toBeDefined();
        expect(pos.pool.asset.symbol).toBeDefined();
        expect(pos.pool.apy.net).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateMockStakingStats', () => {
    it('calculates correct totals', () => {
      const positions = generateMockStakingPositions(TEST_ADDRESS);
      const stats = calculateMockStakingStats(positions);

      const expectedTotal = positions.reduce((sum, p) => sum + p.balanceUsd, 0);
      expect(stats.totalValueUsd).toBeCloseTo(expectedTotal, 2);
    });

    it('calculates weighted average APY correctly', () => {
      const positions = generateMockStakingPositions(TEST_ADDRESS);
      const stats = calculateMockStakingStats(positions);

      if (positions.length > 0) {
        const totalValue = positions.reduce((sum, p) => sum + p.balanceUsd, 0);
        const weightedSum = positions.reduce(
          (sum, p) => sum + p.apy * p.balanceUsd,
          0
        );
        const expectedAvg = weightedSum / totalValue;

        expect(stats.weightedAvgAPY).toBeCloseTo(expectedAvg, 2);
      }
    });

    it('handles empty positions array', () => {
      const stats = calculateMockStakingStats([]);

      expect(stats.totalValueUsd).toBe(0);
      expect(stats.totalEarnedUsd).toBe(0);
      expect(stats.weightedAvgAPY).toBe(0);
      expect(stats.positionsCount).toBe(0);
    });
  });

  describe('calculateMockStableStats', () => {
    it('calculates correct totals', () => {
      const positions = generateMockStablePositions(TEST_ADDRESS);
      const stats = calculateMockStableStats(positions);

      const expectedTotal = positions.reduce((sum, p) => sum + p.supplied.usd, 0);
      expect(stats.totalValue).toBeCloseTo(expectedTotal, 2);
    });

    it('handles empty positions array', () => {
      const stats = calculateMockStableStats([]);

      expect(stats.totalValue).toBe(0);
      expect(stats.totalEarnings).toBe(0);
      expect(stats.avgApy).toBe(0);
      expect(stats.positionsCount).toBe(0);
    });
  });
});
