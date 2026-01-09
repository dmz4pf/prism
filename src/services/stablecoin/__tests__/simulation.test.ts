/**
 * Transaction Simulation Service Tests
 *
 * Tests for deposit/withdraw simulation across all supported protocols.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MOCK_USER_ADDRESS, MOCK_POOL_ADDRESS, MOCK_TOKEN_ADDRESS } from '@/test/setup';
import type { SimulationParams } from '../simulation';

// =============================================================================
// MOCKS
// =============================================================================

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => mockClient),
  http: vi.fn(),
  encodeFunctionData: vi.fn(() => '0x1234'),
  decodeFunctionResult: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

// Mock contract ABIs
vi.mock('@/contracts/abis/stablecoin-protocols', () => ({
  AAVE_V3_POOL_ABI: [],
  ERC4626_ABI: [],
  MOONWELL_MTOKEN_ABI: [],
  COMPOUND_COMET_ABI: [],
  ERC20_ABI: [],
}));

// Mock addresses
vi.mock('@/contracts/addresses/stablecoin-protocols', () => ({
  AAVE_V3_ADDRESSES: {
    Pool: '0xPool',
    aUSDC: '0xaUSDC',
    aUSDbC: '0xaUSDbC',
    aDAI: '0xaDAI',
  },
  STABLECOIN_ADDRESSES: {
    USDC: '0xUSDC',
    USDbC: '0xUSDbC',
    DAI: '0xDAI',
  },
}));

// Mock client functions
const mockClient = {
  readContract: vi.fn(),
  call: vi.fn(),
  estimateGas: vi.fn(),
  getGasPrice: vi.fn(),
};

// =============================================================================
// IMPORTS (after mocks)
// =============================================================================

// Dynamic import to ensure mocks are applied
let simulateDeposit: (params: SimulationParams, chainId?: number) => Promise<any>;
let simulateWithdraw: (params: SimulationParams, chainId?: number) => Promise<any>;

beforeEach(async () => {
  // Reset all mocks
  vi.clearAllMocks();

  // Default mock implementations
  mockClient.readContract.mockResolvedValue(BigInt(1000000000000)); // 1M tokens
  mockClient.call.mockResolvedValue('0x');
  mockClient.estimateGas.mockResolvedValue(BigInt(150000));
  mockClient.getGasPrice.mockResolvedValue(BigInt(1000000000)); // 1 gwei

  // Import functions
  const module = await import('../simulation');
  simulateDeposit = module.simulateDeposit;
  simulateWithdraw = module.simulateWithdraw;
});

// =============================================================================
// TEST DATA
// =============================================================================

const baseParams: SimulationParams = {
  protocol: 'aave',
  poolAddress: MOCK_POOL_ADDRESS as `0x${string}`,
  assetAddress: MOCK_TOKEN_ADDRESS as `0x${string}`,
  amount: BigInt(1000000), // 1 USDC (6 decimals)
  userAddress: MOCK_USER_ADDRESS as `0x${string}`,
  decimals: 6,
};

// =============================================================================
// TESTS
// =============================================================================

describe('simulateDeposit', () => {
  describe('balance checks', () => {
    it('should fail if user has insufficient balance', async () => {
      // Mock insufficient balance
      mockClient.readContract.mockResolvedValueOnce(BigInt(100)); // Only 0.0001 tokens

      const result = await simulateDeposit(baseParams);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain("don't have enough tokens");
      expect(result.gasEstimate).toBe(0n);
    });

    it('should succeed with sufficient balance', async () => {
      // Mock sufficient balance
      mockClient.readContract.mockResolvedValueOnce(BigInt(10000000)); // 10 tokens

      const result = await simulateDeposit(baseParams);

      expect(result.success).toBe(true);
      expect(result.gasEstimate).toBeGreaterThan(0n);
    });
  });

  describe('allowance checks', () => {
    it('should add warning if allowance is insufficient', async () => {
      // Mock: balance OK, allowance low
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance: 10 tokens
        .mockResolvedValueOnce(BigInt(100)); // Allowance: 0.0001 tokens

      const result = await simulateDeposit(baseParams);

      expect(result.warnings).toContain('Approval transaction required before deposit');
    });

    it('should not warn if allowance is sufficient', async () => {
      // Mock: balance OK, allowance OK
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance
        .mockResolvedValueOnce(BigInt(10000000)); // Allowance

      const result = await simulateDeposit(baseParams);

      expect(result.warnings).not.toContain('Approval transaction required before deposit');
    });
  });

  describe('protocol-specific deposits', () => {
    it('should handle Aave deposits', async () => {
      const params = { ...baseParams, protocol: 'aave' as const };
      const result = await simulateDeposit(params);

      expect(result.success).toBe(true);
      expect(result.expectedOutput).toBe(params.amount); // 1:1 for Aave
    });

    it('should handle Morpho deposits (ERC-4626)', async () => {
      const params = { ...baseParams, protocol: 'morpho' as const };

      // Mock previewDeposit and maxDeposit
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance
        .mockResolvedValueOnce(BigInt(10000000)) // Allowance
        .mockResolvedValueOnce(BigInt(950000)) // previewDeposit shares
        .mockResolvedValueOnce(BigInt(1000000000)); // maxDeposit

      const result = await simulateDeposit(params);

      expect(result.success).toBe(true);
      expect(result.expectedOutput).toBe(BigInt(950000)); // Shares from preview
    });

    it('should handle Moonwell deposits', async () => {
      const params = { ...baseParams, protocol: 'moonwell' as const };

      // Mock exchangeRateStored
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance
        .mockResolvedValueOnce(BigInt(10000000)) // Allowance
        .mockResolvedValueOnce(BigInt('200000000000000000')); // Exchange rate

      const result = await simulateDeposit(params);

      expect(result.success).toBe(true);
    });

    it('should handle Compound V3 deposits', async () => {
      const params = { ...baseParams, protocol: 'compound' as const };
      const result = await simulateDeposit(params);

      expect(result.success).toBe(true);
      expect(result.expectedOutput).toBe(params.amount); // 1:1 for Compound
    });

    it('should handle Fluid deposits (ERC-4626)', async () => {
      const params = { ...baseParams, protocol: 'fluid' as const };

      // Mock previewDeposit and maxDeposit
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance
        .mockResolvedValueOnce(BigInt(10000000)) // Allowance
        .mockResolvedValueOnce(BigInt(980000)) // previewDeposit shares
        .mockResolvedValueOnce(BigInt(1000000000)); // maxDeposit

      const result = await simulateDeposit(params);

      expect(result.success).toBe(true);
    });
  });

  describe('supply cap handling', () => {
    it('should fail if ERC-4626 pool has reached capacity', async () => {
      const params = { ...baseParams, protocol: 'morpho' as const };

      // Mock: maxDeposit is 0 (pool full)
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(10000000)) // Balance
        .mockResolvedValueOnce(BigInt(10000000)) // Allowance
        .mockResolvedValueOnce(BigInt(950000)) // previewDeposit
        .mockResolvedValueOnce(BigInt(0)); // maxDeposit = 0

      const result = await simulateDeposit(params);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain('capacity');
    });
  });

  describe('error handling', () => {
    it('should handle simulation revert', async () => {
      mockClient.call.mockRejectedValueOnce(new Error('execution reverted: PAUSED'));

      const result = await simulateDeposit(baseParams);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain('paused');
    });

    it('should handle network errors gracefully', async () => {
      mockClient.readContract.mockRejectedValueOnce(new Error('network error'));

      const result = await simulateDeposit(baseParams);

      expect(result.success).toBe(false);
      expect(result.revertReason).toBeDefined();
    });

    it('should reject unsupported protocols', async () => {
      const params = { ...baseParams, protocol: 'unknown' as any };

      const result = await simulateDeposit(params);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain('Unsupported');
    });
  });
});

describe('simulateWithdraw', () => {
  describe('balance checks', () => {
    it('should fail if user has no position to withdraw', async () => {
      const params = { ...baseParams, protocol: 'compound' as const };

      // Mock: user balance in pool is 0
      mockClient.readContract.mockResolvedValueOnce(BigInt(0));

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain('withdraw');
    });

    it('should fail if withdrawing more than position', async () => {
      const params = {
        ...baseParams,
        protocol: 'compound' as const,
        amount: BigInt(10000000), // 10 tokens
      };

      // Mock: user has only 1 token
      mockClient.readContract.mockResolvedValueOnce(BigInt(1000000));

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(false);
    });
  });

  describe('protocol-specific withdrawals', () => {
    it('should handle Aave withdrawals', async () => {
      // Use mocked USDC address that matches STABLECOIN_ADDRESSES
      const params = {
        ...baseParams,
        protocol: 'aave' as const,
        assetAddress: '0xUSDC' as `0x${string}`,
      };

      // Mock aToken balance
      mockClient.readContract.mockResolvedValueOnce(BigInt(10000000));

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(true);
      expect(result.expectedOutput).toBe(params.amount);
    });

    it('should handle ERC-4626 withdrawals (Morpho/Fluid)', async () => {
      const params = { ...baseParams, protocol: 'morpho' as const };

      // Mock maxWithdraw and previewWithdraw
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(5000000)) // maxWithdraw
        .mockResolvedValueOnce(BigInt(1050000)); // previewWithdraw (shares to burn)

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(true);
    });

    it('should handle Moonwell withdrawals', async () => {
      const params = { ...baseParams, protocol: 'moonwell' as const };

      // Mock mToken balance and exchange rate
      mockClient.readContract
        .mockResolvedValueOnce(BigInt('5000000000000000000')) // mToken balance
        .mockResolvedValueOnce(BigInt('200000000000000000')); // Exchange rate

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(true);
    });

    it('should handle Compound V3 withdrawals', async () => {
      const params = { ...baseParams, protocol: 'compound' as const };

      // Mock balance in Comet
      mockClient.readContract.mockResolvedValueOnce(BigInt(10000000));

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(true);
    });
  });

  describe('liquidity checks', () => {
    it('should handle insufficient pool liquidity', async () => {
      const params = {
        ...baseParams,
        protocol: 'morpho' as const,
        amount: BigInt(5000000),
      };

      // Reset and mock: maxWithdraw is less than requested
      mockClient.readContract.mockReset();
      mockClient.readContract.mockResolvedValue(BigInt(1000000)); // maxWithdraw = 1 token (less than amount)

      const result = await simulateWithdraw(params);

      expect(result.success).toBe(false);
      expect(result.revertReason).toContain('liquidity');
    });
  });
});

describe('gas estimation', () => {
  it('should estimate gas for successful transactions', async () => {
    const result = await simulateDeposit(baseParams);

    expect(result.success).toBe(true);
    expect(result.gasEstimate).toBe(BigInt(150000));
  });

  it('should return 0 gas for failed transactions', async () => {
    mockClient.readContract.mockResolvedValueOnce(BigInt(0)); // Insufficient balance

    const result = await simulateDeposit(baseParams);

    expect(result.success).toBe(false);
    expect(result.gasEstimate).toBe(0n);
  });
});
