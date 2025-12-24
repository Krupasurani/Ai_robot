import React from 'react';
import { cn } from '@/utils/cn';

export interface OrbitingCirclesProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
}

export function OrbitingCircles({
  children,
  className,
  reverse = false,
  duration = 20,
  delay = 0,
  radius = 50,
  path = true,
  ...props
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className="stroke-border/20 fill-none dark:stroke-border/30"
            strokeWidth={1}
          />
        </svg>
      )}
      <div
        className={cn(
          'absolute flex h-full w-full items-center justify-center rounded-full',
          reverse ? 'animate-orbit-reverse' : 'animate-orbit',
          className
        )}
        style={
          {
            '--orbit-radius': `${radius}px`,
            '--orbit-duration': `${duration}s`,
            '--orbit-delay': `${-delay}s`,
            transformOrigin: `50% ${radius}px`,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </>
  );
}
