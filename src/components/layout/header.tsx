'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Menu, ExternalLink, ChevronDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar-context';
import { useIsMobile } from '@/hooks/use-media-query';

// Custom Wallet Button Component
function CustomWalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong Network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Chain Button */}
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary-800 border border-secondary-700 hover:bg-secondary-700 transition-colors"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain'}
                        src={chain.iconUrl}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                  </button>

                  {/* Account Button */}
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{account.displayName}</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const { openMobileSidebar } = useSidebar();
  const isMobile = useIsMobile();

  // Check if on landing page
  const isLandingPage = pathname === '/';

  // Landing page header - minimal with connect button
  if (isLandingPage) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="font-heading font-bold text-white">P</span>
            </div>
            <span className="font-heading text-xl font-bold text-white">PRISM</span>
          </Link>

          {/* Custom Wallet Button */}
          <CustomWalletButton />
        </div>
      </header>
    );
  }

  // App header with sidebar - simplified
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Mobile Menu Button (Left) */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={openMobileSidebar}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Spacer for desktop */}
        {!isMobile && <div />}

        {/* Right Side - Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Docs Button - Ghost */}
          <Link
            href="https://docs.prism.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-secondary-300 hover:text-white transition-colors"
          >
            Docs
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {/* Custom Wallet Button */}
          <CustomWalletButton />
        </div>
      </div>
    </header>
  );
}
