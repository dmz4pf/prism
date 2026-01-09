import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  Coins,
  Target,
  Wallet,
  Award,
  Settings,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: 'NEW' | 'BETA' | string;
  external?: boolean;
  searchKeywords?: string[];
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        searchKeywords: ['home', 'overview', 'portfolio', 'summary', 'stats'],
      },
      {
        id: 'stake',
        label: 'Stake',
        href: '/simple/stake',
        icon: TrendingUp,
        searchKeywords: ['staking', 'earn', 'apy', 'rewards', 'validator', 'eth', 'ethereum'],
      },
      {
        id: 'lend',
        label: 'Lend',
        href: '/simple/lend',
        icon: Landmark,
        searchKeywords: ['lending', 'supply', 'deposit', 'interest', 'aave', 'compound', 'defi'],
      },
      {
        id: 'stable',
        label: 'Stable Yield',
        href: '/simple/stable',
        icon: Coins,
        searchKeywords: ['stablecoin', 'usdc', 'usdt', 'dai', 'yield', 'stable', 'low-risk'],
      },
      {
        id: 'strategies',
        label: 'Strategies',
        href: '/strategies',
        icon: Target,
        searchKeywords: ['strategy', 'vault', 'automated', 'optimize', 'advanced', 'yield'],
      },
      {
        id: 'wallet',
        label: 'Wallet',
        href: '/wallet',
        icon: Wallet,
        searchKeywords: ['balance', 'tokens', 'assets', 'holdings', 'portfolio'],
      },
    ],
  },
  {
    id: 'secondary',
    label: 'More',
    items: [
      {
        id: 'points',
        label: 'Points',
        href: '/points',
        icon: Award,
        badge: 'NEW',
        searchKeywords: ['rewards', 'loyalty', 'bonus', 'incentives', 'earn'],
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        searchKeywords: ['preferences', 'config', 'options', 'account', 'profile'],
      },
      {
        id: 'docs',
        label: 'Docs',
        href: 'https://docs.prism.fi',
        icon: BookOpen,
        external: true,
        searchKeywords: ['documentation', 'help', 'guide', 'tutorial', 'learn', 'support'],
      },
    ],
  },
];
