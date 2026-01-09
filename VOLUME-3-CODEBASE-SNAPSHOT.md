# PRISM Codebase Snapshot - Volume 3

**Date:** January 5, 2026
**Version:** 3.0.0
**Previous Volume:** Volume 2 (January 4, 2026)

---

## Overview

This snapshot captures the state of the PRISM codebase after implementing the complete smart wallet V2 system with ZeroDev SDK integration, fixing all wallet operations (deposit, withdraw, swap), and adding comprehensive transaction tracking with explorer links.

---

## Key Changes Since Volume 2

### 1. Smart Wallet System V2 (ZeroDev Integration)

The smart wallet system was completely rewritten to properly use ZeroDev SDK for deterministic address computation:

**`/src/hooks/wallet/use-smart-wallet.ts`**
- Uses ZeroDev SDK (`@zerodev/sdk`, `@zerodev/ecdsa-validator`)
- Kernel V3.1 accounts with EntryPoint 0.7
- Deterministic address computation (same address on any device)
- `sendTransaction` and `sendBatchedTransactions` via kernel client
- Fallback to EOA if ZeroDev not configured

### 2. Balance Fetching (wagmi-based)

**`/src/hooks/wallet/use-wallet-balances.ts`**
- Replaced Alchemy API with wagmi's `useBalance` hook
- Explicitly passes smart wallet address (not EOA)
- Fetches native ETH + ERC20 balances (USDC, USDbC, WETH, DAI)
- Auto-refresh every 10 seconds

### 3. Deposit Modal V2

**`/src/components/wallet/deposit-modal-v2.tsx`**
- Uses wagmi's `useSendTransaction` for EOA transfers
- Transaction hash tracking with `useWaitForTransactionReceipt`
- Explorer links for pending/success states
- User-friendly error messages

### 4. Withdrawal Modal V2

**`/src/components/wallet/withdraw-modal-v2.tsx`**
- Uses `sendTransaction` from `useSmartWallet` (kernel client)
- Transaction hash tracking
- Explorer links
- Better error handling

### 5. Swap Modal V2

**`/src/components/wallet/swap-modal-v2.tsx`**
- Uses `sendBatchedTransactions` for atomic approve + swap
- Transaction hash tracking
- Explorer links
- Mock quotes for testnet (0x API for mainnet)

### 6. Turbopack Configuration

**`/next.config.ts`**
- Added `turbopack.root` configuration
- Fixes ENOENT temp file race conditions
- Proper resolve alias for pino-pretty

---

## File Structure (110 source files)

```
frontend/src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── dashboard/page.tsx        # Dashboard
│   ├── wallet/page.tsx           # Wallet page
│   ├── strategies/
│   │   ├── page.tsx              # Strategies list
│   │   └── [id]/page.tsx         # Strategy detail
│   ├── simple/
│   │   ├── page.tsx              # Simple actions hub
│   │   ├── stake/page.tsx        # Staking
│   │   ├── lend/page.tsx         # Lending
│   │   └── stable/page.tsx       # Stable yield
│   ├── portfolio/page.tsx        # Portfolio
│   ├── settings/page.tsx         # Settings
│   ├── activity/page.tsx         # Activity log
│   └── points/page.tsx           # Points/rewards
│
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── skeleton.tsx
│   │   ├── token-logo.tsx
│   │   ├── apy-tooltip.tsx
│   │   ├── empty-state.tsx
│   │   └── count-up.tsx
│   │
│   ├── wallet/                   # Wallet components
│   │   ├── smart-wallet-card-v2.tsx
│   │   ├── deposit-modal-v2.tsx
│   │   ├── withdraw-modal-v2.tsx
│   │   ├── swap-modal-v2.tsx
│   │   ├── token-list-v2.tsx
│   │   ├── prism-wallet-card.tsx
│   │   ├── deposit-withdraw.tsx
│   │   ├── network-switch-prompt.tsx
│   │   └── transaction-steps.tsx
│   │
│   ├── landing/                  # Landing page components
│   │   ├── feature-accordion.tsx
│   │   └── strategy-carousel.tsx
│   │
│   ├── strategies/               # Strategy components
│   │   ├── strategy-card.tsx
│   │   └── strategy-flow.tsx
│   │
│   ├── modals/                   # Transaction modals
│   │   ├── create-wallet-modal.tsx
│   │   ├── confirmation-modal.tsx
│   │   ├── pending-modal.tsx
│   │   └── success-modal.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   └── footer.tsx
│   │
│   └── providers/                # React providers
│       ├── web3-provider.tsx
│       ├── theme-provider.tsx
│       └── motion-provider.tsx
│
├── hooks/
│   ├── wallet/                   # Wallet hooks
│   │   ├── use-smart-wallet.ts   # ZeroDev kernel client
│   │   ├── use-wallet-balances.ts # Balance fetching
│   │   ├── use-swap.ts           # Swap execution
│   │   ├── use-prism-wallet.ts   # Legacy wrapper
│   │   ├── use-prism-smart-wallet.ts
│   │   ├── use-strategies.ts
│   │   ├── use-protocol-data.ts
│   │   └── use-network-switch.ts
│   │
│   ├── data/                     # Data hooks
│   │   ├── use-yields.ts
│   │   ├── use-portfolio.ts
│   │   ├── use-positions.ts
│   │   ├── use-points.ts
│   │   └── use-alerts.ts
│   │
│   └── protocols/                # Protocol hooks
│       ├── use-aave-deposit.ts
│       ├── use-aave-positions.ts
│       ├── use-aave-supply-eth.ts
│       ├── use-lido-stake.ts
│       └── use-ethena-stake.ts
│
├── services/                     # External services
│   ├── alchemy.ts                # Alchemy API (price fetching)
│   └── swap-api.ts               # 0x swap API
│
├── lib/                          # Utilities
│   ├── utils.ts                  # General utilities
│   ├── smart-wallet.ts           # Smart wallet helpers
│   ├── tokens.ts                 # Token definitions
│   └── wagmi.ts                  # Wagmi configuration
│
├── contracts/                    # Contract ABIs & addresses
│   ├── addresses.ts
│   └── abis/
│       ├── erc20.ts
│       ├── aave-pool.ts
│       ├── lido.ts
│       ├── ethena.ts
│       └── ...
│
├── stores/                       # Zustand stores
│   └── ui-store.ts
│
└── types/                        # TypeScript types
    ├── index.ts
    └── wallet.ts
```

