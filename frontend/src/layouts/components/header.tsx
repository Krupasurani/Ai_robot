import * as React from 'react';
import { cn } from '@/utils/cn';
import { useScrollOffSetTop } from 'src/hooks/use-scroll-offset-top';

export type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  left?: React.ReactNode;
  right?: React.ReactNode;
  center?: React.ReactNode;
  sticky?: boolean;
};

/**
 * Header component following Shadcn patterns.
 * Simple, composable header with left, center, and right slots.
 */
export function Header({ className, left, right, center, sticky = true, ...other }: HeaderProps) {
  const { offsetTop } = useScrollOffSetTop();

  return (
    <header
      data-slot="header"
      className={cn(
        'border-b border-border bg-background',
        sticky && 'sticky top-0 z-[1100]',
        offsetTop && 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
      {...other}
    >
      <div className="flex h-16 items-center px-4 md:h-[72px] md:px-6">
        {left && <div className="flex items-center">{left}</div>}

        {center && <div className="flex flex-1 justify-center">{center}</div>}

        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}

