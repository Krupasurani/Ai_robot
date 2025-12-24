import { domAnimation, LazyMotion } from 'framer-motion';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

/**
 * Provides lazy-loaded framer-motion features to reduce initial bundle size.
 * Uses `domAnimation` instead of `domMax` for ~40KB bundle reduction.
 *
 * Note: `domAnimation` supports: animate, exit, variants, transition, initial
 * If you need drag, layout animations, or gestures, use `domMax` instead.
 */
export function MotionLazy({ children }: Props) {
  return (
    <LazyMotion strict features={domAnimation}>
      {children}
    </LazyMotion>
  );
}
