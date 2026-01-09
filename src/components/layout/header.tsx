'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Menu, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar-context';
import { useIsMobile } from '@/hooks/use-media-query';

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

          {/* Connect Button */}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
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

          {/* Connect Button / Account */}
          {isConnected ? (
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button onClick={openConnectModal} size="sm" className="rounded-full px-5">
                  Get Started
                </Button>
              )}
            </ConnectButton.Custom>
          )}
        </div>
      </div>
    </header>
  );
}
