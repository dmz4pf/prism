'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { ReactNode } from 'react';

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * LazyMotion provider for optimized Framer Motion animations.
 *
 * Uses domAnimation feature set which includes:
 * - Animations (animate, initial, exit)
 * - Gestures (whileHover, whileTap, whileDrag)
 * - Layout animations
 *
 * This reduces bundle size by ~50% compared to full motion features
 * and defers loading until animations are needed.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation}>
      {children}
    </LazyMotion>
  );
}
