/**
 * Vitest Test Setup
 *
 * Configures the test environment with global mocks and utilities.
 */

import { vi, beforeAll, afterEach } from 'vitest';

// =============================================================================
// ENVIRONMENT MOCKS
// =============================================================================

// Mock environment variables
process.env.NEXT_PUBLIC_BASE_RPC = 'https://mainnet.base.org';
process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

// =============================================================================
// GLOBAL MOCKS
// =============================================================================

// Mock window.matchMedia for responsive components
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// VIEM CLIENT MOCK
// =============================================================================

/**
 * Creates a mock viem public client for testing
 */
export function createMockPublicClient(overrides: Record<string, unknown> = {}) {
  return {
    readContract: vi.fn(),
    call: vi.fn(),
    estimateGas: vi.fn(),
    getGasPrice: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Wait for a condition to be true (useful for async tests)
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Mock address for testing
 */
export const MOCK_USER_ADDRESS = '0x1234567890123456789012345678901234567890';
export const MOCK_POOL_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
export const MOCK_TOKEN_ADDRESS = '0xFEDCBA0987654321FEDCBA0987654321FEDCBA09';
