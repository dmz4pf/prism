# PRISM

**Your Yield, Optimized** — A DeFi yield aggregator on Base that simplifies earning through smart wallets and one-click strategies.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Base](https://img.shields.io/badge/Base-Sepolia-0052FF?logo=coinbase)

---

## Overview

PRISM aggregates the best DeFi yield opportunities across protocols like Aave, Lido, Compound, and more — all accessible through a single smart wallet on Base. No more juggling multiple protocols or paying excessive gas fees.

### Key Features

- **Smart Wallet** — Gasless wallet creation powered by account abstraction (ZeroDev)
- **One-Click Strategies** — Complex multi-protocol strategies executed in a single transaction
- **Simple Actions** — Stake ETH, lend stables, or convert to yield-bearing assets
- **Real-Time APYs** — Live yield data from integrated protocols
- **Gas Optimized** — Transactions on Base cost less than $0.01

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | Radix UI Primitives |
| Animations | Framer Motion |
| Web3 | wagmi v2 + viem |
| Wallet Connect | RainbowKit |
| Account Abstraction | ZeroDev |
| State Management | Zustand + React Query |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A wallet with Base Sepolia ETH (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/prism.git
cd prism/frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your configuration:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Testnet Mode (true for Base Sepolia, false for Base Mainnet)
NEXT_PUBLIC_TESTNET=true

# ZeroDev (for account abstraction)
NEXT_PUBLIC_ZERODEV_BUNDLER_URL=your_bundler_url
NEXT_PUBLIC_ZERODEV_PAYMASTER_URL=your_paymaster_url
```

### Running Locally

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/          # Main dashboard
│   │   ├── wallet/             # Wallet management
│   │   ├── strategies/         # Strategy marketplace
│   │   ├── simple/             # Simple actions (stake/lend/stable)
│   │   └── settings/           # User settings
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI components (Button, Card, etc.)
│   │   ├── layout/             # Header, Footer, Navigation
│   │   ├── landing/            # Landing page sections
│   │   ├── strategies/         # Strategy cards and flows
│   │   ├── wallet/             # Wallet-related components
│   │   └── modals/             # Modal dialogs
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── wallet/             # Wallet hooks (usePrismWallet, etc.)
│   │   └── use-*.ts            # Utility hooks
│   │
│   ├── lib/                    # Utilities and configuration
│   │   ├── wagmi.ts            # Web3 configuration
│   │   └── utils.ts            # Helper functions
│   │
│   ├── stores/                 # Zustand state stores
│   │
│   └── types/                  # TypeScript type definitions
│
├── public/                     # Static assets
├── docs/                       # Documentation
│   ├── prompts/                # UI generation prompts
│   └── research/               # Feature research
│
└── tailwind.config.ts          # Tailwind configuration
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with features, how it works, protocol partners |
| `/dashboard` | Main app dashboard with portfolio overview |
| `/wallet` | Smart wallet management |
| `/strategies` | Browse and deploy yield strategies |
| `/strategies/[id]` | Individual strategy details |
| `/simple/stake` | Stake ETH for stETH/cbETH |
| `/simple/lend` | Supply/borrow on Aave |
| `/simple/stable` | Convert to yield-bearing stablecoins |
| `/settings` | App settings and preferences |

---

## Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--prism` | `#a855f7` | Brand/accent color |
| `--background` | `#09090b` | Page background |
| `--surface` | `#18181b` | Card backgrounds |
| `--border` | `#27272a` | Borders |

### Typography

- **Font**: Inter (sans-serif), JetBrains Mono (monospace)
- **Headings**: Bold, tracking-tight
- **Body**: Regular weight, gray-300/400

### Components

All components follow the PRISM theme system. Use utility classes:

```tsx
// Cards
<div className="prism-card">...</div>
<div className="prism-card-hover">...</div>

// Info boxes
<div className="prism-info-box-success">...</div>
<div className="prism-info-box-error">...</div>

// Section layouts
<section className="prism-section-box">...</section>
<section className="prism-section-unboxed">...</section>
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run typecheck` | Run TypeScript compiler |
| `npm run lint` | Run ESLint |
| `npm run screenshot` | Take screenshot (for design documentation) |

---

## Testing Networks

### Base Sepolia (Testnet)

- **Chain ID**: 84532
- **RPC**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org
- **Faucet**: [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)

### Base Mainnet (Production)

- **Chain ID**: 8453
- **RPC**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org

Toggle between networks with `NEXT_PUBLIC_TESTNET` in `.env.local`.

---

## Documentation

- `/docs/prompts/` — UI generation prompts for recreating components
- `/docs/research/` — Feature research and implementation guides
- `/docs/context/` — Conversation context preservation

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Run `npm run typecheck` before committing
- Use semantic commit messages

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Links

- **Live App**: Coming soon
- **Documentation**: Coming soon
- **Twitter**: Coming soon
- **Discord**: Coming soon

---

<p align="center">
  <strong>PRISM</strong> — Your Yield, Optimized
</p>
