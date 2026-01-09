export const SUSDE_ABI = [
  // Deposit USDe, receive sUSDe (ERC4626)
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Preview deposit
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'previewDeposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Start cooldown for withdrawal
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'cooldownAssets',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Unstake after cooldown
  {
    inputs: [{ name: 'receiver', type: 'address' }],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get cooldown info
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'cooldowns',
    outputs: [
      { name: 'cooldownEnd', type: 'uint104' },
      { name: 'underlyingAmount', type: 'uint152' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Convert shares to assets
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get balance
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Total assets
  {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
