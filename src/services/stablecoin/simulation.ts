/**
 * Transaction Simulation Service
 *
 * Simulates stablecoin deposits/withdrawals before execution to:
 * 1. Validate the transaction will succeed
 * 2. Get accurate gas estimates
 * 3. Detect potential issues (insufficient balance, paused pool, etc.)
 * 4. Provide user-friendly error messages
 *
 * Uses eth_call to simulate without broadcasting
 */

import { createPublicClient, http, encodeFunctionData, decodeFunctionResult, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  ProtocolName,
  StablecoinPool,
} from '@/types/stablecoin';
import {
  AAVE_V3_POOL_ABI,
  ERC4626_ABI,
  MOONWELL_MTOKEN_ABI,
  COMPOUND_COMET_ABI,
  ERC20_ABI,
} from '@/contracts/abis/stablecoin-protocols';
import {
  AAVE_V3_ADDRESSES,
  STABLECOIN_ADDRESSES,
} from '@/contracts/addresses/stablecoin-protocols';

// =============================================================================
// TYPES
// =============================================================================

export interface SimulationResult {
  success: boolean;
  gasEstimate: bigint;
  expectedOutput: bigint; // Shares for deposit, assets for withdraw
  revertReason?: string;
  warnings: string[];
  // Additional metadata
  effectiveApy?: number;
  priceImpact?: number;
}

export interface SimulationParams {
  protocol: ProtocolName;
  poolAddress: Address;
  assetAddress: Address;
  amount: bigint;
  userAddress: Address;
  decimals: number;
}

// Common revert reasons and their user-friendly messages
const REVERT_MESSAGES: Record<string, string> = {
  'INSUFFICIENT_BALANCE': 'You don\'t have enough tokens to complete this transaction',
  'ALLOWANCE_TOO_LOW': 'You need to approve the protocol to spend your tokens first',
  'SUPPLY_CAP_EXCEEDED': 'This pool has reached its maximum capacity',
  'PAUSED': 'This pool is currently paused for deposits',
  'TRANSFER_FAILED': 'Token transfer failed - check your balance',
  'ZERO_AMOUNT': 'Amount must be greater than zero',
  'INVALID_AMOUNT': 'The amount entered is invalid',
  'MARKET_NOT_LISTED': 'This market is not active',
  'WITHDRAW_TOO_MUCH': 'Cannot withdraw more than your balance',
  'INSUFFICIENT_LIQUIDITY': 'Not enough liquidity in the pool for this withdrawal',
};

// =============================================================================
// PUBLIC CLIENT SETUP
// =============================================================================

