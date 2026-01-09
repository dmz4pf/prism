/**
 * DotGridCanvas Component
 *
 * Canvas-based animation layer for the dot grid background.
 * Renders animated scan lines that transform dots into line segments
 * as they pass through.
 *
 * Features:
 * - Horizontal and vertical scan lines
 * - Dots transform to lines when scan passes
 * - Smooth 60fps animation via requestAnimationFrame
 * - Automatic resize handling (throttled)
 * - Pauses when tab is hidden (Page Visibility API)
 * - Performance optimized (no GC during animation)
 */

'use client';

import { useEffect, useRef, useCallback, memo, useState } from 'react';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Grid settings
  dotSpacing: 40,           // Pixels between dots (matches CSS)
  dotRadius: 1,             // Base dot radius
  dotOpacity: 0.08,         // Base dot opacity (matches CSS)

  // Scan line settings
  scanLineWidth: 3,         // Width of the scan line glow
  scanLineOpacity: 0.4,     // Peak opacity of scan line
  scanEffectRadius: 80,     // How far the effect extends from scan line

  // Animation settings
  horizontalScanDuration: 12000,  // ms for full horizontal sweep
  verticalScanDuration: 17000,    // ms for full vertical sweep (prime number offset)
  targetFPS: 30,                  // Target frame rate (30fps for performance)
  frameInterval: 1000 / 30,       // ~33ms between frames

  // Transformation settings
  lineLength: 12,           // Length of line when dot transforms
  transformDuration: 400,   // ms for dot-to-line transformation

  // Colors (pre-calculated for performance)
  horizontalScanColor: { r: 37, g: 99, b: 235 },    // Primary blue (#2563EB)
  verticalScanColor: { r: 6, g: 182, b: 212 },      // Cyan
  dotColor: { r: 255, g: 255, b: 255 },             // White
};

// Pre-calculated color strings to avoid string creation in render loop
const COLORS = {
  horizontalScan: `${CONFIG.horizontalScanColor.r}, ${CONFIG.horizontalScanColor.g}, ${CONFIG.horizontalScanColor.b}`,
  verticalScan: `${CONFIG.verticalScanColor.r}, ${CONFIG.verticalScanColor.g}, ${CONFIG.verticalScanColor.b}`,
  dot: `${CONFIG.dotColor.r}, ${CONFIG.dotColor.g}, ${CONFIG.dotColor.b}`,
};

// =============================================================================
// TYPES
// =============================================================================

interface Dot {
  x: number;
  y: number;
  transformProgress: number;  // 0 = dot, 1 = fully line
  transformDirection: 'h' | 'v' | null;
  lastAffectedTime: number;
}

