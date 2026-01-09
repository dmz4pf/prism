export const PRISM_ROUTER_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'vault', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'StrategyEntered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'vault', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'StrategyExited',
    type: 'event',
  },
  // Staking Adapter Functions
  {
    inputs: [
      { internalType: 'address', name: 'stakingProtocol', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: 'stakedAmount', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'stakingProtocol', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'unstake',
    outputs: [{ internalType: 'uint256', name: 'receivedAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Lending Adapter Functions
  {
    inputs: [
      { internalType: 'address', name: 'lendingProtocol', type: 'address' },
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'lendingProtocol', type: 'address' },
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [{ internalType: 'uint256', name: 'withdrawnAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'lendingProtocol', type: 'address' },
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRateMode', type: 'uint256' },
    ],
    name: 'borrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'lendingProtocol', type: 'address' },
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRateMode', type: 'uint256' },
    ],
    name: 'repay',
    outputs: [{ internalType: 'uint256', name: 'repaidAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Stable Adapter Functions
  {
    inputs: [
      { internalType: 'address', name: 'stableVault', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'convertToYieldStable',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'stableVault', type: 'address' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
    ],
    name: 'redeemYieldStable',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Strategy Vault Functions
  {
    inputs: [
      { internalType: 'address', name: 'vault', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'enterStrategy',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'vault', type: 'address' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
    ],
    name: 'exitStrategy',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // View Functions
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'adapters',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'vaults',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
