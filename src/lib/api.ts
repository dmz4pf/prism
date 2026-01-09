import { z } from 'zod';
import type { Yield, Position, PointsBalance, LeaderboardEntry, Alert } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class APIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface YieldFilters {
  category?: string;
  chain?: string;
  minApy?: number;
  maxRisk?: number;
  sortBy?: 'apy' | 'tvl' | 'risk';
}

interface TrackDepositParams {
  protocol: string;
  chain: string;
  token: string;
  amount: string;
  amountUsd: number;
  depositTxHash: string;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(response.status, error.message || 'Request failed');
    }

    return response.json();
  }

  // Yields
  async getYields(filters?: YieldFilters): Promise<Yield[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.chain) params.set('chain', filters.chain);
    if (filters?.minApy) params.set('minApy', String(filters.minApy));
    if (filters?.maxRisk) params.set('maxRisk', String(filters.maxRisk));
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);

    const query = params.toString();
    return this.request<Yield[]>(`/yields${query ? `?${query}` : ''}`);
  }

  async getFeaturedYields(): Promise<Yield[]> {
    return this.request<Yield[]>('/yields/featured');
  }

  // Positions
  async getPositions(address: string): Promise<Position[]> {
    return this.request<Position[]>(`/user/${address}/positions`);
  }

  async trackDeposit(data: TrackDepositParams): Promise<Position> {
    return this.request<Position>('/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Points
  async getPoints(address: string): Promise<PointsBalance> {
    return this.request<PointsBalance>(`/user/${address}/points`);
  }

  async getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`);
  }

  // Alerts
  async getAlerts(address: string): Promise<Alert[]> {
    return this.request<Alert[]>(`/user/${address}/alerts`);
  }

  async markAlertRead(alertId: string): Promise<void> {
    return this.request(`/alerts/${alertId}/read`, { method: 'POST' });
  }

  // Auth
  async getNonce(): Promise<{ nonce: string }> {
    return this.request<{ nonce: string }>('/auth/nonce');
  }

  async verify(message: string, signature: string): Promise<{ ok: boolean; address: string }> {
    return this.request<{ ok: boolean; address: string }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }

  // Generic GET method for new endpoints
  async get<T = unknown>(endpoint: string): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint);
    return { data };
  }

  // Strategies
  async getStrategies(): Promise<unknown[]> {
    return this.request<unknown[]>('/strategies');
  }

  async getStrategy(id: string): Promise<unknown> {
    return this.request<unknown>(`/strategies/${id}`);
  }

  async getStrategyPositions(walletAddress: string): Promise<unknown[]> {
    return this.request<unknown[]>(`/strategies/positions/${walletAddress}`);
  }

  // Protocol Data
  async getStakingRates(): Promise<unknown[]> {
    return this.request<unknown[]>('/protocols/staking');
  }

  async getLendingRates(): Promise<unknown[]> {
    return this.request<unknown[]>('/protocols/lending');
  }

  async getStableYieldRates(): Promise<unknown[]> {
    return this.request<unknown[]>('/protocols/stables');
  }
}

export const api = new APIClient(API_BASE_URL);
export { APIError };
