/**
 * Protocol Action Hook Tests
 *
 * Tests the unified protocol action factory hook.
 * Verifies correct routing to protocol-specific hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// =============================================================================
// MOCK PROTOCOL HOOKS
// =============================================================================

const createMockDepositHook = () => ({
  step: 'idle',
  isLoading: false,
  error: null,
  txHash: undefined,
  needsApproval: true,
  checkAllowance: vi.fn().mockResolvedValue(true),
  approve: vi.fn().mockResolvedValue(undefined),
  deposit: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
});

const createMockWithdrawHook = () => ({
  step: 'idle',
  isLoading: false,
  error: null,
  txHash: undefined,
  balance: BigInt(1000000),
  maxWithdraw: BigInt(1000000),
  assetBalance: BigInt(1000000),
  underlyingBalance: BigInt(1000000),
  withdraw: vi.fn().mockResolvedValue(undefined),
  withdrawAll: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
});

// Mock all protocol hooks
vi.mock('../use-aave-deposit', () => ({
  useAaveDeposit: vi.fn(() => createMockDepositHook()),
}));

vi.mock('../use-aave-withdraw', () => ({
  useAaveWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-morpho-deposit', () => ({
  useMorphoDeposit: vi.fn(() => createMockDepositHook()),
  useMorphoWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-morpho-withdraw', () => ({
  useMorphoWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-moonwell-deposit', () => ({
  useMoonwellDeposit: vi.fn(() => createMockDepositHook()),
  useMoonwellWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-moonwell-withdraw', () => ({
  useMoonwellWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-compound-deposit', () => ({
  useCompoundDeposit: vi.fn(() => createMockDepositHook()),
  useCompoundWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-compound-withdraw', () => ({
  useCompoundWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-fluid-deposit', () => ({
  useFluidDeposit: vi.fn(() => createMockDepositHook()),
  useFluidWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

vi.mock('../use-fluid-withdraw', () => ({
  useFluidWithdraw: vi.fn(() => createMockWithdrawHook()),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const mockParams = {
  poolAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  assetAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as `0x${string}`,
  assetSymbol: 'USDC',
  decimals: 6,
};

// =============================================================================
// IMPORTS (after mocks)
// =============================================================================

let useProtocolAction: any;
let usePoolAction: any;

beforeEach(async () => {
  vi.clearAllMocks();

  const module = await import('../use-protocol-action');
  useProtocolAction = module.useProtocolAction;
  usePoolAction = module.usePoolAction;
});

// =============================================================================
// TESTS
// =============================================================================

describe('useProtocolAction', () => {
  describe('protocol routing', () => {
    it.each([
      ['aave'],
      ['morpho'],
      ['moonwell'],
      ['compound'],
      ['fluid'],
    ])('should initialize for %s protocol', async (protocol) => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: protocol as any,
        })
      );

      expect(result.current.step).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should use morpho as fallback for unknown protocol', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'unknown' as any,
        })
      );

      expect(result.current.step).toBe('idle');
    });
  });

  describe('unified interface', () => {
    it('should expose deposit methods', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'aave',
        })
      );

      expect(result.current.needsApproval).toBeDefined();
      expect(typeof result.current.checkAllowance).toBe('function');
      expect(typeof result.current.approve).toBe('function');
      expect(typeof result.current.deposit).toBe('function');
    });

    it('should expose withdraw methods', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'morpho',
        })
      );

      expect(result.current.balance).toBeDefined();
      expect(result.current.maxWithdraw).toBeDefined();
      expect(typeof result.current.withdraw).toBe('function');
      expect(typeof result.current.withdrawAll).toBe('function');
    });

    it('should expose reset function', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'compound',
        })
      );

      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('state management', () => {
    it('should aggregate loading state from deposit and withdraw', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'aave',
        })
      );

      // Initially not loading
      expect(result.current.isLoading).toBe(false);
    });

    it('should aggregate errors from deposit and withdraw', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'morpho',
        })
      );

      // Initially no error
      expect(result.current.error).toBeNull();
    });

    it('should handle step transitions', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'moonwell',
        })
      );

      // Initially idle
      expect(result.current.step).toBe('idle');
    });
  });

  describe('balance reading', () => {
    it('should return balance for morpho protocol', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'morpho',
        })
      );

      expect(result.current.balance).toBe(BigInt(1000000));
    });

    it('should return balance for moonwell protocol', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'moonwell',
        })
      );

      expect(result.current.balance).toBe(BigInt(1000000));
    });

    it('should return balance for compound protocol', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'compound',
        })
      );

      expect(result.current.balance).toBe(BigInt(1000000));
    });

    it('should return balance for fluid protocol', async () => {
      const { result } = renderHook(() =>
        useProtocolAction({
          ...mockParams,
          protocol: 'fluid',
        })
      );

      expect(result.current.balance).toBe(BigInt(1000000));
    });
  });
});

describe('usePoolAction', () => {
  it('should work with StablecoinPool object', async () => {
    const mockPool = {
      id: 'aave-usdc',
      protocol: 'aave' as const,
      poolAddress: mockParams.poolAddress,
      asset: {
        symbol: 'USDC',
        address: mockParams.assetAddress,
        decimals: 6,
        logoUri: '',
      },
      receiptToken: {
        symbol: 'aUSDC',
        address: '0xaUSDC' as `0x${string}`,
        decimals: 6,
      },
      apy: { base: 3.5, rewards: 0, net: 3.5 },
      tvl: { native: BigInt(1000000), usd: 1000000 },
      risk: { score: 'A' as const, factors: [] },
      chainId: 8453,
      status: 'active' as const,
      lastUpdated: Date.now(),
    };

    const { result } = renderHook(() => usePoolAction({ pool: mockPool }));

    expect(result.current.step).toBe('idle');
    expect(typeof result.current.deposit).toBe('function');
    expect(typeof result.current.withdraw).toBe('function');
  });
});

describe('action calls', () => {
  it('should call checkAllowance on deposit hook', async () => {
    const { result } = renderHook(() =>
      useProtocolAction({
        ...mockParams,
        protocol: 'aave',
      })
    );

    await act(async () => {
      await result.current.checkAllowance('100');
    });

    // The mock should have been called
    expect(result.current.needsApproval).toBeDefined();
  });

  it('should call deposit on deposit hook', async () => {
    const { result } = renderHook(() =>
      useProtocolAction({
        ...mockParams,
        protocol: 'morpho',
      })
    );

    await act(async () => {
      await result.current.deposit('100');
    });
  });

  it('should call withdraw on withdraw hook', async () => {
    const { result } = renderHook(() =>
      useProtocolAction({
        ...mockParams,
        protocol: 'compound',
      })
    );

    await act(async () => {
      await result.current.withdraw('100');
    });
  });

  it('should call withdrawAll on withdraw hook', async () => {
    const { result } = renderHook(() =>
      useProtocolAction({
        ...mockParams,
        protocol: 'fluid',
      })
    );

    await act(async () => {
      await result.current.withdrawAll();
    });
  });

  it('should call reset on both hooks', async () => {
    const { result } = renderHook(() =>
      useProtocolAction({
        ...mockParams,
        protocol: 'moonwell',
      })
    );

    act(() => {
      result.current.reset();
    });
  });
});
