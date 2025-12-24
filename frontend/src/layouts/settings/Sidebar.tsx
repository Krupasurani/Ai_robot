import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  Settings,
  Fingerprint,
  Link2,
  ServerCog,
  Globe,
  Cpu,
  CreditCard,
  SlidersHorizontal,
  Clock,
  Briefcase,
  Wrench,
  ArrowLeft,
} from 'lucide-react';

import { cn } from '@/utils/cn';
import { useTranslate } from 'src/locales';
import { useAdmin } from 'src/context/AdminContext';
import { useAuthContext } from 'src/auth/hooks';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
};

type NavCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function SettingsSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isAdmin } = useAdmin();
  const { t } = useTranslate('navbar');

  // Determine account type
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.accountType === 'company';

  // Base URL for routing depends on account type
  const baseUrl = isBusiness ? '/account/company-settings/settings' : '/account/individual/settings';

  // Build navigation categories
  const categories: NavCategory[] = useMemo(() => {
    const workspaceItems: NavItem[] = [
      {
        id: 'preferences',
        label: t('navigation.preferences'),
        path: `${baseUrl}/preferences`,
        icon: <SlidersHorizontal className="h-4 w-4" />,
      },
      {
        id: 'session',
        label: t('navigation.sessionManagement'),
        path: isBusiness ? '/account/personal/session' : `${baseUrl}/session`,
        icon: <Clock className="h-4 w-4" />,
      },
    ];

    const setupItems: NavItem[] = [
      {
        id: 'authentication',
        label: t('navigation.authentication'),
        path: `${baseUrl}/authentication`,
        icon: <Fingerprint className="h-4 w-4" />,
      },
      {
        id: 'connector',
        label: t('navigation.connectors'),
        path: `${baseUrl}/connector`,
        icon: <Link2 className="h-4 w-4" />,
      },
      {
        id: 'services',
        label: t('navigation.services'),
        path: `${baseUrl}/services`,
        icon: <ServerCog className="h-4 w-4" />,
      },
      {
        id: 'platform',
        label: t('navigation.platformSettings'),
        path: `${baseUrl}/platform`,
        icon: <Globe className="h-4 w-4" />,
      },
    ];

    // Admin-only items for business accounts
    if (isBusiness && isAdmin) {
      setupItems.push(
        {
          id: 'license',
          label: t('navigation.licenseBilling'),
          path: `${baseUrl}/license`,
          icon: <CreditCard className="h-4 w-4" />,
        }
      );
    }

    return [
      {
        id: 'workspace',
        label: 'Workspace',
        icon: <Briefcase className="h-5 w-5" />,
        items: workspaceItems,
      },
      {
        id: 'setup',
        label: 'Setup',
        icon: <Wrench className="h-5 w-5" />,
        items: setupItems,
      },
    ];
  }, [baseUrl, isBusiness, isAdmin, t]);

  // Determine which category is active based on current path
  const activeCategoryId = useMemo(() => {
    const activeCategory = categories.find((category) =>
      category.items.some((item) => pathname.startsWith(item.path))
    );
    // Default to 'setup' if no match (most settings routes are setup)
    return activeCategory?.id ?? 'setup';
  }, [pathname, categories]);

  // Get items for active category
  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  // Handle back navigation to dashboard
  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      {/* Rail (Icon-only sidebar) */}
      <nav
        className={cn(
          'flex flex-col items-center',
          'w-[68px] py-4',
          'bg-[#0f0f10]', // Same as global background
          'border-r border-zinc-800/30'
        )}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 mb-6 rounded-lg',
            'text-zinc-400 hover:text-white',
            'hover:bg-zinc-800/50',
            'transition-colors duration-150'
          )}
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Category icons */}
        <div className="flex flex-col gap-2">
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  // Navigate to first item in category if not already there
                  const firstItem = category.items[0];
                  if (firstItem && !pathname.startsWith(firstItem.path)) {
                    navigate(firstItem.path);
                  }
                }}
                className={cn(
                  'relative flex items-center justify-center',
                  'w-10 h-10 rounded-lg',
                  'transition-colors duration-150',
                  isActive
                    ? 'text-white bg-zinc-800/60'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                )}
                aria-label={category.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {category.icon}
                {isActive && (
                  <m.div
                    layoutId="settingsRailIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-r"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Settings icon at bottom */}
        <div className="mt-auto">
          <div className="flex items-center justify-center w-10 h-10 text-zinc-600">
            <Settings className="h-5 w-5" />
          </div>
        </div>
      </nav>

      {/* Navigation Panel */}
      <nav
        className={cn(
          'flex flex-col',
          'w-60 py-6 px-3',
          'bg-[#0f0f10]' // Same as global background
        )}
      >
        {/* Category header */}
        <div className="mb-4">
          <h2
            className={cn(
              'px-3 text-xs font-bold uppercase tracking-wide',
              'text-zinc-500'
            )}
          >
            {activeCategory?.label}
          </h2>
        </div>

        {/* Navigation items */}
        <ul className="flex flex-col gap-1">
          {activeCategory?.items.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'relative flex items-center gap-3 w-full',
                    'px-3 py-2 rounded-lg',
                    'text-sm font-medium',
                    'transition-colors duration-150',
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active pill indicator (background) */}
                  {isActive && (
                    <m.div
                      layoutId="settingsActivePill"
                      className={cn(
                        'absolute inset-0 rounded-lg',
                        'bg-zinc-800/50',
                        'ring-1 ring-purple-500/20',
                        'border-l-2 border-purple-500'
                      )}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  {/* Content (above the pill) */}
                  <span className="relative z-10 flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export default SettingsSidebar;

