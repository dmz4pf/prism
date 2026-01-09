/**
 * Base Mainnet Contract Addresses
 * All verified contract addresses for ETH staking protocols on Base
 */

export const BASE_CHAIN_ID = 8453;

export const BASE_MAINNET_CONTRACTS = {
  // === NATIVE TOKENS ===
  WETH: '0x4200000000000000000000000000000000000006' as const,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' as const,

  // === LIQUID STAKING TOKENS (Tier 1) ===
  wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0EE452' as const,
  cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEC22' as const,

  // === LIQUID RESTAKING TOKENS (Tier 2) ===
  weETH: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A' as const,
  superOETHb: '0xDBFeFD2e8460a6Ee4955A68582F85708BAEA60A3' as const,

  // === AAVE V3 (Tier 1) ===
  aave: {
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const,
    poolAddressProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D' as const,
    poolDataProvider: '0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A' as const,
    wrappedTokenGateway: '0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24' as const,
    // aTokens (receipt tokens for supplied assets)
    aBasWETH: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7' as const,
    aBaswstETH: '0x99CBC45ea5bb7eF3a5BC08FB1B7E56bB2442Ef0d' as const,
    aBascbETH: '0xcf3D55c10DB69f28fD1A75Bd73f3D8A2d9C595aD' as const,
    aBasUSDbC: '0x0a1d576f3eFeF75b330424287a95A366e8281D54' as const,
    // Variable Debt Tokens (receipt tokens for borrowed assets)
    variableDebtWETH: '0x24e6e0795b3c7c71D965fCc4f371803d1c1DcA1E' as const,
    variableDebtUSDbC: '0x59dca05b6c26dbd64b5381374aaac5CD05644C28' as const,
  },

  // === AERODROME (Tier 1) ===
  aerodrome: {
    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const,
    defaultFactory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as const,
    voter: '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5' as const,
    // Key Liquidity Pools
    pools: {
      wethUsdc: '0xB4885Bc63399BF5518b994c1d0C153334Ee579D0' as const,
      wstethWeth: '0x6446021F4E396dA3df4235C62537431372195D38' as const,
      cbethWeth: '0x44Ecc644449fC3a9858d2007CaA8CFAa4C561f91' as const,
      superOethWeth: '0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d' as const,
    },
  },

  // === MORPHO BLUE (Tier 2) ===
  morpho: {
    morphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as const,
    bundler: '0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077' as const,
    // Curated Vaults on Base
    vaults: {
      gauntletWeth: '0x' as const, // To be added when deployed
      steakhouseUsdc: '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca' as const,
    },
  },

  // === CHAINLINK PRICE FEEDS ===
  // See: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base
  chainlink: {
    ethUsd: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as const,
    cbethEth: '0x868a501e68F3D1E89CfC0D22F6b22E8dabce5F04' as const,
    wstethEth: '0x164b276057258d81941072EaB6C0e6D1F4aD7b1f' as const,
    weethEth: '0xFC1415403EbB0c693f9a7844b92AD2Ff24775C65' as const, // weETH/ETH on Base
    usdcUsd: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as const,
  },

  // === ORIGIN PROTOCOL (Super OETH) ===
  origin: {
    superOETHb: '0xDBFeFD2e8460a6Ee4955A68582F85708BAEA60A3' as const,
    // Vault address for minting/redeeming
    vault: '0x98a0CbeF61bD2D21435f433bE194c28b7D76b57A' as const,
  },
} as const;

// Type exports for contract addresses
export type BaseMainnetContracts = typeof BASE_MAINNET_CONTRACTS;
export type TokenAddress =
  | typeof BASE_MAINNET_CONTRACTS.WETH
  | typeof BASE_MAINNET_CONTRACTS.USDC
  | typeof BASE_MAINNET_CONTRACTS.wstETH
  | typeof BASE_MAINNET_CONTRACTS.cbETH
  | typeof BASE_MAINNET_CONTRACTS.weETH
  | typeof BASE_MAINNET_CONTRACTS.superOETHb;

// Explorer URL helper
export const getExplorerUrl = (txHash: string) =>
  `https://basescan.org/tx/${txHash}`;

export const getAddressExplorerUrl = (address: string) =>
  `https://basescan.org/address/${address}`;
