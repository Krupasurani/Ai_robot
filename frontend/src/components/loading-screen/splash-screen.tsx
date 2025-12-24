import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  portal?: boolean;
  className?: string;
};

export function SplashScreen({ portal = true, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const content = (
    <div className="overflow-hidden">
      <div
        className={cn(
          'fixed inset-0 z-[9998] flex flex-col items-center justify-center',
          'bg-gradient-radial from-background/10 to-background',
          'transition-opacity duration-300 ease-in-out',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        <img
          src="/logo/logo-color-transparent.png"
          alt="Logo"
          className={cn(
            'h-auto transition-all duration-500 ease-out',
            loaded ? 'scale-100' : 'scale-90',
            'w-[180px] sm:w-[240px] md:w-[300px]'
          )}
        />

        {/* Loading indicators */}
        <div className="mt-4 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-primary opacity-70 transition-opacity duration-300"
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}
