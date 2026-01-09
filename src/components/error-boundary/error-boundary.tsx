/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorBoundaryProps {
  /** Children to render */
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Custom fallback render function */
  fallbackRender?: (props: FallbackProps) => ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when reset is triggered */
  onReset?: () => void;
  /** Feature name for context */
  feature?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  feature?: string;
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, fallbackRender, feature } = this.props;

    if (hasError) {
      // Custom fallback render function
      if (fallbackRender) {
        return fallbackRender({
          error,
          errorInfo,
          resetError: this.resetError,
          feature,
        });
      }

      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          feature={feature}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// DEFAULT FALLBACK COMPONENT
// =============================================================================

export function DefaultErrorFallback({
  error,
  resetError,
  feature,
}: FallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <Card className="max-w-lg w-full p-6 bg-red-500/10 border-red-500/30">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              {feature ? `${feature} Error` : 'Something went wrong'}
            </h2>
            <p className="text-secondary-400 text-sm">
              {isDev && error?.message
                ? error.message
                : "We're sorry, but something unexpected happened. Please try again."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={resetError} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard')}
              className="gap-2 border-secondary-600"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>

          {/* Debug Info (Dev Only) */}
          {isDev && error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-secondary-500 cursor-pointer flex items-center gap-1">
                <Bug className="h-3 w-3" />
                Debug Information
              </summary>
              <pre className="mt-2 p-3 bg-secondary-900 rounded text-xs text-secondary-400 overflow-auto max-h-40">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// FEATURE-SPECIFIC ERROR BOUNDARIES
// =============================================================================

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  feature: string;
}

/**
 * Wallet Feature Error Boundary
 */
export function WalletErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="Wallet"
      fallbackRender={({ error, resetError }) => (
        <Card className="p-6 bg-red-500/10 border-red-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Wallet Error</h3>
              <p className="text-sm text-secondary-400 mb-3">
                There was a problem loading your wallet. Please try refreshing.
              </p>
              <Button size="sm" onClick={resetError}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Transaction Error Boundary
 */
export function TransactionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="Transaction"
      fallbackRender={({ error, resetError }) => (
        <Card className="p-6 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Transaction Error</h3>
              <p className="text-sm text-secondary-400 mb-3">
                The transaction could not be completed. Your funds are safe.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={resetError}>
                  Try Again
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Data Loading Error Boundary
 */
export function DataErrorBoundary({ children, feature = 'Data' }: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      feature={feature}
      fallbackRender={({ resetError }) => (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-secondary-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load {feature}</h3>
          <p className="text-sm text-secondary-400 mb-4">
            We couldn&apos;t load the data. Please try again.
          </p>
          <Button size="sm" onClick={resetError}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Compact Card Error Boundary - for dashboard position cards
 */
export function CardErrorBoundary({ children, feature = 'Data' }: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      feature={feature}
      fallbackRender={({ resetError }) => (
        <Card className="h-full bg-surface rounded-xl border border-red-500/30 overflow-hidden">
          <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="font-medium text-white mb-2">Failed to load {feature}</h3>
            <p className="text-sm text-secondary-400 mb-4">
              Something went wrong loading this section.
            </p>
            <Button size="sm" variant="outline" onClick={resetError} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Dashboard Staking Error Boundary
 */
export function StakingErrorBoundary({ children }: { children: ReactNode }) {
  return <CardErrorBoundary feature="Staking">{children}</CardErrorBoundary>;
}

/**
 * Dashboard Lending Error Boundary
 */
export function LendingErrorBoundary({ children }: { children: ReactNode }) {
  return <CardErrorBoundary feature="Lending">{children}</CardErrorBoundary>;
}

/**
 * Dashboard Stable Yield Error Boundary
 */
export function StableYieldErrorBoundary({ children }: { children: ReactNode }) {
  return <CardErrorBoundary feature="Stable Yield">{children}</CardErrorBoundary>;
}

/**
 * Dashboard Strategies Error Boundary
 */
export function StrategiesErrorBoundary({ children }: { children: ReactNode }) {
  return <CardErrorBoundary feature="Strategies">{children}</CardErrorBoundary>;
}

/**
 * Portfolio Chart Error Boundary
 */
export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="Chart"
      fallbackRender={({ resetError }) => (
        <Card className="bg-surface rounded-xl border border-border p-6">
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-10 w-10 text-secondary-500 mb-4" />
            <h3 className="font-medium text-white mb-2">Chart Unavailable</h3>
            <p className="text-sm text-secondary-400 mb-4">
              We couldn&apos;t load the chart data.
            </p>
            <Button size="sm" variant="outline" onClick={resetError} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
