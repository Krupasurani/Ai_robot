import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { paths } from '@/routes/paths';
import { usePathname } from '@/routes/hooks';
import { useAuthContext } from '@/auth/hooks';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdmin } from '@/context/AdminContext';
import { Scrollbar } from '@/components/custom/scrollbar';
import { NavUser } from '@/components/sidebar/nav-setting';
import AccountSidebar from '@/sections/accountdetails/Sidebar';
import { TeamSwitcher } from '@/components/sidebar/nav-user-details';
import { useChatBot } from '@/sections/qna/chatbot/utils/useChatBot';
import { getDashboardNavData } from '@/layouts/config-nav-dashboard';
import ChatSidebar from '@/sections/qna/chatbot/components/chat-sidebar';
import {
  Bot,
  Search,
  Users2,
  Folder,
  SettingsIcon,
  MessageCircle,
  BookMarked,
  Layout,
} from 'lucide-react';
import {
  Sidebar,
  useSidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
} from '@/components/ui/sidebar';

import { useTranslate } from 'src/locales';
import { usePlatformSettings } from 'src/context/PlatformSettingsContext';

import { Separator } from '../ui/separator';
import NavbarItem from '../ui/navbar-item';
import KnowledgeSearchFiltersSidebar from './knowledge-search-filters-sidebar';

export function AppSidebar() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { t } = useTranslate('navbar');
  const { user: currentUser } = useAuthContext();

  const { open } = useSidebar();
  const { isAdmin } = useAdmin();
  const { settings } = usePlatformSettings();
  const { currentConversationId } = useChatBot();

  // Sidebar nav items
  const fullNavData = useMemo(
    () => getDashboardNavData(currentUser?.accountType, isAdmin, t, settings?.featureFlags),
    [currentUser?.accountType, isAdmin, t, settings?.featureFlags]
  );

  // Only show main app navigation (exclude administration/settings blocks from the top nav list)
  const navData = useMemo(
    () =>
      fullNavData.filter(
        (section) =>
          section.subheader !== t('navigation.administration') &&
          section.subheader !== t('navigation.settings')
      ),
    [fullNavData, t]
  );
  const navIcons: Record<string, any> = {
    [t('navigation.assistant')]: MessageCircle,
    [t('navigation.agents')]: Bot,
    [t('navigation.canvas')]: Layout,
    [t('navigation.knowledgeBase')]: Users2,
    [t('navigation.knowledgeSearch')]: Search,
    [t('navigation.promptLibrary')]: BookMarked,
    [t('navigation.projects')]: Folder,
    [t('navigation.connectorSettings')]: SettingsIcon,
  };

  const knowledgeSearchPath = paths.dashboard.knowledgebase.search;
  const isKnowledgeSearchRoute =
    pathname === knowledgeSearchPath || pathname.startsWith(`${knowledgeSearchPath}/`);

  // Hide sidebar on auth and error/maintenance pages
  const hideSidebarRoutes = [
    '/auth',
    '/auth/',
    '/auth/sign-in',
    '/auth/sign-up',
    '/auth/reset-password',
    '/404',
    '/500',
    '/403',
    '/maintenance',
  ];

  if (hideSidebarRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <Sidebar
      collapsible={isMobile ? 'offcanvas' : 'icon'}
      variant="inset"
      className={cn('transition-all duration-300')}
    >
      <SidebarHeader className="px-1.5">
        <TeamSwitcher />
      </SidebarHeader>
      <Separator />
      <SidebarContent className="p-2 h-full min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-0 flex flex-col p-0">
          <NavbarItem navData={navData} navIcons={navIcons} />
          {open && (pathname === '/' || pathname === `/${currentConversationId}`) && (
            <>
              <Separator />
              <Scrollbar className="flex-1">
                <ChatSidebar />
              </Scrollbar>
            </>
          )}
          {open && pathname.startsWith('/account') && pathname !== '/account' && (
            <>
              <Separator />
              <AccountSidebar />
            </>
          )}
          {open && isKnowledgeSearchRoute && (
            <>
              <Separator />
              <Scrollbar className="flex-1">
                <KnowledgeSearchFiltersSidebar />
              </Scrollbar>
            </>
          )}
          {open && pathname.startsWith('/projects') && (
            <>
              <Separator />
              <Scrollbar className="flex-1">
                <ChatSidebar />
              </Scrollbar>
            </>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
