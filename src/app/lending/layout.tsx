'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  BarChart3,
  Wallet,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LendingLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/lending',
    icon: Home,
  },
  {
    label: 'Markets',
    href: '/lending/markets',
    icon: BarChart3,
  },
  {
    label: 'Positions',
    href: '/lending/positions',
    icon: Wallet,
  },
  {
    label: 'Activity',
    href: '/activity?filter=lending',
    icon: ArrowLeftRight,
  },
];

export default function LendingLayout({ children }: LendingLayoutProps) {
  const pathname = usePathname();

  // Build breadcrumbs
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const breadcrumbs = pathSegments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    href: '/' + pathSegments.slice(0, index + 1).join('/'),
    isLast: index === pathSegments.length - 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b border-border bg-background-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 h-14">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                              pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-400 hover:text-white hover:bg-surface/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="border-b border-border bg-background-card/30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {!crumb.isLast ? (
                    <>
                      <Link
                        href={crumb.href}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {crumb.label}
                      </Link>
                      <ChevronRight className="h-3 w-3 text-gray-600" />
                    </>
                  ) : (
                    <span className="text-white font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
