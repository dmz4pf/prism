/**
 * DotGridBackground Component
 *
 * Hybrid animated background combining:
 * 1. CSS Layer - Static dot grid (always visible, GPU-accelerated)
 * 2. Canvas Layer - Animated scan lines with dot-to-line transformation
 *
 * Features:
 * - Graceful degradation (CSS-only if Canvas fails)
 * - Respects prefers-reduced-motion
 * - SSR-safe with dynamic imports
 * - Error boundary for canvas failures
 * - Performance optimized
 */

'use client';

import { useState, useEffect, Suspense, lazy, Component, ReactNode } from 'react';

// Lazy load the Canvas component for better initial page load
const DotGridCanvas = lazy(() => import('./dot-grid-canvas'));

// =============================================================================
// ERROR BOUNDARY FOR CANVAS
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error but don't crash the app
    console.warn('[DotGridBackground] Canvas error, falling back to CSS:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface DotGridBackgroundProps {
  /** Enable/disable canvas animation layer */
  enableCanvas?: boolean;
  /** Show fallback CSS scan lines if canvas is disabled */
  showFallbackScan?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// FALLBACK SCAN LINES (CSS-only)
// =============================================================================

function FallbackScanLines() {
  return (
    <div className="prism-fallback-scan">
      <div className="scan-h" />
      <div className="scan-v" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DotGridBackground({
  enableCanvas = true,
  showFallbackScan = true,
  className = '',
}: DotGridBackgroundProps) {
  const [canvasSupported, setCanvasSupported] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Check for canvas support and hydration
  useEffect(() => {
    setIsMounted(true);

    // Test canvas support
    try {
      const testCanvas = document.createElement('canvas');
      const ctx = testCanvas.getContext('2d');
      setCanvasSupported(!!ctx);
    } catch {
      setCanvasSupported(false);
    }
  }, []);

  // Determine what to render
  const shouldShowCanvas = isMounted && enableCanvas && canvasSupported;
  const shouldShowFallback = isMounted && showFallbackScan && !shouldShowCanvas;

  return (
    <div
      className={`prism-bg-system ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      {/* CSS Layer - Always rendered (static dots) */}
      <div className="prism-dot-grid" />

      {/* Canvas Layer - Animated scan lines with dot transformation */}
      {shouldShowCanvas && (
        <CanvasErrorBoundary fallback={showFallbackScan ? <FallbackScanLines /> : null}>
          <Suspense fallback={showFallbackScan ? <FallbackScanLines /> : null}>
            <DotGridCanvas />
          </Suspense>
        </CanvasErrorBoundary>
      )}

      {/* CSS Fallback - Simple scan lines when Canvas is disabled */}
      {shouldShowFallback && <FallbackScanLines />}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DotGridBackground;
