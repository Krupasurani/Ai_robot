import { User, Settings, Building2 } from 'lucide-react';
import { useAdmin } from 'src/context/AdminContext';
import { useAuthContext } from 'src/auth/hooks';

// Business-specific menu items (exclude admin-only "Company Profile" here)
const baseBusinessMenuItems = [
  {
    label: 'My Profile',
    href: '/account/personal/profile',
    icon: <User className="size-4" />,
  },
];

// Company Profile als separate Admin-Item definieren
const adminCompanyProfileItem = {
  label: 'Company Profile',
  href: '/account/company-settings/profile',
  icon: <Building2 className="size-4" />,
};

const adminSettingsItem = {
  label: 'Settings',
  href: '/account/company-settings/settings/authentication',
  icon: <Settings className="size-4" />,
};

// Individual-specific menu items
const individualMenuItems = [
  {
    label: 'My Profile',
    href: '/account/individual/profile',
    icon: <User className="size-4" />,
  },
  {
    label: 'Settings',
    href: '/account/individual/settings/authentication',
    icon: <Settings className="size-4" />,
  },
];

/**
 * Custom hook to get account menu items based on user's account type
 * @returns Array of menu items
 */
export const useAccountMenu = () => {
  const { user } = useAuthContext();
  const { isAdmin } = useAdmin();

  const isBusiness = user?.accountType === 'business' || user?.accountType === 'organization';

  if (isBusiness) {
    const businessItems = [...baseBusinessMenuItems];

    // Nur für Admins: Company Profile an den Anfang hinzufügen
    if (isAdmin === true) {
      businessItems.unshift(adminCompanyProfileItem);
      businessItems.push(adminSettingsItem);
    }

    return businessItems;
  }

  return individualMenuItems;
};

// Route configuration for React Router
export const accountRoutes = {
  business: {
    path: 'company-settings',
    children: [
      { path: 'profile', element: '<CompanyProfile />' },
      { path: 'settings', element: '<CompanySettings />' },
      { path: 'users', element: '<UsersAndGroups />' },
      { path: 'groups', element: '<UsersAndGroups />' },
      { path: 'invites', element: '<UsersAndGroups />' },
      {
        path: 'settings',
        children: [{ path: 'authentication', element: '<CompanyAuthenticationSettings />' }],
      },
    ],
  },
  individual: {
    path: 'individual-settings',
    children: [
      { path: 'profile', element: '<IndividualProfile />' },
      { path: 'settings', element: '<IndividualSettings />' },
      {
        path: 'settings',
        children: [{ path: 'authentication', element: '<IndividualAuthenticationSettings />' }],
      },
    ],
  },
};

// Static version as a fallback - Use individual menu by default
export const _account = [
  {
    label: 'My Profile',
    href: '/account/individual/profile',
    icon: <User />,
  },
];
