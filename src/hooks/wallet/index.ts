export { usePrismWallet } from './use-prism-wallet';
export { usePrismSmartWallet } from './use-prism-smart-wallet';
export { useStrategies } from './use-strategies';
export { useProtocolData, useLiveAPY } from './use-protocol-data';
export { useNetworkSwitch } from './use-network-switch';

// New Smart Wallet V2 Hooks (no localStorage, deterministic derivation)
export { useSmartWallet } from './use-smart-wallet';
export { useWalletBalances, useTokenBalance, useEthBalance } from './use-wallet-balances';
export { useSwap, formatSwapPrice, formatPriceImpact, getPriceImpactSeverity } from './use-swap';