---

## Key Code Snippets

### Smart Wallet Initialization (use-smart-wallet.ts)

```typescript
const initializeSmartWallet = useCallback(async () => {
  const [
    { signerToEcdsaValidator },
    { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient },
    zerodevConstants,
  ] = await Promise.all([
    import('@zerodev/ecdsa-validator'),
    import('@zerodev/sdk'),
    import('@zerodev/sdk/constants'),
  ]);

  const { KERNEL_V3_1, getEntryPoint } = zerodevConstants;
  const entryPoint = getEntryPoint('0.7');

  // Create ECDSA validator
  const ecdsaValidator = await signerToEcdsaValidator(zerodevPublicClient, {
    signer: walletClient,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  // Create Kernel account - deterministic address
  const kernelAccount = await createKernelAccount(zerodevPublicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });

  const smartWalletAddress = kernelAccount.address;
}, [eoaAddress, isConnected, walletClient]);
```

### Balance Fetching (use-wallet-balances.ts)

```typescript
export function useWalletBalances(): UseWalletBalancesReturn {
  const { smartWallet } = useSmartWallet();

  // Fetch native ETH balance for the smart wallet address
  const { data: ethBalanceData } = useBalance({
    address: smartWallet?.address,
    query: {
      enabled: !!smartWallet?.address,
      refetchInterval: 10000,
    },
  });

  // Combine ETH and ERC20 balances
  const balances = useMemo<TokenBalance[]>(() => {
    const result: TokenBalance[] = [];
    if (ethBalanceData) {
      result.push({
        address: null,
        symbol: 'ETH',
        balanceRaw: ethBalanceData.value,
        // ...
      });
    }
    return result;
  }, [ethBalanceData, erc20Balances]);
}
```

### Turbopack Configuration (next.config.ts)

```typescript
const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    root: '/Users/MAC/Desktop/dev/Prism/frontend',
    resolveAlias: {
      'pino-pretty': { browser: '' },
    },
  },
  // ...
};
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_TESTNET=true
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
NEXT_PUBLIC_ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v3/xxx/chain/84532
NEXT_PUBLIC_ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v3/xxx/chain/84532
```

---

## Dependencies

### Core Web3
- `wagmi` ^2.14.16
- `viem` ^2.23.2
- `@rainbow-me/rainbowkit` ^2.2.3

### ZeroDev SDK
- `@zerodev/sdk` ^5.4.5
- `@zerodev/ecdsa-validator` ^5.4.5
- `@zerodev/permissions` ^5.4.5
- `permissionless` ^0.2.32

### UI
- `framer-motion` ^11.15.0
- `lucide-react` ^0.468.0
- `tailwindcss` ^3.4.17
- `@radix-ui/react-*` (dialog, tooltip, etc.)

---

## Transaction Flows

### Deposit Flow (EOA → Smart Wallet)
1. User enters amount
2. `useSendTransaction` sends ETH/ERC20 to smart wallet address
3. `useWaitForTransactionReceipt` tracks confirmation
4. Balance auto-refreshes after success

### Withdrawal Flow (Smart Wallet → EOA)
1. User selects token and amount
2. `useSmartWallet.sendTransaction` executes via kernel client
3. Transaction tracked with explorer link
4. Balance refreshes after success

### Swap Flow (Inside Smart Wallet)
1. User selects tokens and amount
2. 0x API fetches quote (mock on testnet)
3. `useSmartWallet.sendBatchedTransactions` batches:
   - ERC20 approval (if needed)
   - Swap transaction
4. Atomic execution, balance refreshes

---

## Research Documents

- `/docs/research/base-eth-staking-research.md` - ETH staking protocols on Base
- `/docs/research/base-stablecoin-yield-research.md` - Stablecoin yield protocols
- `/docs/research/base-lending-protocols-report.md` - Lending/borrowing protocols
- `/docs/design/theme-redesign-plan.md` - Theme audit and redesign plan

---

## Known Issues / TODOs

1. **Swaps on testnet**: Return mock quotes, actual swaps don't execute
2. **0x API key**: Not configured, mainnet swaps need API key
3. **Gas estimation**: Could be improved for better UX
4. **Multi-chain**: Currently Base/Base Sepolia only

---

## Commands

```bash
# Development
npm run dev              # Start without Turbopack
npm run dev -- --turbopack  # Start with Turbopack (faster)

# Type checking
npm run typecheck

# Build
npm run build

# Lint
npm run lint
```

---

## Changelog from Volume 2

| Component | Change |
|-----------|--------|
| use-smart-wallet.ts | Rewritten with ZeroDev SDK |
| use-wallet-balances.ts | Switched from Alchemy to wagmi |
| deposit-modal-v2.tsx | Added tx tracking, explorer links |
| withdraw-modal-v2.tsx | Added tx tracking, explorer links |
| swap-modal-v2.tsx | Added tx tracking, explorer links |
| next.config.ts | Added turbopack configuration |

---

*End of Volume 3 Snapshot*
