import { useLocation, useNavigate } from 'react-router';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/utils/cn';
import {
  Globe,
  Link2,
  Users,
  Building,
  Settings,
  Fingerprint,
  UserCogIcon,
  ChevronRight,
  ServerCogIcon,
} from 'lucide-react';
import {
  useSidebar,
  SidebarMenu,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';

import { useTranslate } from 'src/locales';
import { useAdmin } from 'src/context/AdminContext';

import { useAuthContext } from 'src/auth/hooks';

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin } = useAdmin();
  const { t } = useTranslate('navbar');

  // Determine account type
  const isBusiness = user?.accountType === 'business' || user?.accountType === 'organization';

  // Base URL for routing depends on account type
  const baseUrl = isBusiness ? '/account/company-settings' : '/account/individual';
  const personalSettingsBase = isBusiness ? '/account/personal' : '/account/individual/settings';

  // Check if current path is any settings path
  const isSettingsPath =
    pathname.includes(`${baseUrl}/settings/`) || pathname.startsWith(personalSettingsBase);

  // Company settings (admin/business) submenu items - Preferences removed (now only in personal settings)
  const commonSettingsOptions = [
    {
      name: t('navigation.authentication'),
      icon: <Fingerprint className="w-3 h-3" />,
      path: `${baseUrl}/settings/authentication`,
    },
    {
      name: t('navigation.connectors'),
      icon: <Link2 className="w-3 h-3" />,
      path: `${baseUrl}/settings/connector`,
    },
    {
      name: t('navigation.services'),
      icon: <ServerCogIcon className="w-3 h-3" />,
      path: `${baseUrl}/settings/services`,
    },
    {
      name: t('navigation.platformSettings'),
      icon: <ServerCogIcon className="w-3 h-3" />,
      path: `${baseUrl}/settings/platform`,
    },
    {
      name: t('navigation.licenseBilling'),
      icon: <Globe className="w-3 h-3" />,
      path: `${baseUrl}/settings/license`,
    },
  ];

  // Business-specific settings options
  const businessSettingsOptions = [...commonSettingsOptions];

  // Use the appropriate settings options based on account type
  const settingsOptions = isBusiness ? businessSettingsOptions : commonSettingsOptions;
  const { open } = useSidebar();

  // Personal settings submenu for all users
  const personalSessionPath = isBusiness
    ? `${personalSettingsBase}/session`
    : `${baseUrl}/settings/session`;

  const personalSettingsOptions = [
    {
      name: t('navigation.sessionManagement'),
      icon: <Globe className="w-3 h-3" />,
      path: personalSessionPath,
    },
    {
      name: t('navigation.personalProfile'),
      icon: <UserCogIcon className="w-3 h-3" />,
      path: isBusiness ? '/account/personal/profile' : `${baseUrl}/profile`,
    },
    {
      name: t('navigation.preferences'),
      icon: <Settings className="w-3 h-3" />,
      path: isBusiness ? '/account/personal/preferences' : `${baseUrl}/settings/preferences`,
    },
  ];

  return (
    <SidebarGroup>
      {/* // only for Businessess  */}
      {isBusiness && (
        <SidebarMenu className="mt-2">
          {open && (
            <SidebarHeader className="text-[12px] text-gray-900 dark:text-gray-100">
              {t('navigation.company')}
            </SidebarHeader>
          )}
          <SidebarMenuButton
            tooltip={t('navigation.companySettings')}
            className={cn(
              'text-[13px] flex gap-1 items-center',
              pathname === `${baseUrl}/profile` && 'bg-primary/10 text-primary'
            )}
            onClick={() => navigate(`${baseUrl}/profile`)}
          >
            <Building className="w-5 h-5" />
            {open && t('navigation.companySettings')}
          </SidebarMenuButton>
          {isAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={cn(pathname === `${baseUrl}/users` && 'bg-primary/10 text-primary')}
                  onClick={() => navigate(`${baseUrl}/users`)}
                >
                  <Users className="w-5 h-5" />
                  <span>{t('navigation.usersAndGroups')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t('navigation.settings')}
                      className={cn(isSettingsPath && 'bg-primary/10 text-primary')}
                    >
                      <Settings className="w-5 h-5" />
                      <span>{t('navigation.settings')}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {settingsOptions.map((options) => (
                      <SidebarMenuSubItem
                        key={options.name}
                        onClick={() => navigate(options.path)}
                        className="ml-1 pt-1"
                      >
                        <SidebarMenuSubButton
                          className={cn(pathname === options.path && 'bg-primary/10 text-primary')}
                        >
                          {options.icon}
                          <span>{options.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </SidebarMenu>
      )}

      {/* // personal Account */}
      <SidebarMenu>
        {/* Personal section - for both account types */}
        <SidebarMenuItem className={cn('', isBusiness ? 'mt-1' : 'mt-2')}>
          {open && (
            <SidebarHeader className="text-[12px] text-gray-900 dark:text-gray-100">
              {t('navigation.personalSection')}
            </SidebarHeader>
          )}

          <SidebarMenuButton
            tooltip={t('navigation.myProfile')}
            className={cn(
              'text-[13px] flex gap-1 items-center',
              pathname === (isBusiness ? '/account/personal/profile' : `${baseUrl}/profile`) &&
                'bg-primary/10 text-primary'
            )}
            onClick={() =>
              navigate(isBusiness ? '/account/personal/profile' : `${baseUrl}/profile`)
            }
          >
            <UserCogIcon className="w-5 h-5" />
            {open && t('navigation.myProfile')}
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Einstellungen section for all users under Personal */}
        <Collapsible className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={t('navigation.settings')}
                className={cn(isSettingsPath && 'bg-primary/10 text-primary')}
              >
                <Settings className="w-5 h-5" />
                <span>{t('navigation.settings')}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </SidebarMenuItem>
          <CollapsibleContent>
            <SidebarMenuSub>
              {personalSettingsOptions.map((options) => (
                <SidebarMenuSubItem
                  key={options.name}
                  onClick={() => navigate(options.path)}
                  className="ml-1 pt-1"
                >
                  <SidebarMenuSubButton
                    className={cn(pathname === options.path && 'bg-primary/10 text-primary')}
                  >
                    {options.icon}
                    <span>{options.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
