import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { cn } from '@/utils/cn';

import { SettingsSidebar } from './Sidebar';

/**
 * Settings Layout - Full-screen dual-sidebar shell for settings pages.
 *
 * Architecture:
 * - Fixed overlay that covers the entire viewport (including AppSidebar)
 * - Grid: [Rail (68px)] [Nav (240px)] [Main Content (1fr)]
 * - Main content has a "raised sheet" appearance with rounded top-left corner
 *
 * Performance optimizations:
 * - Removed AnimatePresence for faster page transitions
 * - Uses Suspense for lazy-loaded child routes
 */

function SettingsLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function SettingsLayout() {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'h-screen w-screen overflow-hidden',
        'grid grid-cols-[auto_auto_1fr]',
        'bg-[#0f0f10]' // Global matte black background
      )}
    >
      {/* Sidebar (Rail + Navigation) */}
      <SettingsSidebar />

      {/* Main Content Area - "Card/Sheet" effect */}
      <main
        className={cn(
          'relative flex flex-col',
          'bg-[#141415]', // Slightly lighter than global bg
          'rounded-tl-3xl', // Strong top-left rounding
          'border-l border-t border-zinc-800/50',
          'shadow-[-4px_0_24px_rgba(0,0,0,0.3)]' // Subtle shadow for depth
        )}
      >
        {/* Scrollable content wrapper with Suspense for lazy routes */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<SettingsLoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default SettingsLayout;

