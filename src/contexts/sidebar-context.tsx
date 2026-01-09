'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  isMobileOpen: boolean;
  searchQuery: string;
  toggleSidebar: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setSearchQuery: (query: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'prism-sidebar-expanded';

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Desktop expanded/collapsed state (persisted)
  const [isExpanded, setIsExpanded] = useState(true);

  // Mobile open/closed state (not persisted)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Search query state (not persisted)
  const [searchQuery, setSearchQuery] = useState('');

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
  }, []);

  // Save preference when it changes
  const updateExpanded = (value: boolean) => {
    setIsExpanded(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleSidebar = () => {
    updateExpanded(!isExpanded);
  };

  const expandSidebar = () => {
    updateExpanded(true);
  };

  const collapseSidebar = () => {
    updateExpanded(false);
    // Clear search when collapsing
    setSearchQuery('');
  };

  const openMobileSidebar = () => {
    setIsMobileOpen(true);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
    // Clear search when closing mobile sidebar
    setSearchQuery('');
  };

  const value: SidebarContextType = {
    isExpanded,
    isMobileOpen,
    searchQuery,
    toggleSidebar,
    expandSidebar,
    collapseSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    setSearchQuery,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
