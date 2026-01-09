/**
 * Compound III (Comet) ABI
 *
 * Contains only the functions needed for PRISM lending integration.
 * Full ABI available at: https://github.com/compound-finance/comet
 */

export const compoundCometAbi = [
  // ==========================================================================
  // SUPPLY
  // ==========================================================================
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
  {
    name: 'supplyFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'dst', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // ==========================================================================
  // WITHDRAW
  // ==========================================================================
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
  {
    name: 'withdrawFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'src', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },

  // ==========================================================================
  // BALANCES
  // ==========================================================================
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'int256' }], // Positive = supply, negative = borrow
  },
  {
    name: 'borrowBalanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'collateralBalanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'asset', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint128' }],
  },

  // ==========================================================================
  // RATES
  // ==========================================================================
  {
    name: 'getSupplyRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'utilization', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    name: 'getBorrowRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'utilization', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    name: 'getUtilization',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
  },

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================
  {
    name: 'baseToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'baseTokenPriceFeed',
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
    name: 'totalBorrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'baseScale',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    name: 'baseMinForRewards',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint104' }],
  },
  {
    name: 'baseTrackingSupplySpeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint104' }],
  },
  {
    name: 'baseTrackingBorrowSpeed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint104' }],
  },

  // ==========================================================================
  // COLLATERAL INFO
  // ==========================================================================
  {
    name: 'numAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getAssetInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'i', type: 'uint8' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'offset', type: 'uint8' },
          { name: 'asset', type: 'address' },
          { name: 'priceFeed', type: 'address' },
          { name: 'scale', type: 'uint64' },
          { name: 'borrowCollateralFactor', type: 'uint64' },
          { name: 'liquidateCollateralFactor', type: 'uint64' },
          { name: 'liquidationFactor', type: 'uint64' },
          { name: 'supplyCap', type: 'uint128' },
        ],
      },
    ],
  },
  {
    name: 'getAssetInfoByAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'offset', type: 'uint8' },
          { name: 'asset', type: 'address' },
          { name: 'priceFeed', type: 'address' },
          { name: 'scale', type: 'uint64' },
          { name: 'borrowCollateralFactor', type: 'uint64' },
          { name: 'liquidateCollateralFactor', type: 'uint64' },
          { name: 'liquidationFactor', type: 'uint64' },
          { name: 'supplyCap', type: 'uint128' },
        ],
      },
    ],
  },

  // ==========================================================================
  // ACCOUNT HEALTH
  // ==========================================================================
  {
    name: 'isLiquidatable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isBorrowCollateralized',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ==========================================================================
  // PRICES
  // ==========================================================================
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'priceFeed', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ==========================================================================
  // ALLOWANCE
  // ==========================================================================
  {
    name: 'allow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'manager', type: 'address' },
      { name: 'isAllowed', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'isAllowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'manager', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ==========================================================================
  // EVENTS
  // ==========================================================================
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
    name: 'SupplyCollateral',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'dst', type: 'address', indexed: true },
      { name: 'asset', type: 'address', indexed: true },
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
  {
    name: 'WithdrawCollateral',
    type: 'event',
    inputs: [
      { name: 'src', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'asset', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AbsorbCollateral',
    type: 'event',
    inputs: [
      { name: 'absorber', type: 'address', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'asset', type: 'address', indexed: true },
      { name: 'collateralAbsorbed', type: 'uint256', indexed: false },
      { name: 'usdValue', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Compound Rewards ABI
 */
export const compoundRewardsAbi = [
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
    stateMutability: 'view',
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
  {
    name: 'rewardConfig',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'comet', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'rescaleFactor', type: 'uint64' },
          { name: 'shouldUpscale', type: 'bool' },
        ],
      },
    ],
  },
] as const;
