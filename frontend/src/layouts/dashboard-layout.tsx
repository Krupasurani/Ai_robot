import * as React from 'react';
import type { NavSectionProps } from 'src/components/nav-section/nav-section';
import { PanelLeft } from 'lucide-react';
// import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/sidebar';
import { UserProvider } from '@/context/UserContext';
import { useSidebar, SidebarInset } from '@/components/ui/sidebar';
import { useAdmin } from 'src/context/AdminContext';
import { PlatformSettingsProvider } from 'src/context/PlatformSettingsContext';
// import { getOrgLogo, getOrgIdFromToken } from 'src/sections/accountdetails/utils';
import { useAuthContext } from 'src/auth/hooks';
// import { getDashboardNavData } from './config-nav-dashboard';
import { ThemeToggle } from './components/shadcn-toggle-theme';

export type DashboardLayoutProps = {
  children: React.ReactNode;
  data?: {
    nav?: NavSectionProps['data'];
  };
};

/**
 * Dashboard layout - Sidebar navigation with main content area.
 * Uses Shadcn Sidebar component for responsive navigation.
 */
export function DashboardLayout({ children, data }: DashboardLayoutProps) {
  // const { user } = useAuthContext();
  // const { isAdmin } = useAdmin();
  // const dynamicNavData = getDashboardNavData(user?.accountType, isAdmin);
  // const navData = data?.nav ?? dynamicNavData;
  // const [customLogo, setCustomLogo] = useState<string | null>('');
  // const isBusiness =
  //   user?.accountType === 'business' ||
  //   user?.accountType === 'organization' ||
  //   user?.role === 'business';

  // useEffect(() => {
  //   const fetchLogo = async () => {
  //     try {
  //       const orgId = await getOrgIdFromToken();
  //       if (isBusiness) {
  //         const logoUrl = await getOrgLogo(orgId);
  //         // setCustomLogo(logoUrl);
  //       }
  //     } catch (err) {
  //       console.error(err, 'error in fetching logo');
  //     }
  //   };

  //   fetchLogo();
  // }, [isBusiness]);

  const { toggleSidebar } = useSidebar();

  return (
    <UserProvider>
      <PlatformSettingsProvider>
        <AppSidebar />
        <main className="w-full min-h-screen bg-background text-foreground scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent dark:scrollbar-thumb-border/50">
          <SidebarInset className="flex min-h-screen flex-col">
            {/* Mobile Header */}
            <div className="flex h-12 items-center border-b bg-sidebar text-sidebar-foreground md:hidden">
              <div className="flex w-full items-center justify-between px-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground"
                  aria-label="Open Sidebar"
                  onClick={toggleSidebar}
                >
                  <PanelLeft size={20} />
                </Button>
                <ThemeToggle />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">{children}</div>
          </SidebarInset>
        </main>
      </PlatformSettingsProvider>
    </UserProvider>
  );
}