function getPublicClient(chainId: number) {
  const chain = chainId === 8453 ? base : baseSepolia;
  const rpcUrl = chainId === 8453
    ? process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
    : process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

// =============================================================================
// DEPOSIT SIMULATION
// =============================================================================

/**
 * Simulate a deposit transaction
 */
export async function simulateDeposit(
  params: SimulationParams,
  chainId: number = 8453
): Promise<SimulationResult> {
  const client = getPublicClient(chainId);
  const warnings: string[] = [];

  try {
    // First check user's token balance
    const balance = await client.readContract({
      address: params.assetAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [params.userAddress],
    }) as bigint;

    if (balance < params.amount) {
      return {
        success: false,
        gasEstimate: 0n,
        expectedOutput: 0n,
        revertReason: REVERT_MESSAGES['INSUFFICIENT_BALANCE'],
        warnings: [],
      };
    }

    // Check allowance
    const allowance = await checkAllowance(
      client,
      params.assetAddress,
      params.userAddress,
      params.poolAddress
    );

    if (allowance < params.amount) {
      warnings.push('Approval transaction required before deposit');
    }

    // Protocol-specific simulation
    let result: SimulationResult;

    switch (params.protocol) {
      case 'aave':
        result = await simulateAaveDeposit(client, params);
        break;
      case 'morpho':
      case 'fluid':
        result = await simulateERC4626Deposit(client, params);
        break;
      case 'moonwell':
        result = await simulateMoonwellDeposit(client, params);
        break;
      case 'compound':
        result = await simulateCompoundDeposit(client, params);
        break;
      default:
        throw new Error(`Unsupported protocol: ${params.protocol}`);
    }

    return {
      ...result,
      warnings: [...warnings, ...result.warnings],
    };
  } catch (error) {
    return parseSimulationError(error, 'deposit');
  }
}

/**
 * Simulate a withdrawal transaction
 */
export async function simulateWithdraw(
  params: SimulationParams,
  chainId: number = 8453
): Promise<SimulationResult> {
  const client = getPublicClient(chainId);
  const warnings: string[] = [];

  try {
    // Protocol-specific simulation
    let result: SimulationResult;

    switch (params.protocol) {
      case 'aave':
        result = await simulateAaveWithdraw(client, params);
        break;
      case 'morpho':
      case 'fluid':
        result = await simulateERC4626Withdraw(client, params);
        break;
      case 'moonwell':
        result = await simulateMoonwellWithdraw(client, params);
        break;
      case 'compound':
        result = await simulateCompoundWithdraw(client, params);
        break;
      default:
        throw new Error(`Unsupported protocol: ${params.protocol}`);
    }

    return {
      ...result,
      warnings: [...warnings, ...result.warnings],
    };
  } catch (error) {
    return parseSimulationError(error, 'withdraw');
  }
}

// =============================================================================
// PROTOCOL-SPECIFIC SIMULATIONS
// =============================================================================

async function simulateAaveDeposit(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Encode the supply call
  const data = encodeFunctionData({
    abi: AAVE_V3_POOL_ABI,
    functionName: 'supply',
    args: [params.assetAddress, params.amount, params.userAddress, 0],
  });

  // Simulate with eth_call
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  // For Aave, expected output equals input (1:1 aToken)
  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

async function simulateAaveWithdraw(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Check aToken balance
  const aTokenAddress = await getAaveATokenAddress(client, params.assetAddress);
  const aTokenBalance = await client.readContract({
    address: aTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [params.userAddress],
  }) as bigint;

  if (aTokenBalance < params.amount) {
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: REVERT_MESSAGES['WITHDRAW_TOO_MUCH'],
      warnings: [],
    };
  }

  // Encode the withdraw call
  const data = encodeFunctionData({
    abi: AAVE_V3_POOL_ABI,
    functionName: 'withdraw',
    args: [params.assetAddress, params.amount, params.userAddress],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

async function simulateERC4626Deposit(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Get preview of shares
  const previewShares = await client.readContract({
    address: params.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'previewDeposit',
    args: [params.amount],
  }) as bigint;

  // Check max deposit
  const maxDeposit = await client.readContract({
    address: params.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'maxDeposit',
    args: [params.userAddress],
  }) as bigint;

  if (params.amount > maxDeposit) {
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: REVERT_MESSAGES['SUPPLY_CAP_EXCEEDED'],
      warnings: [],
    };
  }

  // Encode deposit call
  const data = encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'deposit',
    args: [params.amount, params.userAddress],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: previewShares,
    warnings,
  };
}

async function simulateERC4626Withdraw(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Check max withdraw
  const maxWithdraw = await client.readContract({
    address: params.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'maxWithdraw',
    args: [params.userAddress],
  }) as bigint;

  if (params.amount > maxWithdraw) {
    if (maxWithdraw === 0n) {
      return {
        success: false,
        gasEstimate: 0n,
        expectedOutput: 0n,
        revertReason: 'You have no balance to withdraw',
        warnings: [],
      };
    }
    warnings.push(`Maximum withdrawable: ${maxWithdraw.toString()}`);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: REVERT_MESSAGES['INSUFFICIENT_LIQUIDITY'],
      warnings,
    };
  }

  // Get preview of shares to burn
  const previewShares = await client.readContract({
    address: params.poolAddress,
    abi: ERC4626_ABI,
    functionName: 'previewWithdraw',
    args: [params.amount],
  }) as bigint;

  // Encode withdraw call
  const data = encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'withdraw',
    args: [params.amount, params.userAddress, params.userAddress],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

async function simulateMoonwellDeposit(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Get exchange rate to preview mTokens
  const exchangeRate = await client.readContract({
    address: params.poolAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'exchangeRateStored',
    args: [],
  }) as bigint;

  // Calculate expected mTokens (amount * 1e18 / exchangeRate)
  const expectedMTokens = (params.amount * BigInt(1e18)) / exchangeRate;

  // Encode mint call
  const data = encodeFunctionData({
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'mint',
    args: [params.amount],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: expectedMTokens,
    warnings,
  };
}

async function simulateMoonwellWithdraw(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Check mToken balance
  const mTokenBalance = await client.readContract({
    address: params.poolAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'balanceOf',
    args: [params.userAddress],
  }) as bigint;

  // Get exchange rate
  const exchangeRate = await client.readContract({
    address: params.poolAddress,
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'exchangeRateStored',
    args: [],
  }) as bigint;

  // Calculate underlying balance
  const underlyingBalance = (mTokenBalance * exchangeRate) / BigInt(1e18);

  if (params.amount > underlyingBalance) {
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: REVERT_MESSAGES['WITHDRAW_TOO_MUCH'],
      warnings: [],
    };
  }

  // Encode redeemUnderlying call
  const data = encodeFunctionData({
    abi: MOONWELL_MTOKEN_ABI,
    functionName: 'redeemUnderlying',
    args: [params.amount],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

async function simulateCompoundDeposit(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Encode supply call
  const data = encodeFunctionData({
    abi: COMPOUND_COMET_ABI,
    functionName: 'supply',
    args: [params.assetAddress, params.amount],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  // Compound V3: 1:1 for base asset
  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

async function simulateCompoundWithdraw(
  client: ReturnType<typeof getPublicClient>,
  params: SimulationParams
): Promise<SimulationResult> {
  const warnings: string[] = [];

  // Check balance in Compound
  const balance = await client.readContract({
    address: params.poolAddress,
    abi: COMPOUND_COMET_ABI,
    functionName: 'balanceOf',
    args: [params.userAddress],
  }) as bigint;

  if (params.amount > balance) {
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: REVERT_MESSAGES['WITHDRAW_TOO_MUCH'],
      warnings: [],
    };
  }

  // Encode withdraw call
  const data = encodeFunctionData({
    abi: COMPOUND_COMET_ABI,
    functionName: 'withdraw',
    args: [params.assetAddress, params.amount],
  });

  // Simulate
  try {
    await client.call({
      account: params.userAddress,
      to: params.poolAddress,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      gasEstimate: 0n,
      expectedOutput: 0n,
      revertReason: parseRevertReason(errorMessage),
      warnings: [],
    };
  }

  // Estimate gas
  const gasEstimate = await client.estimateGas({
    account: params.userAddress,
    to: params.poolAddress,
    data,
  });

  return {
    success: true,
    gasEstimate,
    expectedOutput: params.amount,
    warnings,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function checkAllowance(
  client: ReturnType<typeof getPublicClient>,
  tokenAddress: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  try {
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    });
    return allowance as bigint;
  } catch {
    return 0n;
  }
}

async function getAaveATokenAddress(
  client: ReturnType<typeof getPublicClient>,
  assetAddress: Address
): Promise<Address> {
  // Map known assets to aTokens
  const assetLower = assetAddress.toLowerCase();
  if (assetLower === STABLECOIN_ADDRESSES.USDC.toLowerCase()) {
    return AAVE_V3_ADDRESSES.aUSDC;
  }
  if (assetLower === STABLECOIN_ADDRESSES.USDbC.toLowerCase()) {
    return AAVE_V3_ADDRESSES.aUSDbC;
  }
  if (assetLower === STABLECOIN_ADDRESSES.DAI.toLowerCase()) {
    return AAVE_V3_ADDRESSES.aDAI;
  }
  throw new Error(`Unknown Aave asset: ${assetAddress}`);
}

function parseRevertReason(error: string): string {
  // Check for known error patterns
  const errorLower = error.toLowerCase();

  if (errorLower.includes('insufficient') || errorLower.includes('balance')) {
    return REVERT_MESSAGES['INSUFFICIENT_BALANCE'];
  }
  if (errorLower.includes('allowance')) {
    return REVERT_MESSAGES['ALLOWANCE_TOO_LOW'];
  }
  if (errorLower.includes('cap') || errorLower.includes('exceeded')) {
    return REVERT_MESSAGES['SUPPLY_CAP_EXCEEDED'];
  }
  if (errorLower.includes('paused')) {
    return REVERT_MESSAGES['PAUSED'];
  }
  if (errorLower.includes('transfer')) {
    return REVERT_MESSAGES['TRANSFER_FAILED'];
  }
  if (errorLower.includes('zero')) {
    return REVERT_MESSAGES['ZERO_AMOUNT'];
  }
  if (errorLower.includes('liquidity')) {
    return REVERT_MESSAGES['INSUFFICIENT_LIQUIDITY'];
  }

  // Return generic message if no match
  return `Transaction would fail: ${error.slice(0, 100)}`;
}

function parseSimulationError(error: unknown, action: string): SimulationResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Simulation] ${action} error:`, errorMessage);

  return {
    success: false,
    gasEstimate: 0n,
    expectedOutput: 0n,
    revertReason: parseRevertReason(errorMessage),
    warnings: [],
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Simulate deposit for a specific pool
 */
export async function simulatePoolDeposit(
  pool: StablecoinPool,
  amount: bigint,
  userAddress: Address
): Promise<SimulationResult> {
  return simulateDeposit({
    protocol: pool.protocol,
    poolAddress: pool.poolAddress,
    assetAddress: pool.asset.address,
    amount,
    userAddress,
    decimals: pool.asset.decimals,
  }, pool.chainId);
}

/**
 * Simulate withdrawal for a specific pool
 */
export async function simulatePoolWithdraw(
  pool: StablecoinPool,
  amount: bigint,
  userAddress: Address
): Promise<SimulationResult> {
  return simulateWithdraw({
    protocol: pool.protocol,
    poolAddress: pool.poolAddress,
    assetAddress: pool.asset.address,
    amount,
    userAddress,
    decimals: pool.asset.decimals,
  }, pool.chainId);
}

/**
 * Get gas estimate in USD
 * Uses live ETH price from Chainlink/CoinGecko
 */
export async function getGasEstimateUsd(
  gasEstimate: bigint,
  chainId: number = 8453
): Promise<number> {
  const client = getPublicClient(chainId);

  try {
    const gasPrice = await client.getGasPrice();
    const gasCostWei = gasEstimate * gasPrice;

    // Fetch live ETH price from Chainlink/CoinGecko
    let ethPriceUsd = 2500; // Fallback value
    try {
      const { livePriceService } = await import('@/services/live-prices');
      const ethPrice = await livePriceService.getEthPrice();
      ethPriceUsd = ethPrice.priceUsd;
    } catch {
      console.warn('[Simulation] Failed to fetch live ETH price, using fallback');
    }

    const gasCostEth = Number(gasCostWei) / 1e18;
    return gasCostEth * ethPriceUsd;
  } catch {
    return 0;
  }
}
