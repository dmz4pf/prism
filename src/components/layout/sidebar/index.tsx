'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useIsMobile } from '@/hooks/use-media-query';
import { navigationGroups } from '@/config/navigation';
import { NavItem } from './nav-item';
import { UserSection } from './user-section';
import { SearchBar } from './search-bar';
import { useEffect, useMemo } from 'react';

export function Sidebar() {
  const {
    isExpanded,
    isMobileOpen,
    closeMobileSidebar,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
  } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Don't render sidebar on landing page
  const isLandingPage = pathname === '/';

  // Close mobile sidebar on route change
  useEffect(() => {
    if (!isLandingPage) {
      closeMobileSidebar();
    }
  }, [pathname, closeMobileSidebar, isLandingPage]);

  if (isLandingPage) {
    return null;
  }

  // =============================================================================
  // SEARCH FILTERING
  // =============================================================================

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return navigationGroups;
    }

    const query = searchQuery.toLowerCase();

    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // Match label
          if (item.label.toLowerCase().includes(query)) return true;

          // Match search keywords if available
          if (item.searchKeywords?.some((kw) => kw.toLowerCase().includes(query))) {
            return true;
          }

          return false;
        }),
      }))
      .filter((group) => group.items.length > 0); // Remove empty groups
  }, [searchQuery]);

  // =============================================================================
  // ANIMATION VARIANTS
  // =============================================================================

  const sidebarVariants = {
    expanded: {
      width: 260,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    collapsed: {
      width: 72,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const mobileVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      },
    },
  };

  const backdropVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  };

  // =============================================================================
  // SIDEBAR CONTENT
  // =============================================================================

  const sidebarContent = (
    <motion.aside
      variants={isMobile ? mobileVariants : sidebarVariants}
      animate={isMobile ? (isMobileOpen ? 'open' : 'closed') : (isExpanded ? 'expanded' : 'collapsed')}
      className={cn(
        'flex flex-col h-full',
        'bg-[#0F0F14] border-r border-white/5',
        'sidebar-minimal',
        isMobile ? 'fixed left-0 top-0 w-[260px] z-50' : 'sticky top-0'
      )}
    >
      {/* ===== HEADER ===== */}
      <div className={cn(
        'flex items-center p-4 border-b border-white/5',
        isExpanded || isMobile ? 'justify-between' : 'justify-center'
      )}>
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="font-heading font-bold text-white">P</span>
          </div>

          <AnimatePresence>
            {(isExpanded || isMobile) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="font-heading text-xl font-bold text-white"
              >
                PRISM
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={closeMobileSidebar}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-400" />
          </button>
        )}

        {/* Desktop toggle button */}
        {!isMobile && (
          <motion.button
            onClick={toggleSidebar}
            className={cn(
              'p-1.5 hover:bg-white/5 rounded-lg transition-colors',
              !isExpanded && 'absolute right-2 top-4'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4 text-secondary-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-secondary-400" />
            )}
          </motion.button>
        )}
      </div>

      {/* ===== SEARCH BAR (Only when expanded or mobile) ===== */}
      {(isExpanded || isMobile) && (
        <div className="p-4 border-b border-white/5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search navigation..."
          />
        </div>
      )}

      {/* ===== NAVIGATION ===== */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6 sidebar-scroll">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Label */}
              {group.label && (isExpanded || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 py-2"
                >
                  <span className="text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    {group.label}
                  </span>
                </motion.div>
              )}

              {/* Navigation Items */}
              <div className={cn(
                'space-y-1',
                !isExpanded && !isMobile && 'flex flex-col items-center'
              )}>
                {group.items.map((item) => (
                  <NavItem key={item.id} {...item} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Empty state when search returns no results
          (isExpanded || isMobile) && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-secondary-500">No results found</p>
              <p className="text-xs text-secondary-600 mt-1">Try a different search term</p>
            </div>
          )
        )}
      </nav>

      {/* ===== USER SECTION (Bottom) ===== */}
      <UserSection />
    </motion.aside>
  );

  // =============================================================================
  // MOBILE: Sidebar with backdrop
  // =============================================================================

  if (isMobile) {
    return (
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={closeMobileSidebar}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Sidebar */}
            {sidebarContent}
          </>
        )}
      </AnimatePresence>
    );
  }

  // =============================================================================
  // DESKTOP: Sidebar only
  // =============================================================================

  return sidebarContent;
}
