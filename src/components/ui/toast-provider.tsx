/**
 * Toast Notification System
 *
 * A lightweight toast notification system for displaying:
 * - Success messages
 * - Error messages with optional retry
 * - Warning messages
 * - Info messages
 *
 * Usage:
 * 1. Wrap app with <ToastProvider>
 * 2. Use useToast() hook to show toasts
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string, onRetry?: () => void) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];

    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, onRetry?: () => void) => {
      return addToast({
        type: 'error',
        title,
        message,
        duration: onRetry ? 0 : DEFAULT_DURATIONS.error, // Don't auto-dismiss if retry available
        action: onRetry
          ? {
              label: 'Retry',
              onClick: () => {
                onRetry();
              },
            }
          : undefined,
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'info', title, message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearAll,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// TOAST ITEM
// =============================================================================

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
  },
};

const TOAST_ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const styles = TOAST_STYLES[toast.type];
  const Icon = TOAST_ICONS[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'pointer-events-auto rounded-lg border p-4 shadow-lg backdrop-blur-sm',
        'bg-secondary-900/95',
        styles.border
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm text-secondary-400">{toast.message}</p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onClose();
              }}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 text-sm font-medium',
                'text-blue-400 hover:text-blue-300 transition-colors'
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-secondary-500 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ToastProvider;
