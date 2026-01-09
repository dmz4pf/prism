# PRISM Frontend - Volume 2 Codebase Snapshot
## Date: 2026-01-04

This document captures the complete state of the PRISM frontend codebase as of Volume 2.

---

## Changes Since Volume 1

### Major Features Added
1. **Section Box System** (Infinex-inspired)
   - `prism-section-box` / `-subtle` / `-gradient` for boxed sections
   - `prism-section-unboxed` / `-bordered` for unboxed sections
   - `prism-feature-card` / `-hover` for individual cards
   - Alternating boxed/unboxed pattern on landing page

2. **Feature Accordion Component**
   - Interactive accordion with 6 DeFi features
   - Desktop/mobile preview mockups
   - Animated expand/collapse with Plus icon rotation

3. **Strategy Carousel**
   - Auto-playing (5s interval) with pause on hover
   - 5 dummy strategies with rich data
   - Navigation arrows, dot indicators, progress bar
   - Slide transitions with direction awareness

4. **Infinex-style Header**
   - Pill-shaped center navigation for app pages
   - Minimal header for landing page
   - "Docs" ghost link + "Get Started" button

5. **Animation System**
   - All animations use `viewport={{ once: false, amount: 0.2 }}`
   - Animations replay on scroll up/down
   - Staggered entrance animations

6. **Launch App Flow**
   - Conditional connect: Opens RainbowKit modal if not connected
   - Direct navigation to dashboard if connected

7. **Theme Standardization**
   - Replaced `slate-*` with semantic colors
   - Replaced `blue-*` with `prism` brand color
   - CSS utility classes in globals.css

