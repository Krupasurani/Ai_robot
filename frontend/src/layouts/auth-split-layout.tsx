import * as React from 'react';
import { cn } from '@/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RouterLink } from 'src/routes/components';

export type AuthSplitLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  section?: {
    title?: string;
    subtitle?: string;
    methods?: {
      path: string;
      icon: string;
      label: string;
    }[];
  };
};

/**
 * Auth split layout - Split screen with form on left, illustration on right.
 * Perfect for sign-in, sign-up, and authentication flows.
 */
export function AuthSplitLayout({ className, children, section, ...other }: AuthSplitLayoutProps) {
  const {
    title = 'Manage the job with your AI Powered',
    subtitle = 'More effectively with optimized workflows.',
  } = section || {};

  return (
    <div
      data-slot="layout"
      className={cn(
        'flex min-h-screen flex-col overflow-hidden bg-background md:flex-row',
        className
      )}
      {...other}
    >
      {/* Content Area - Form */}
      <main className="flex flex-1 items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Illustration Section */}
      <aside className="hidden min-h-screen w-full flex-col items-start justify-start overflow-hidden bg-muted/30 md:flex md:w-[45%] lg:w-[50%]">
        <div className="flex h-full w-full flex-col p-6 sm:p-8 lg:p-12">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-lg">
            <img
              src="/images/app-ui.png"
              loading="lazy"
              alt="Application UI"
              className="h-full w-full object-cover"
            />
          </div>

          {section?.methods && section.methods.length > 0 && (
            <div className="mt-6 flex gap-2">
              {section.methods.map((option) => (
                <Tooltip key={option.label}>
                  <TooltipTrigger asChild>
                    <RouterLink href={option.path} className="transition-opacity hover:opacity-80">
                      <img alt={option.label} src={option.icon} className="h-8 w-8 rounded" />
                    </RouterLink>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{option.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
