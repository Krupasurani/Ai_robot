import * as React from 'react';
import { cn } from '@/utils/cn';
import { CONFIG } from 'src/config-global';
import { Header } from './components/header';
import { ThemeToggleButton } from './components/theme-toggle-button';

export type AuthCenteredLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  header?: {
    className?: string;
  };
};

/**
 * Auth centered layout - Fixed header with centered content area.
 * Perfect for authentication pages with background image.
 */
export function AuthCenteredLayout({
  className,
  children,
  header,
  ...other
}: AuthCenteredLayoutProps) {
  return (
    <div
      data-slot="layout"
      className={cn(
        'relative flex min-h-screen flex-col overflow-hidden',
        'before:fixed before:inset-0 before:-z-10 before:opacity-20 before:bg-cover before:bg-no-repeat before:bg-center',
        className
      )}
      style={
        {
          '--background-image': `url(${CONFIG.assetsDir}/assets/background/background-3-blur.webp)`,
        } as React.CSSProperties
      }
      {...other}
    >
      <Header
        className={cn('md:fixed w-full', header?.className)}
        left={<img src="/logo/Icon_4.png" alt="Logo" className="h-[30px] w-[60px]" />}
        right={<ThemeToggleButton />}
      />

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md rounded-lg border bg-background/95 backdrop-blur-sm p-6 shadow-lg sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
