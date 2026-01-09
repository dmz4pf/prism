'use client';

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ExternalLink, LogOut, ChevronDown, ChevronsLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function UserSection() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isExpanded, toggleSidebar } = useSidebar();
  const [copied, setCopied] = useState(false);

  // Truncate address
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // View on explorer
  const viewOnExplorer = () => {
    if (!address) return;
    window.open(`https://basescan.org/address/${address}`, '_blank');
  };

  return (
    <div className="border-t border-border/50 p-4 space-y-3">
      {/* Collapse Toggle Button */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200',
                'hover:bg-white/5',
                !isExpanded && 'justify-center'
              )}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronsLeft className="h-5 w-5 text-secondary-400" />
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium text-secondary-400"
                  >
                    Collapse
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* User Wallet Dropdown */}
      {address && (
        <DropdownMenu>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200',
                    'hover:bg-white/5 focus:outline-none',
                    !isExpanded && 'justify-center'
                  )}
                >
                  {/* Avatar/Identicon */}
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {address.slice(2, 4).toUpperCase()}
                    </span>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {truncateAddress(address)}
                        </p>
                        <p className="text-xs text-secondary-500">Base Network</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isExpanded && (
                    <ChevronDown className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                  )}
                </DropdownMenuTrigger>
              </TooltipTrigger>

              {!isExpanded && (
                <TooltipContent side="right">
                  {truncateAddress(address)}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Address'}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={viewOnExplorer} className="cursor-pointer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => disconnect()}
              className="cursor-pointer text-red-400 focus:text-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
