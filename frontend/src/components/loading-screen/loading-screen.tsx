import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  portal?: boolean;
  className?: string;
};

export function LoadingScreen({ portal, className }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [dotOpacity, setDotOpacity] = useState([0.4, 0.6, 0.8]);

  // Add a small delay before showing the animation for a smoother entry
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Simple dot animation using state changes instead of keyframes
  useEffect(() => {
    if (!loaded) return undefined;

    const interval = setInterval(() => {
      setDotOpacity((prev) => [prev[2], prev[0], prev[1]]);
    }, 500);

    return () => clearInterval(interval);
  }, [loaded]);

  const content = (
    <div
      className={cn(
        'px-12 w-full min-h-screen flex flex-col items-center justify-center',
        'transition-all duration-500',
        loaded ? 'opacity-100' : 'opacity-0',
        'bg-gradient-radial from-background/10 to-background',
        className
      )}
    >
      <img
        src="/logo/logo-color-transparent.png"
        alt="Logo"
        className={cn(
          'h-auto transition-all duration-500 ease-in-out',
          'drop-shadow-[0_0_10px_rgba(0,60,255,0.2)]',
          loaded ? 'scale-100' : 'scale-90',
          'w-[180px] sm:w-[240px] md:w-[280px]'
        )}
      />

      {/* Add loading dots below the logo */}
      <div className="mt-4 flex items-center justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 rounded-full bg-primary transition-opacity duration-300',
              `opacity-${Math.round(dotOpacity[i] * 100)}`
            )}
            style={{ opacity: dotOpacity[i] }}
          />
        ))}
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}
