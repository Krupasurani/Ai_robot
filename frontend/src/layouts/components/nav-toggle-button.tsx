import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export type NavToggleButtonProps = React.ComponentProps<typeof Button> & {
  isNavMini: boolean;
};

export function NavToggleButton({ isNavMini, className, ...other }: NavToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'p-0.5 top-6 fixed -translate-x-1/2 z-[1101]',
        'bg-background border border-border/12',
        'hover:bg-secondary hover:text-foreground',
        'transition-all duration-200 ease-in-out',
        isNavMini
          ? 'left-16' // 64px - mini nav width
          : 'left-80', // 320px - full nav width
        className
      )}
      {...other}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('size-4', isNavMini && 'scale-x-[-1]')}
      >
        <path
          fill="currentColor"
          d="M13.83 19a1 1 0 0 1-.78-.37l-4.83-6a1 1 0 0 1 0-1.27l5-6a1 1 0 0 1 1.54 1.28L10.29 12l4.32 5.36a1 1 0 0 1-.78 1.64"
        />
      </svg>
    </Button>
  );
}
