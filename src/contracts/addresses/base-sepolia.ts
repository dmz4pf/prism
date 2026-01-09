/**
 * Base Sepolia Testnet Contract Addresses
 * Used for testing before mainnet deployment
 *
 * Deployed: 2026-01-09
 * Deployer: 0xc211C942946011859ca634F22400d80570ED12A5
 */

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const BASE_SEPOLIA_CONTRACTS = {
  // === NATIVE TOKENS ===
  WETH: '0x4200000000000000000000000000000000000006' as const,

  // === MOCK LST TOKENS ===
  mockWstETH: '0xBbD200C8545656016eFff4AbCA03256e0695dF40' as const,
  mockCbETH: '0xDc62C5262a37d53f6F9C42C7D8662733ea2f20D1' as const,
  mockRETH: '0x176a47ABb8F6e5EbAc95f864B64DE5ee2Cb12367' as const,
  mockWeETH: '0xc0452814C3116eCdD0ef1713525966E084609090' as const,
  mockSuperOETHb: '0x62922dc5D9b6c192fBd0615CcAfDCeE879D20eeA' as const,

  // Aliases for compatibility with mainnet code
  wstETH: '0xBbD200C8545656016eFff4AbCA03256e0695dF40' as const,
  cbETH: '0xDc62C5262a37d53f6F9C42C7D8662733ea2f20D1' as const,
  rETH: '0x176a47ABb8F6e5EbAc95f864B64DE5ee2Cb12367' as const,
  weETH: '0xc0452814C3116eCdD0ef1713525966E084609090' as const,
  superOETHb: '0x62922dc5D9b6c192fBd0615CcAfDCeE879D20eeA' as const,

  // === MOCK STABLECOINS ===
  USDC: '0xc6D5472c1443F70ce9e652fb5a1b6c4e8c444AB0' as const,
  USDT: '0x72dCbf65C371bc82b880308BC4C3A7E84D9F7CB2' as const,
  DAI: '0x37042b6c302129ab496e1F0Ab0cCc999d6884A0a' as const,

  // === AAVE V3 (Official Base Sepolia Deployment) ===
  aave: {
    pool: '0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b' as const,
    poolAddressProvider: '0x7D1E8D5f39Dc61C2E73Aa4bFd43c20D9B2a29393' as const,
    poolDataProvider: '0x80f2c02224a2E548FC67c0bF705eBFA825dd5439' as const,
    wrappedTokenGateway: '0x8be473dCfA93132559B116a6bC8916F5E4575C68' as const,
    aBasWETH: '0x0000000000000000000000000000000000000000' as const,
    variableDebtWETH: '0x0000000000000000000000000000000000000000' as const,
  },

  // === MOCK AERODROME ROUTER ===
  aerodrome: {
    router: '0xce181dcF4b1034699B0110724cc4b621Dea908C4' as const,
    defaultFactory: '0x0000000000000000000000000000000000000000' as const,
    voter: '0x0000000000000000000000000000000000000000' as const,
    pools: {
      wethUsdc: '0x0000000000000000000000000000000000000000' as const,
      wstethWeth: '0x0000000000000000000000000000000000000000' as const,
      cbethWeth: '0x0000000000000000000000000000000000000000' as const,
      superOethWeth: '0x0000000000000000000000000000000000000000' as const,
    },
  },

  // === MOCK CHAINLINK PRICE FEEDS ===
  chainlink: {
    ethUsd: '0x6BD67d3aFB59A01272981DF4e3Bedd07ab75C38B' as const,
    wstethEth: '0xb6B9B952F45F3eC54E8b7564997a9e5903168569' as const,
    cbethEth: '0x38578df08eaba5b0719453f44ec3Bda58C297703' as const,
    rethEth: '0x15fb3265fefc1cB42A2c990DED55fb3a448689d4' as const,
    weethEth: '0xFfFbfe763d1CB66ACf77595a88050af4E92F465E' as const,
    superoethbEth: '0x1fe4a081280De8F41f3E2f88321f5B4e7ad8AE33' as const,
    usdcUsd: '0x1c537ed90AF9a578d2Bfd93A192F7df45C7e3e92' as const,
    usdtUsd: '0x90445589d54a4c42410675248F174A56eda2345f' as const,
    daiUsd: '0xda6D304570f35A6F122334C9F797e8A3d3d1AcE8' as const,
  },

  // === MOCK MORPHO VAULTS ===
  morpho: {
    morphoBlue: '0x0000000000000000000000000000000000000000' as const,
    bundler: '0x0000000000000000000000000000000000000000' as const,
    vaults: {
      morphoUSDC: '0x1B99b4Bd3F8fC79DA27DD826D22919242f2B6114' as const,
      morphoUSDT: '0xE6677a94e6959c172B0A8121a0A94D8cb0007E6e' as const,
      morphoDAI: '0x3fb29d183D05d5e9fFdF4FA0a0EF5643D4b801Ee' as const,
      gauntletWeth: '0x0000000000000000000000000000000000000000' as const,
      steakhouseUsdc: '0x1B99b4Bd3F8fC79DA27DD826D22919242f2B6114' as const,
    },
  },

  // === ORIGIN (Uses mock superOETHb) ===
  origin: {
    superOETHb: '0x62922dc5D9b6c192fBd0615CcAfDCeE879D20eeA' as const,
    vault: '0x0000000000000000000000000000000000000000' as const,
  },
} as const;

// Explorer URL helper for testnet
export const getSepoliaExplorerUrl = (txHash: string) =>
  `https://sepolia.basescan.org/tx/${txHash}`;

export const getSepoliaAddressExplorerUrl = (address: string) =>
  `https://sepolia.basescan.org/address/${address}`;

// Faucet URLs for getting test tokens
export const TESTNET_FAUCETS = {
  baseSepolia: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
  sepoliaEth: 'https://sepoliafaucet.com/',
};
