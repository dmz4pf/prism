/**
 * Liquidation Monitor Component
 *
 * A client-side component that runs the health monitor hook
 * and provides persistent liquidation alerts across the app.
 *
 * Place this component in the app layout to enable global monitoring.
 */

'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useHealthMonitor } from '@/hooks/lending/use-health-monitor';
import { Toaster } from 'sonner';

interface LiquidationMonitorProps {
  /** Whether monitoring is enabled */
  enabled?: boolean;
  /** Poll interval in milliseconds */
  pollInterval?: number;
  /** Custom thresholds */
  thresholds?: {
    warning: number;
    danger: number;
    critical: number;
  };
}

/**
 * LiquidationMonitor
 *
 * This component runs in the background and monitors lending positions
 * for health factor changes. When positions approach liquidation risk,
 * it shows toast notifications to warn the user.
 *
 * Usage: Add to your app layout inside providers
 * ```tsx
 * <LiquidationMonitor />
 * ```
 */
export function LiquidationMonitor({
  enabled = true,
  pollInterval = 30000, // 30 seconds default (reduced from 10s for performance)
  thresholds,
}: LiquidationMonitorProps) {
  const { address, isConnected } = useAccount();

  // Run the health monitor
  const { alerts, lowestHealthFactor, isMonitoring } = useHealthMonitor(
    address,
    {
      enabled: enabled && isConnected,
      pollInterval,
      thresholds,
    }
  );

  // Log monitoring status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMonitoring) {
      console.log('[LiquidationMonitor] Active', {
        alerts: alerts.length,
        lowestHealthFactor:
          lowestHealthFactor === Infinity ? 'N/A' : lowestHealthFactor.toFixed(2),
      });
    }
  }, [alerts, lowestHealthFactor, isMonitoring]);

  // This component doesn't render anything visible
  // It just runs the health monitor hook which triggers toasts
  return null;
}

/**
 * LiquidationMonitorProvider
 *
 * Combines the Sonner Toaster with the LiquidationMonitor.
 * Use this if you want a single component that provides both.
 */
export function LiquidationMonitorProvider({
  children,
  monitorEnabled = true,
}: {
  children: React.ReactNode;
  monitorEnabled?: boolean;
}) {
  return (
    <>
      {children}
      <LiquidationMonitor enabled={monitorEnabled} />
      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
    </>
  );
}

export default LiquidationMonitor;