---

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css          # Theme utilities, section boxes
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing page (updated)
│   │   ├── dashboard/page.tsx   # Dashboard
│   │   ├── wallet/page.tsx      # Wallet management
│   │   ├── strategies/
│   │   │   ├── page.tsx         # Strategy list
│   │   │   └── [id]/page.tsx    # Strategy detail
│   │   ├── simple/
│   │   │   ├── page.tsx
│   │   │   ├── stake/page.tsx
│   │   │   ├── lend/page.tsx
│   │   │   └── stable/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── activity/page.tsx
│   │   └── points/page.tsx
│   │
│   ├── components/
│   │   ├── landing/
│   │   │   ├── index.ts
│   │   │   ├── feature-accordion.tsx  # NEW
│   │   │   └── strategy-carousel.tsx  # NEW
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx       # Updated (Infinex-style)
│   │   │   └── footer.tsx
│   │   │
│   │   ├── ui/
│   │   │   ├── button.tsx       # Updated (hover zoom)
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx       # Updated (dark bg)
│   │   │   ├── count-up.tsx
│   │   │   ├── apy-tooltip.tsx
│   │   │   ├── token-logo.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── ...
│   │   │
│   │   ├── modals/
│   │   │   ├── create-wallet-modal.tsx  # Updated
│   │   │   ├── confirmation-modal.tsx
│   │   │   ├── pending-modal.tsx
│   │   │   └── success-modal.tsx
│   │   │
│   │   ├── wallet/
│   │   │   ├── prism-wallet-card.tsx
│   │   │   └── deposit-withdraw.tsx
│   │   │
│   │   ├── strategies/
│   │   │   ├── strategy-card.tsx
│   │   │   └── strategy-flow.tsx
│   │   │
│   │   ├── providers/
│   │   │   ├── web3-provider.tsx  # Updated (modalSize="wide")
│   │   │   └── theme-provider.tsx
│   │   │
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── wallet/
│   │   │   ├── use-prism-wallet.ts
│   │   │   ├── use-strategies.ts
│   │   │   └── use-protocol-data.ts
│   │   ├── data/
│   │   │   ├── use-yields.ts
│   │   │   ├── use-positions.ts
│   │   │   └── ...
│   │   └── protocols/
│   │       ├── use-lido-stake.ts
│   │       ├── use-aave-deposit.ts
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── wagmi.ts
│   │   ├── query-client.ts
│   │   ├── api.ts
│   │   └── utils.ts
│   │
│   ├── contracts/
│   │   ├── abis/
│   │   └── addresses.ts
│   │
│   ├── stores/
│   │   └── ui-store.ts
│   │
│   └── types/
│       └── index.ts
│
├── docs/
│   ├── prompts/
│   │   ├── prompt-log.md
│   │   └── ui-generation-prompts.md
│   └── research/
│       └── mega-menu-implementation.md
│
└── package.json
```

---

## Key Files

### 1. globals.css - Theme System

```css
@layer components {
  /* Section Box System [Infinex-inspired] */
  .prism-section-box {
    @apply rounded-2xl md:rounded-3xl p-6 md:p-10 lg:p-14;
    background: linear-gradient(180deg, #252538 0%, #1a1a28 100%);
    border: 1px solid rgba(124, 58, 237, 0.25);
    box-shadow: 0 0 80px rgba(124, 58, 237, 0.15), 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .prism-section-box-subtle {
    @apply rounded-2xl md:rounded-3xl p-6 md:p-10 lg:p-14;
    background: linear-gradient(180deg, #1f1f30 0%, #181825 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .prism-section-box-gradient {
    @apply rounded-2xl md:rounded-3xl p-6 md:p-10 lg:p-14;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, #252538 40%, #1a1a28 100%);
    border: 1px solid rgba(124, 58, 237, 0.3);
    box-shadow: 0 0 100px rgba(124, 58, 237, 0.2), 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .prism-section-unboxed {
    @apply py-16 md:py-20 lg:py-24;
  }

  .prism-section-unboxed-bordered {
    @apply prism-section-unboxed border-t border-border;
  }

  .prism-feature-card-hover {
    @apply p-6 md:p-8 rounded-xl transition-all duration-300;
    background: linear-gradient(180deg, #222235 0%, #1a1a28 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  }

  .prism-feature-card-hover:hover {
    border-color: rgba(124, 58, 237, 0.5);
    background: linear-gradient(180deg, #2a2a40 0%, #1e1e30 100%);
    box-shadow: 0 16px 50px rgba(124, 58, 237, 0.25), 0 8px 30px rgba(0, 0, 0, 0.4);
    transform: translateY(-4px);
  }

  .prism-section-header {
    @apply text-center mb-10 md:mb-14;
  }

  .prism-section-label {
    @apply text-sm text-prism font-medium uppercase tracking-wider mb-3;
  }

  .prism-section-title {
    @apply font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4;
  }

  .prism-section-subtitle {
    @apply text-gray-400 text-lg max-w-2xl mx-auto;
  }
}
```

### 2. web3-provider.tsx

```tsx
'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { queryClient } from '@/lib/query-client';

import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7C3AED',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="wide"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 3. Landing Page Hero Section (page.tsx excerpt)

```tsx
{/* Hero Section */}
<section className="relative overflow-hidden py-20 lg:py-32">
  <div className="container mx-auto px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-4xl mx-auto"
    >
      {/* Badge */}
      <motion.div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-prism/10 border border-prism/20 mb-6">
        <Layers className="h-4 w-4 text-prism" />
        <span className="text-sm text-prism">Base-First DeFi Aggregator</span>
      </motion.div>

      <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
        Your Yield,{' '}
        <span className="text-gradient">Optimized</span>
      </h1>

      <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
        PRISM simplifies DeFi with smart wallet strategies...
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {isConnected ? (
          <Link href="/dashboard">
            <Button size="lg">Launch App <ArrowRight /></Button>
          </Link>
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button size="lg" onClick={openConnectModal}>
                Launch App <ArrowRight />
              </Button>
            )}
          </ConnectButton.Custom>
        )}
        <a href="https://docs.prism.xyz">
          <Button variant="outline" size="lg">View Documentation</Button>
        </a>
      </div>
    </motion.div>
  </div>
</section>
```

### 4. Button Component (hover zoom)

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-prism text-white hover:bg-prism-600',
        destructive: 'bg-error text-white hover:bg-error/90',
        outline: 'border border-border bg-transparent hover:bg-surface hover:text-white',
        secondary: 'bg-surface text-white hover:bg-surface-hover',
        ghost: 'hover:bg-surface hover:text-white',
        link: 'text-prism underline-offset-4 hover:underline',
        success: 'bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

---

## Landing Page Section Structure

1. **Hero Section** - UNBOXED
   - Badge, headline, description, CTAs, stats

2. **How It Works** - UNBOXED with border-top
   - Section header with label/title/subtitle
   - 3-step cards with icons and connector lines

3. **Feature Accordion** - BOXED (`prism-section-box`)
   - Interactive accordion (left) + preview mockups (right)

4. **Protocol Partners** - UNBOXED with subtle bg
   - Protocol logos grid

5. **Why PRISM Features** - UNBOXED with border-top
   - `prism-feature-card-hover` grid (4 cards)

6. **Featured Strategies** - BOXED (`prism-section-box`)
   - Strategy carousel with auto-play

7. **Bottom CTA** - Gradient styled
   - Final connect wallet call-to-action

---

## Animation Configuration

All motion elements use:
```tsx
viewport={{ once: false, amount: 0.2 }}
```

This ensures animations:
- Replay when scrolling up past a section
- Trigger when 20% of element is visible

---

## Color Palette

```css
:root {
  --background: 10 10 15;        /* #0A0A0F */
  --prism: 124 58 237;           /* #7C3AED */
  --card-bg: #16161F;
  --surface-bg: #1E1E2D;
  --surface-hover-bg: #252536;
  --border-color: #2D2D40;
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.x",
    "@tanstack/react-query": "^5.x",
    "framer-motion": "^11.x",
    "lucide-react": "^0.x",
    "next": "15.5.9",
    "react": "^19.x",
    "tailwindcss": "^3.x",
    "wagmi": "^2.x",
    "viem": "^2.x"
  }
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_TESTNET=true
NEXT_PUBLIC_ALCHEMY_ID=xxx
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
```

---

## Notes for Future Development

1. **Wallet Page** - Still uses `slate-*` colors and `blue-*` accents (user reverted theme update)
2. **Strategy data** - Currently dummy/mock data in carousel
3. **RainbowKit** - Using `modalSize="wide"` for full wallet list
4. **Base Sepolia** - Testnet mode enabled via env var

---

*End of Volume 2 Snapshot*
