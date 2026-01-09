export const LIDO_STETH_ABI = [
  // Submit ETH for stETH
  {
    inputs: [{ name: '_referral', type: 'address' }],
    name: 'submit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  // Get shares by address
  {
    inputs: [{ name: '_account', type: 'address' }],
    name: 'sharesOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get balance
  {
    inputs: [{ name: '_account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LIDO_WSTETH_ABI = [
  // Wrap stETH to wstETH
  {
    inputs: [{ name: '_stETHAmount', type: 'uint256' }],
    name: 'wrap',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Unwrap wstETH to stETH
  {
    inputs: [{ name: '_wstETHAmount', type: 'uint256' }],
    name: 'unwrap',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get stETH for wstETH amount
  {
    inputs: [{ name: '_wstETHAmount', type: 'uint256' }],
    name: 'getStETHByWstETH',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get wstETH for stETH amount
  {
    inputs: [{ name: '_stETHAmount', type: 'uint256' }],
    name: 'getWstETHByStETH',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LIDO_WITHDRAWAL_QUEUE_ABI = [
  // Request withdrawal
  {
    inputs: [
      { name: '_amounts', type: 'uint256[]' },
      { name: '_owner', type: 'address' },
    ],
    name: 'requestWithdrawals',
    outputs: [{ name: 'requestIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Claim withdrawal
  {
    inputs: [{ name: '_requestId', type: 'uint256' }],
    name: 'claimWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get withdrawal status
  {
    inputs: [{ name: '_requestIds', type: 'uint256[]' }],
    name: 'getWithdrawalStatus',
    outputs: [
      {
        components: [
          { name: 'amountOfStETH', type: 'uint256' },
          { name: 'amountOfShares', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'isFinalized', type: 'bool' },
          { name: 'isClaimed', type: 'bool' },
        ],
        name: 'statuses',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Get user's withdrawal requests
  {
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'getWithdrawalRequests',
    outputs: [{ name: 'requestIds', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get last finalized request ID
  {
    inputs: [],
    name: 'getLastFinalizedRequestId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
