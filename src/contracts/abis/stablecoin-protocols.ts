/**
 * Contract ABIs for Stablecoin Protocol Integration
 *
 * This file contains minimal ABIs with only the functions we need.
 * Full ABIs can be imported from protocol packages if needed.
 */

// =============================================================================
// ERC-20 STANDARD (For token approvals and balances)
// =============================================================================

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

// =============================================================================
// ERC-4626 TOKENIZED VAULT STANDARD (For Morpho, Fluid)
// =============================================================================

export const ERC4626_ABI = [
  // Inherited from ERC-20
  ...ERC20_ABI,

  // ERC-4626 Specific - Read Functions
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'previewMint',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },

  // ERC-4626 Specific - Write Functions
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },

  // Events
  {
    name: 'Deposit',
    type: 'event',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
] as const;

// =============================================================================
// AAVE V3 POOL ABI
// =============================================================================

export const AAVE_V3_POOL_ABI = [
  // Supply
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },

  // Withdraw
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },

  // Get User Account Data
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
  },

  // Get Reserve Data
  {
    name: 'getReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'configuration', type: 'uint256' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' },
        ],
      },
    ],
  },

  // Events
  {
    name: 'Supply',
    type: 'event',
    inputs: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: false },
      { name: 'onBehalfOf', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'referralCode', type: 'uint16', indexed: true },
    ],
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { name: 'reserve', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// =============================================================================
// AAVE V3 POOL DATA PROVIDER ABI
// =============================================================================

export const AAVE_V3_POOL_DATA_PROVIDER_ABI = [
  {
    name: 'getReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'unbacked', type: 'uint256' },
      { name: 'accruedToTreasuryScaled', type: 'uint256' },
      { name: 'totalAToken', type: 'uint256' },
      { name: 'totalStableDebt', type: 'uint256' },
      { name: 'totalVariableDebt', type: 'uint256' },
      { name: 'liquidityRate', type: 'uint256' },
      { name: 'variableBorrowRate', type: 'uint256' },
      { name: 'stableBorrowRate', type: 'uint256' },
      { name: 'averageStableBorrowRate', type: 'uint256' },
      { name: 'liquidityIndex', type: 'uint256' },
      { name: 'variableBorrowIndex', type: 'uint256' },
      { name: 'lastUpdateTimestamp', type: 'uint40' },
    ],
  },
  {
    name: 'getUserReserveData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'currentATokenBalance', type: 'uint256' },
      { name: 'currentStableDebt', type: 'uint256' },
      { name: 'currentVariableDebt', type: 'uint256' },
      { name: 'principalStableDebt', type: 'uint256' },
      { name: 'scaledVariableDebt', type: 'uint256' },
      { name: 'stableBorrowRate', type: 'uint256' },
      { name: 'liquidityRate', type: 'uint256' },
      { name: 'stableRateLastUpdated', type: 'uint40' },
      { name: 'usageAsCollateralEnabled', type: 'bool' },
    ],
  },
  {
    name: 'getReserveTokensAddresses',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'aTokenAddress', type: 'address' },
      { name: 'stableDebtTokenAddress', type: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address' },
    ],
  },
] as const;

// =============================================================================
// MOONWELL mTOKEN ABI (Compound V2 Style)
// =============================================================================

export const MOONWELL_MTOKEN_ABI = [
  // Mint (Supply)
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mintAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }], // 0 = success
  },

  // Redeem (Withdraw by mToken amount)
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemTokens', type: 'uint256' }],
    outputs: [{ type: 'uint256' }], // 0 = success
  },

  // Redeem Underlying (Withdraw by underlying amount)
  {
    name: 'redeemUnderlying',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }], // 0 = success
  },

  // Get Exchange Rate (mToken -> underlying)
  {
    name: 'exchangeRateStored',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'exchangeRateCurrent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // Get Supply Rate
  {
    name: 'supplyRatePerTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // Get Borrow Rate
  {
    name: 'borrowRatePerTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // Account Snapshot
  {
    name: 'getAccountSnapshot',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'error', type: 'uint256' },
      { name: 'tokenBalance', type: 'uint256' },
      { name: 'borrowBalance', type: 'uint256' },
      { name: 'exchangeRateMantissa', type: 'uint256' },
    ],
  },

  // Balance
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },

  // Underlying Balance (calculated)
  {
    name: 'balanceOfUnderlying',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },

  // Total Supply/Borrows
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalBorrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // Underlying Asset
  {
    name: 'underlying',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },

  // Events
  {
    name: 'Mint',
    type: 'event',
    inputs: [
      { name: 'minter', type: 'address', indexed: false },
      { name: 'mintAmount', type: 'uint256', indexed: false },
      { name: 'mintTokens', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Redeem',
    type: 'event',
    inputs: [
      { name: 'redeemer', type: 'address', indexed: false },
      { name: 'redeemAmount', type: 'uint256', indexed: false },
      { name: 'redeemTokens', type: 'uint256', indexed: false },
    ],
  },
] as const;

// =============================================================================
// MOONWELL COMPTROLLER ABI
// =============================================================================

export const MOONWELL_COMPTROLLER_ABI = [
  // Enter Markets (enable as collateral)
  {
    name: 'enterMarkets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mTokens', type: 'address[]' }],
    outputs: [{ type: 'uint256[]' }],
  },

  // Get All Markets
  {
    name: 'getAllMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },

  // Claim Rewards
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [],
  },
] as const;

// =============================================================================
// COMPOUND V3 COMET ABI
// =============================================================================

export const COMPOUND_COMET_ABI = [
  // Supply
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'supplyTo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dst', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // Withdraw
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawTo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // Balance (includes accrued interest)
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },

  // Supply Rate
  {
    name: 'getSupplyRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'utilization', type: 'uint256' }],
    outputs: [{ type: 'uint64' }],
  },

  // Current Utilization
  {
    name: 'getUtilization',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // Base Token Address
  {
    name: 'baseToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },

  // Total Supply/Borrow
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalBorrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },

  // User Basic Info
  {
    name: 'userBasic',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'principal', type: 'int104' },
      { name: 'baseTrackingIndex', type: 'uint64' },
      { name: 'baseTrackingAccrued', type: 'uint64' },
      { name: 'assetsIn', type: 'uint16' },
    ],
  },

  // Events
  {
    name: 'Supply',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'dst', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { name: 'src', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// =============================================================================
// COMPOUND V3 COMET REWARDS ABI
// =============================================================================

export const COMPOUND_COMET_REWARDS_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'comet', type: 'address' },
      { name: 'src', type: 'address' },
      { name: 'shouldAccrue', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getRewardOwed',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'comet', type: 'address' },
      { name: 'account', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'owed', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

// =============================================================================
// CHAINLINK PRICE FEED ABI
// =============================================================================

export const CHAINLINK_PRICE_FEED_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

// =============================================================================
// EXPORT ALL ABIS
// =============================================================================

export const ABIS = {
  ERC20: ERC20_ABI,
  ERC4626: ERC4626_ABI,
  AavePool: AAVE_V3_POOL_ABI,
  AavePoolDataProvider: AAVE_V3_POOL_DATA_PROVIDER_ABI,
  MoonwellMToken: MOONWELL_MTOKEN_ABI,
  MoonwellComptroller: MOONWELL_COMPTROLLER_ABI,
  CompoundComet: COMPOUND_COMET_ABI,
  CompoundCometRewards: COMPOUND_COMET_REWARDS_ABI,
  ChainlinkPriceFeed: CHAINLINK_PRICE_FEED_ABI,
} as const;
