'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface NavItemProps {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  external?: boolean;
  searchKeywords?: string[];
  onClick?: () => void;
}

export function NavItem({ id, label, href, icon: Icon, badge, external, onClick }: NavItemProps) {
  const pathname = usePathname();
  const { isExpanded, closeMobileSidebar } = useSidebar();

  // Check if this route is active
  const isActive = pathname === href || pathname?.startsWith(href + '/');

  // Handle click - close mobile sidebar if open
  const handleClick = () => {
    closeMobileSidebar();
    onClick?.();
  };

  // =============================================================================
  // EXPANDED STATE - Gradient Pill Design
  // =============================================================================

  if (isExpanded) {
    return (
      <Link
        href={href}
        onClick={handleClick}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
            : 'text-secondary-300 hover:bg-white/5 hover:text-white'
        )}
      >
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0"
        >
          <Icon
            className={cn(
              'h-5 w-5 transition-colors',
              isActive ? 'text-white' : 'text-secondary-400 group-hover:text-white'
            )}
          />
        </motion.div>

        {/* Label & Badge */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={cn(
              'text-sm font-medium truncate',
              isActive ? 'text-white' : 'text-secondary-300 group-hover:text-white'
            )}
          >
            {label}
          </span>

          {/* External link icon */}
          {external && (
            <ExternalLink className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
          )}

          {/* Badge */}
          {badge && (
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-500/20 text-blue-400'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Active indicator subtle glow */}
        {isActive && (
          <motion.div
            layoutId="navItemGradient"
            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg -z-10 opacity-20 blur-md"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    );
  }

  // =============================================================================
  // COLLAPSED STATE - Icon Only with Gradient Background
  // =============================================================================

  const content = (
    <Link
      href={href}
      onClick={handleClick}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        'group relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
          : 'hover:bg-white/5'
      )}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Icon
          className={cn(
            'h-5 w-5 transition-colors',
            isActive ? 'text-white' : 'text-secondary-400 group-hover:text-white'
          )}
        />
      </motion.div>

      {/* Active indicator glow */}
      {isActive && (
        <motion.div
          layoutId="navItemGradientCollapsed"
          className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg -z-10 opacity-20 blur-md"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}

      {/* Badge indicator dot */}
      {badge && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </Link>
  );

  // Wrap with tooltip when collapsed
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {badge && (
            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
