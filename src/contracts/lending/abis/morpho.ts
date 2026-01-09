/**
 * Morpho Blue ABI
 *
 * Contains only the functions needed for PRISM lending integration.
 * Full ABI available at: https://github.com/morpho-org/morpho-blue
 */

export const morphoBlueAbi = [
  // ==========================================================================
  // SUPPLY
  // ==========================================================================
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSupplied', type: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // WITHDRAW
  // ==========================================================================
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsWithdrawn', type: 'uint256' },
      { name: 'sharesWithdrawn', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // BORROW
  // ==========================================================================
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsBorrowed', type: 'uint256' },
      { name: 'sharesBorrowed', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // REPAY
  // ==========================================================================
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsRepaid', type: 'uint256' },
      { name: 'sharesRepaid', type: 'uint256' },
    ],
  },

  // ==========================================================================
  // COLLATERAL
  // ==========================================================================
  {
    name: 'supplyCollateral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'withdrawCollateral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },

  // ==========================================================================
  // MARKET DATA
  // ==========================================================================
  {
    name: 'market',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'totalSupplyAssets', type: 'uint128' },
      { name: 'totalSupplyShares', type: 'uint128' },
      { name: 'totalBorrowAssets', type: 'uint128' },
      { name: 'totalBorrowShares', type: 'uint128' },
      { name: 'lastUpdate', type: 'uint128' },
      { name: 'fee', type: 'uint128' },
    ],
  },
  {
    name: 'idToMarketParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
    ],
  },

  // ==========================================================================
  // POSITION DATA
  // ==========================================================================
  {
    name: 'position',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'supplyShares', type: 'uint256' },
      { name: 'borrowShares', type: 'uint128' },
      { name: 'collateral', type: 'uint128' },
    ],
  },

  // ==========================================================================
  // UTILITY
  // ==========================================================================
  {
    name: 'accrueInterest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
    ],
    outputs: [],
  },

  // ==========================================================================
  // EVENTS
  // ==========================================================================
  {
    name: 'Supply',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: false },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Borrow',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: false },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Repay',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SupplyCollateral',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WithdrawCollateral',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: false },
      { name: 'onBehalf', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'assets', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Liquidate',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'borrower', type: 'address', indexed: true },
      { name: 'repaidAssets', type: 'uint256', indexed: false },
      { name: 'repaidShares', type: 'uint256', indexed: false },
      { name: 'seizedAssets', type: 'uint256', indexed: false },
      { name: 'badDebtAssets', type: 'uint256', indexed: false },
      { name: 'badDebtShares', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * Morpho IRM (Interest Rate Model) ABI
 */
export const morphoIrmAbi = [
  {
    name: 'borrowRateView',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      {
        name: 'market',
        type: 'tuple',
        components: [
          { name: 'totalSupplyAssets', type: 'uint128' },
          { name: 'totalSupplyShares', type: 'uint128' },
          { name: 'totalBorrowAssets', type: 'uint128' },
          { name: 'totalBorrowShares', type: 'uint128' },
          { name: 'lastUpdate', type: 'uint128' },
          { name: 'fee', type: 'uint128' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Morpho Oracle ABI
 */
export const morphoOracleAbi = [
  {
    name: 'price',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * MetaMorpho Vault ABI (ERC4626 + extensions)
 */
export const metaMorphoAbi = [
  // ERC4626 standard
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
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // MetaMorpho-specific
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint96' }],
  },
  {
    name: 'curator',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
