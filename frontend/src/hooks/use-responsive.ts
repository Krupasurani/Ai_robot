import { useState, useEffect, useMemo } from 'react';

type UseResponsiveReturn = boolean;

export type Query = 'up' | 'down' | 'between' | 'only';

export type Value = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

// Tailwind breakpoints (default)
const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Convert breakpoint name to pixel value
function getBreakpointValue(value: Value): number {
  if (typeof value === 'number') {
    return value;
  }
  return breakpoints[value] || 0;
}

// Create media query string
function createMediaQuery(query: Query, start?: Value, end?: Value): string {
  switch (query) {
    case 'up': {
      const minWidth = getBreakpointValue(start || 'xs');
      return `(min-width: ${minWidth}px)`;
    }
    case 'down': {
      const maxWidth = getBreakpointValue(start || 'xl') - 1;
      return `(max-width: ${maxWidth}px)`;
    }
    case 'between': {
      const minWidth = getBreakpointValue(start || 'xs');
      const maxWidth = getBreakpointValue(end || 'xl') - 1;
      return `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
    }
    case 'only': {
      const breakpoint = start as keyof typeof breakpoints;
      const minWidth = breakpoints[breakpoint] || 0;
      const nextBreakpoint = Object.keys(breakpoints).find(
        (key, index, arr) => arr[index - 1] === breakpoint
      );
      const maxWidth = nextBreakpoint
        ? breakpoints[nextBreakpoint as keyof typeof breakpoints] - 1
        : 9999;
      return `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
    }
    default:
      return '(min-width: 0px)';
  }
}

export function useResponsive(query: Query, start?: Value, end?: Value): UseResponsiveReturn {
  const mediaQuery = useMemo(() => createMediaQuery(query, start, end), [query, start, end]);

  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQuery).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(mediaQuery);

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Create handler
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler);
      return () => mediaQueryList.removeEventListener('change', handler);
    }
    // Fallback for older browsers
    else {
      mediaQueryList.addListener(handler);
      return () => mediaQueryList.removeListener(handler);
    }
  }, [mediaQuery]);

  return matches;
}

type UseWidthReturn = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function useWidth(): UseWidthReturn {
  const [width, setWidth] = useState<UseWidthReturn>(() => {
    if (typeof window === 'undefined') return 'xs';

    const w = window.innerWidth;
    if (w >= breakpoints.xl) return 'xl';
    if (w >= breakpoints.lg) return 'lg';
    if (w >= breakpoints.md) return 'md';
    if (w >= breakpoints.sm) return 'sm';
    return 'xs';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= breakpoints.xl) setWidth('xl');
      else if (w >= breakpoints.lg) setWidth('lg');
      else if (w >= breakpoints.md) setWidth('md');
      else if (w >= breakpoints.sm) setWidth('sm');
      else setWidth('xs');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