interface ScanLine {
  position: number;         // 0 to 1 progress
  direction: 'h' | 'v';
  startTime: number;
  duration: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

function DotGridCanvasComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const scanLinesRef = useRef<ScanLine[]>([]);
  const lastTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0); // For FPS throttling
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(true);

  // Initialize dots grid
  const initializeDots = useCallback((width: number, height: number) => {
    const dots: Dot[] = [];
    const { dotSpacing } = CONFIG;

    // Calculate grid with offset to match CSS background-position
    const offsetX = dotSpacing / 2;
    const offsetY = dotSpacing / 2;

    for (let x = offsetX; x < width + dotSpacing; x += dotSpacing) {
      for (let y = offsetY; y < height + dotSpacing; y += dotSpacing) {
        dots.push({
          x,
          y,
          transformProgress: 0,
          transformDirection: null,
          lastAffectedTime: 0,
        });
      }
    }

    dotsRef.current = dots;
  }, []);

  // Initialize scan lines
  const initializeScanLines = useCallback(() => {
    const now = performance.now();
    scanLinesRef.current = [
      {
        position: 0,
        direction: 'v',
        startTime: now,
        duration: CONFIG.verticalScanDuration,
      },
      {
        position: 0,
        direction: 'h',
        startTime: now - CONFIG.horizontalScanDuration * 0.4, // Offset start
        duration: CONFIG.horizontalScanDuration,
      },
    ];
  }, []);

  // Initialize canvas dimensions (called by ResizeObserver when dimensions are available)
  const initializeCanvas = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale context for crisp rendering
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scaling
      ctx.scale(dpr, dpr);
    }

    dimensionsRef.current = { width, height };
    initializeDots(width, height);
    isInitializedRef.current = true;
  }, [initializeDots]);

  // Update scan line positions
  const updateScanLines = useCallback((currentTime: number) => {
    scanLinesRef.current.forEach((scanLine) => {
      const elapsed = currentTime - scanLine.startTime;
      let progress = (elapsed % scanLine.duration) / scanLine.duration;

      // Ease in-out for smoother movement
      progress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      scanLine.position = progress;
    });
  }, []);

  // Update dot transformations based on scan line proximity
  const updateDots = useCallback((currentTime: number, deltaTime: number) => {
    const { width, height } = dimensionsRef.current;
    const { scanEffectRadius, transformDuration } = CONFIG;

    dotsRef.current.forEach((dot) => {
      let nearestDistance = Infinity;
      let nearestDirection: 'h' | 'v' | null = null;

      // Check distance to each scan line
      scanLinesRef.current.forEach((scanLine) => {
        let distance: number;

        if (scanLine.direction === 'h') {
          // Horizontal scan line moves left to right
          const scanX = scanLine.position * width;
          distance = Math.abs(dot.x - scanX);
        } else {
          // Vertical scan line moves top to bottom
          const scanY = scanLine.position * height;
          distance = Math.abs(dot.y - scanY);
        }

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestDirection = scanLine.direction;
        }
      });

      // Determine target transform progress based on distance
      const targetProgress = nearestDistance < scanEffectRadius
        ? 1 - (nearestDistance / scanEffectRadius)
        : 0;

      // Smoothly interpolate transform progress
      const speed = deltaTime / transformDuration;

      if (targetProgress > dot.transformProgress) {
        // Transforming to line - faster
        dot.transformProgress = Math.min(
          dot.transformProgress + speed * 3,
          targetProgress
        );
        dot.transformDirection = nearestDirection;
        dot.lastAffectedTime = currentTime;
      } else {
        // Returning to dot - slower for trail effect
        dot.transformProgress = Math.max(
          dot.transformProgress - speed * 1.5,
          0
        );
        if (dot.transformProgress === 0) {
          dot.transformDirection = null;
        }
      }
    });
  }, []);

  // Render the canvas (optimized for performance)
  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensionsRef.current;
    const { dotRadius, dotOpacity, lineLength } = CONFIG;

    // Clear canvas (transparent to show CSS layer beneath)
    ctx.clearRect(0, 0, width, height);

    // Note: Scan lines are invisible - only used to trigger dot transformations

    // Draw dots/lines (optimized - no save/restore per dot)
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const dots = dotsRef.current;
    const dotsLength = dots.length;

    for (let i = 0; i < dotsLength; i++) {
      const dot = dots[i];

      // Skip dots outside viewport
      if (dot.x < -20 || dot.x > width + 20 || dot.y < -20 || dot.y > height + 20) {
        continue;
      }

      const progress = dot.transformProgress;

      // Skip dots with no transformation (CSS handles static dots)
      if (progress < 0.01) {
        continue;
      }

      // Calculate color and opacity using pre-calculated strings
      let colorStr = COLORS.dot;
      let opacity = dotOpacity + progress * 0.3;

      if (dot.transformDirection === 'h') {
        colorStr = COLORS.horizontalScan;
        opacity = 0.1 + progress * 0.5;
      } else if (dot.transformDirection === 'v') {
        colorStr = COLORS.verticalScan;
        opacity = 0.1 + progress * 0.5;
      }

      const colorWithOpacity = `rgba(${colorStr}, ${opacity})`;
      ctx.strokeStyle = colorWithOpacity;
      ctx.fillStyle = colorWithOpacity;

      // Interpolate between dot and line
      const currentLineLength = lineLength * progress;

      if (progress > 0.5) {
        // Draw as line
        ctx.beginPath();
        if (dot.transformDirection === 'h') {
          ctx.moveTo(dot.x - currentLineLength / 2, dot.y);
          ctx.lineTo(dot.x + currentLineLength / 2, dot.y);
        } else {
          ctx.moveTo(dot.x, dot.y - currentLineLength / 2);
          ctx.lineTo(dot.x, dot.y + currentLineLength / 2);
        }
        ctx.stroke();
      } else {
        // Draw as dot with glow
        const currentDotRadius = dotRadius * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, currentDotRadius + progress * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Main animation loop (throttled to 30fps for performance)
  const animate = useCallback((currentTime: number) => {
    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate);

    // Skip if not initialized yet (waiting for ResizeObserver)
    if (!isInitializedRef.current) {
      return;
    }

    // Throttle to target FPS
    const elapsed = currentTime - lastFrameTimeRef.current;
    if (elapsed < CONFIG.frameInterval) {
      return; // Skip this frame
    }
    lastFrameTimeRef.current = currentTime - (elapsed % CONFIG.frameInterval);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    // Calculate delta time (cap at 100ms to prevent jumps after tab switch)
    const rawDelta = lastTimeRef.current ? currentTime - lastTimeRef.current : 33;
    const deltaTime = Math.min(rawDelta, 100);
    lastTimeRef.current = currentTime;

    // Update state
    updateScanLines(currentTime);
    updateDots(currentTime, deltaTime);

    // Render
    render(ctx);
  }, [updateScanLines, updateDots, render]);

  // Start/stop animation based on visibility
  const startAnimation = useCallback(() => {
    if (animationRef.current) return; // Already running
    lastTimeRef.current = 0; // Reset time to prevent large delta
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Start/stop animation based on visibility
  useEffect(() => {
    if (isVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [isVisible, startAnimation, stopAnimation]);

  // Setup and cleanup using ResizeObserver to detect when canvas has dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use ResizeObserver to detect when canvas actually has dimensions
    // This solves the lazy-loading race condition
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          initializeCanvas(width, height);

          // Initialize scan lines only on first initialization
          if (!scanLinesRef.current.length) {
            initializeScanLines();
          }

          // Start animation if not already running
          startAnimation();
        }
      }
    });

    resizeObserverRef.current.observe(canvas);

    // Cleanup
    return () => {
      stopAnimation();
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [initializeCanvas, initializeScanLines, startAnimation, stopAnimation]);

  return (
    <canvas
      ref={canvasRef}
      className="prism-scan-canvas"
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}

// Memoize to prevent unnecessary re-renders
export const DotGridCanvas = memo(DotGridCanvasComponent);
export default DotGridCanvas;
