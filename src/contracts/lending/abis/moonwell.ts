/**
 * Moonwell Protocol ABIs
 *
 * Contains only the functions needed for PRISM lending integration.
 * Based on Compound V2 fork with Moonwell extensions.
 * Full ABI available at: https://github.com/moonwell-fi/moonwell-contracts-v2
 */

/**
 * Moonwell Comptroller (Unitroller) ABI
 *
 * Central controller for the protocol.
 */
export const moonwellComptrollerAbi = [
  // ==========================================================================
  // MARKET MANAGEMENT
  // ==========================================================================
  {
    name: 'enterMarkets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mTokens', type: 'address[]' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'exitMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mTokenAddress', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAssetsIn',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'checkMembership',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'mToken', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ==========================================================================
  // ACCOUNT LIQUIDITY
  // ==========================================================================
  {
    name: 'getAccountLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'error', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'shortfall', type: 'uint256' },
    ],
  },
  {
    name: 'getHypotheticalAccountLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'mTokenModify', type: 'address' },
      { name: 'redeemTokens', type: 'uint256' },
      { name: 'borrowAmount', type: 'uint256' },
    ],
    outputs: [
      { name: 'error', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'shortfall', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================
  {
    name: 'getAllMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mToken', type: 'address' }],
    outputs: [
      { name: 'isListed', type: 'bool' },
      { name: 'collateralFactorMantissa', type: 'uint256' },
    ],
  },
  {
    name: 'mintGuardianPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mToken', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'borrowGuardianPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mToken', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ==========================================================================
  // PRICE ORACLE
  // ==========================================================================
  {
    name: 'oracle',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },

  // ==========================================================================
  // LIQUIDATION
  // ==========================================================================
  {
    name: 'closeFactorMantissa',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'liquidationIncentiveMantissa',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // REWARDS
  // ==========================================================================
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [],
  },
  {
    name: 'rewardAccrued',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Moonwell mToken ABI
 *
 * ERC20 token representing a position in a market.
 */
export const moonwellMTokenAbi = [
  // ==========================================================================
  // SUPPLY (MINT)
  // ==========================================================================
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mintAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'mintWithPermit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'mintAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // WITHDRAW (REDEEM)
  // ==========================================================================
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemTokens', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'redeemUnderlying',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // BORROW
  // ==========================================================================
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'borrowAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // REPAY
  // ==========================================================================
  {
    name: 'repayBorrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'repayAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'repayBorrowBehalf',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'borrower', type: 'address' },
      { name: 'repayAmount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // BALANCES
  // ==========================================================================
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOfUnderlying',
    type: 'function',
    stateMutability: 'nonpayable', // Updates exchange rate
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowBalanceCurrent',
    type: 'function',
    stateMutability: 'nonpayable', // Updates interest
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowBalanceStored',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAccountSnapshot',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'error', type: 'uint256' },
      { name: 'mTokenBalance', type: 'uint256' },
      { name: 'borrowBalance', type: 'uint256' },
      { name: 'exchangeRateMantissa', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // RATES
  // ==========================================================================
  {
    name: 'supplyRatePerTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowRatePerTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'exchangeRateCurrent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'exchangeRateStored',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================
  {
    name: 'underlying',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalBorrows',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCash',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'reserveFactorMantissa',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'accrualBlockTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // TOKEN METADATA
  // ==========================================================================
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  {
    name: 'accrueInterest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // EVENTS
  // ==========================================================================
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
  {
    name: 'Borrow',
    type: 'event',
    inputs: [
      { name: 'borrower', type: 'address', indexed: false },
      { name: 'borrowAmount', type: 'uint256', indexed: false },
      { name: 'accountBorrows', type: 'uint256', indexed: false },
      { name: 'totalBorrows', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RepayBorrow',
    type: 'event',
    inputs: [
      { name: 'payer', type: 'address', indexed: false },
      { name: 'borrower', type: 'address', indexed: false },
      { name: 'repayAmount', type: 'uint256', indexed: false },
      { name: 'accountBorrows', type: 'uint256', indexed: false },
      { name: 'totalBorrows', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'LiquidateBorrow',
    type: 'event',
    inputs: [
      { name: 'liquidator', type: 'address', indexed: false },
      { name: 'borrower', type: 'address', indexed: false },
      { name: 'repayAmount', type: 'uint256', indexed: false },
      { name: 'mTokenCollateral', type: 'address', indexed: false },
      { name: 'seizeTokens', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Moonwell mETH (Native Token) ABI
 *
 * For markets with native ETH as underlying.
 */
export const moonwellMEthAbi = [
  // Same as mToken but with native ETH support
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'repayBorrow',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  // Include all mToken functions
  ...moonwellMTokenAbi.filter(
    (item) => !['mint', 'repayBorrow'].includes(item.name as string)
  ),
] as const;

/**
 * Moonwell Price Oracle ABI
 */
export const moonwellOracleAbi = [
  {
    name: 'getUnderlyingPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mToken', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
