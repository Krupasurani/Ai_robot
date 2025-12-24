import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { useSettingsContext } from 'src/components/settings';

export type DashboardContentProps = HTMLAttributes<HTMLDivElement> & {
  disablePadding?: boolean;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | false;
};

/**
 * Dashboard content wrapper with responsive padding and max-width.
 * Used within DashboardLayout for consistent content spacing.
 */
export function DashboardContent({
  children,
  disablePadding,
  className,
  maxWidth = 'lg',
  ...other
}: DashboardContentProps) {
  const settings = useSettingsContext();
  const maxWidthClass = settings.compactLayout && maxWidth ? `max-w-${maxWidth}` : 'max-w-full';

  return (
    <div
      data-slot="dashboard-content"
      className={cn(
        'flex flex-1 flex-col',
        disablePadding ? 'p-0' : 'p-4 sm:p-6 md:p-8',
        maxWidthClass,
        className
      )}
      {...other}
    >
      {children}
    </div>
  );
}
