import * as React from 'react';
import { cn } from '@/utils/cn';
import { Logo } from 'src/components/custom/logo';
import { Header } from './components/header';
import { ThemeToggleButton } from './components/theme-toggle-button';

export type SimpleLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  header?: {
    className?: string;
  };
  compact?: boolean;
};

/**
 * Simple layout - Clean header + main content structure.
 * Perfect for error pages, maintenance pages, and simple content.
 */
export function SimpleLayout({
  className,
  children,
  header,
  compact,
  ...other
}: SimpleLayoutProps) {
  return (
    <div
      data-slot="layout"
      className={cn('flex min-h-screen flex-col bg-background', className)}
      {...other}
    >
      <Header className={header?.className} left={<Logo />} right={<ThemeToggleButton />} />

      <main className="flex flex-1 flex-col">
        {compact ? (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center">
            {children}
          </div>
        ) : (
          <div className="flex-1 p-4 sm:p-6 md:p-8">{children}</div>
        )}
      </main>
    </div>
  );
}
