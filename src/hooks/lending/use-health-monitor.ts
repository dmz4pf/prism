/**
 * useHealthMonitor Hook
 *
 * Monitors user's lending positions and alerts on health factor changes.
 * Polls every 10 seconds and shows toast notifications for risk.
 */

import { useEffect, useRef, useState } from 'react';
import { Address } from 'viem';
import { useLendingPositions } from './use-lending-positions';
import { toast } from 'sonner';
import { AlertTriangle, Shield, TrendingDown } from 'lucide-react';

interface HealthAlert {
  id: string;
  level: 'warning' | 'danger' | 'critical';
  message: string;
  healthFactor: number;
  positionId: string;
  timestamp: number;
}

export interface UseHealthMonitorOptions {
  pollInterval?: number;
  enabled?: boolean;
  thresholds?: {
    warning: number;
    danger: number;
    critical: number;
  };
}

export interface UseHealthMonitorReturn {
  alerts: HealthAlert[];
  lowestHealthFactor: number;
  isMonitoring: boolean;
  dismissAlert: (id: string) => void;
  dismissAll: () => void;
}

const DEFAULT_THRESHOLDS = {
  warning: 1.5,
  danger: 1.3,
  critical: 1.1,
};

const DEFAULT_POLL_INTERVAL = 10000;

const dismissedAlerts = new Set<string>();

export function useHealthMonitor(
  userAddress: Address | undefined,
  options: UseHealthMonitorOptions = {}
): UseHealthMonitorReturn {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    enabled = true,
    thresholds = DEFAULT_THRESHOLDS,
  } = options;

  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [lowestHealthFactor, setLowestHealthFactor] = useState<number>(Infinity);

  const { positions } = useLendingPositions({
    enabled: enabled && !!userAddress,
    refetchInterval: pollInterval,
  });

  const previousHealthFactorsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled || !userAddress || positions.length === 0) {
      setAlerts([]);
      setLowestHealthFactor(Infinity);
      return;
    }

    const newAlerts: HealthAlert[] = [];
    let lowest = Infinity;

    for (const position of positions) {
      if (!position.healthFactor || position.healthFactor === Infinity) {
        continue;
      }

      const hf = position.healthFactor;
      lowest = Math.min(lowest, hf);

      const previousHF = previousHealthFactorsRef.current.get(position.id);
      const alertId = `${position.id}-${Date.now()}`;

      if (dismissedAlerts.has(alertId)) continue;

      // Critical alert (HF < 1.1)
      if (hf < thresholds.critical) {
        const alert: HealthAlert = {
          id: alertId,
          level: 'critical',
          message: `URGENT: ${position.assetSymbol} on ${position.protocol} is at risk of liquidation!`,
          healthFactor: hf,
          positionId: position.id,
          timestamp: Date.now(),
        };
        newAlerts.push(alert);

        if (!previousHF || previousHF >= thresholds.critical) {
          toast.error(alert.message, {
            description: `Health Factor: ${hf.toFixed(2)}`,
            duration: Infinity,
            action: {
              label: 'Add Collateral',
              onClick: () => {
                window.location.href = `/lending/positions`;
              },
            },
          });
        }
      }
      // Danger alert (HF < 1.3)
      else if (hf < thresholds.danger) {
        const alert: HealthAlert = {
          id: alertId,
          level: 'danger',
          message: `Warning: ${position.assetSymbol} on ${position.protocol} health factor is low`,
          healthFactor: hf,
          positionId: position.id,
          timestamp: Date.now(),
        };
        newAlerts.push(alert);

        if (!previousHF || previousHF >= thresholds.danger) {
          toast.warning(alert.message, {
            description: `Health Factor: ${hf.toFixed(2)}. Consider adding collateral.`,
            duration: 10000,
          });
        }
      }
      // Warning alert (HF < 1.5)
      else if (hf < thresholds.warning) {
        const alert: HealthAlert = {
          id: alertId,
          level: 'warning',
          message: `${position.assetSymbol} on ${position.protocol} health factor below recommended`,
          healthFactor: hf,
          positionId: position.id,
          timestamp: Date.now(),
        };
        newAlerts.push(alert);

        if (!previousHF || previousHF >= thresholds.warning) {
          toast.info(alert.message, {
            description: `Health Factor: ${hf.toFixed(2)}. Monitor your position.`,
            duration: 5000,
          });
        }
      }

      previousHealthFactorsRef.current.set(position.id, hf);
    }

    setAlerts(newAlerts);
    setLowestHealthFactor(lowest);
  }, [positions, enabled, userAddress, thresholds]);

  const dismissAlert = (id: string) => {
    dismissedAlerts.add(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.dismiss();
  };

  const dismissAll = () => {
    alerts.forEach((alert) => dismissedAlerts.add(alert.id));
    setAlerts([]);
    toast.dismiss();
  };

  return {
    alerts,
    lowestHealthFactor,
    isMonitoring: enabled && !!userAddress,
    dismissAlert,
    dismissAll,
  };
}

export function clearDismissedAlerts() {
  dismissedAlerts.clear();
}
