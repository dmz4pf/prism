'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Goal = 'safe' | 'max' | 'stake' | 'browse';
type SortBy = 'apy' | 'tvl' | 'risk';
type SortOrder = 'asc' | 'desc';

interface UIState {
  // Modal state
  depositModal: { isOpen: boolean; opportunityId: string | null };
  withdrawModal: { isOpen: boolean; positionId: string | null };

  // Filter state
  selectedGoal: Goal;
  selectedChain: number | null;
  selectedCategory: string | null;
  sortBy: SortBy;
  sortOrder: SortOrder;

  // Actions
  openDepositModal: (opportunityId: string) => void;
  closeDepositModal: () => void;
  openWithdrawModal: (positionId: string) => void;
  closeWithdrawModal: () => void;
  setGoal: (goal: Goal) => void;
  setChain: (chainId: number | null) => void;
  setCategory: (category: string | null) => void;
  setSorting: (sortBy: SortBy, sortOrder: SortOrder) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      depositModal: { isOpen: false, opportunityId: null },
      withdrawModal: { isOpen: false, positionId: null },
      selectedGoal: 'browse',
      selectedChain: null,
      selectedCategory: null,
      sortBy: 'apy',
      sortOrder: 'desc',

      // Actions
      openDepositModal: (opportunityId) =>
        set({ depositModal: { isOpen: true, opportunityId } }),
      closeDepositModal: () =>
        set({ depositModal: { isOpen: false, opportunityId: null } }),
      openWithdrawModal: (positionId) =>
        set({ withdrawModal: { isOpen: true, positionId } }),
      closeWithdrawModal: () =>
        set({ withdrawModal: { isOpen: false, positionId: null } }),
      setGoal: (goal) => set({ selectedGoal: goal }),
      setChain: (chainId) => set({ selectedChain: chainId }),
      setCategory: (category) => set({ selectedCategory: category }),
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      resetFilters: () =>
        set({
          selectedGoal: 'browse',
          selectedChain: null,
          selectedCategory: null,
          sortBy: 'apy',
          sortOrder: 'desc',
        }),
    }),
    {
      name: 'prism-ui-store',
      partialize: (state) => ({
        selectedGoal: state.selectedGoal,
        selectedChain: state.selectedChain,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
