import type { Address } from 'viem';

// ============================================
// SMART WALLET TYPES
// ============================================

/**
 * Smart wallet state
 */
export interface SmartWallet {
  /** Counterfactual smart wallet address */
  address: Address;
  /** EOA that owns this smart wallet */
  owner: Address;
  /** Whether the contract is deployed on-chain */
  isDeployed: boolean;
}

/**
 * Token balance with metadata
 */
export interface TokenBalance {
  /** Token contract address (null for native ETH) */
  address: Address | null;
  /** Token symbol (e.g., "ETH", "USDC") */
  symbol: string;
  /** Token name (e.g., "Ethereum", "USD Coin") */
  name: string;
  /** Number of decimals */
  decimals: number;
  /** Raw balance as bigint */
  balanceRaw: bigint;
  /** Formatted balance as string */
  balance: string;
  /** USD value */
  balanceUsd: number;
  /** Token price in USD */
  priceUsd: number;
  /** Logo URL */
  logoUrl?: string;
  /** Is this a spam token */
  isSpam?: boolean;
}

/**
 * Swap quote from DEX aggregator
 */
export interface SwapQuote {
  /** Token being sold */
  sellToken: Address;
  /** Token being bought */
  buyToken: Address;
  /** Amount being sold (raw) */
  sellAmount: bigint;
  /** Amount being bought (raw) */
  buyAmount: bigint;
  /** Price (buyAmount / sellAmount) */
  price: string;
  /** Price impact percentage */
  priceImpact: number;
  /** Gas estimate in wei */
  gasEstimate: bigint;
  /** Gas estimate in USD */
  gasEstimateUsd: number;
  /** Transaction data for execution */
  transaction: {
    to: Address;
    data: `0x${string}`;
    value: bigint;
  };
  /** Allowance target for approval */
  allowanceTarget: Address;
  /** Sources used for the swap */
  sources: Array<{ name: string; proportion: string }>;
}

/**
 * Transaction status
 */
export interface TransactionStatus {
  hash: `0x${string}`;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  confirmations: number;
  error?: string;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseSmartWalletReturn {
  smartWallet: SmartWallet | null;
  isConnected: boolean;
  isInitializing: boolean;
  error: Error | null;
  sendTransaction: (tx: {
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }) => Promise<`0x${string}`>;
  sendBatchedTransactions: (txs: Array<{
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }>) => Promise<`0x${string}`>;
}

export interface UseWalletBalancesReturn {
  balances: TokenBalance[];
  totalValueUsd: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseSwapReturn {
  quote: SwapQuote | null;
  isLoadingQuote: boolean;
  isExecuting: boolean;
  error: Error | null;
  getQuote: (params: {
    sellToken: Address;
    buyToken: Address;
    sellAmount: bigint;
  }) => Promise<SwapQuote>;
  executeSwap: (quote: SwapQuote) => Promise<`0x${string}`>;
}
