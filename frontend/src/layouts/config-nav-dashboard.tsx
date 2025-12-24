import { paths } from 'src/routes/paths';

// Base navigation data that's common for all users
const getBaseNavData = (t: (key: string) => string) => [
  {
    subheader: t('navigation.overview'),
    items: [
      { title: t('navigation.assistant'), path: paths.dashboard.root },
      {
        title: t('navigation.knowledgeBase'),
        path: paths.dashboard.knowledgebase.root,
      },
      {
        title: t('navigation.knowledgeSearch'),
        path: paths.dashboard.knowledgebase.search,
      },
    ],
  },
];

// Function to get navigation data based on user role
export const getDashboardNavData = (
  accountType: string | undefined,
  isAdmin: boolean,
  t?: (key: string) => string,
  featureFlags?: Record<string, boolean>
) => {
  const isBusiness = accountType === 'business' || accountType === 'organization';

  // Use translation function if provided, otherwise use default values
  const translate = t || ((key: string) => key.split('.').pop() || key);

  // Get base navigation data
  const baseNavData = getBaseNavData(translate);

  // clone nested arrays to avoid accidental re-use across renders
  const navigationData = baseNavData.map((section) => ({
    ...section,
    items: [...section.items],
  }));

  // NOTE:
  // For now we hide Agents from the main navigation entirely.
  // If you want to re‑enable them later, remove the `false &&` guards below
  // so that the existing feature flags and admin checks take effect again.
  const agentBuilderVisibleForAllUsers =
    false && !!featureFlags?.AGENT_BUILDER_VISIBLE_FOR_ALL_USERS;
  // Completely disable Agents in the navigation for now (also for admins)
  const canSeeAgents = false && (isAdmin || agentBuilderVisibleForAllUsers);

  if (canSeeAgents && !navigationData[0].items.some((i) => i.path === paths.dashboard.agent.root)) {
    navigationData[0].items.splice(1, 0, {
      title: translate('navigation.agents'),
      path: paths.dashboard.agent.root,
    });
  }

  // ensure we don't push duplicates
  if (!navigationData[0].items.some((i) => i.title === translate('navigation.projects'))) {
    navigationData[0].items.push({ title: translate('navigation.projects'), path: '/projects' });
  }

  if (isBusiness && isAdmin) {
    navigationData.push({
      subheader: translate('navigation.administration'),
      items: [
        {
          title: translate('navigation.connectorSettings'),
          path: '/account/company-settings/settings/connector',
        },
      ],
    });
  } else if (!isBusiness) {
    navigationData.push({
      subheader: translate('navigation.settings'),
      items: [
        {
          title: translate('navigation.connectorSettings'),
          path: '/account/individual/settings/connector',
        },
      ],
    });
  }

  return navigationData;
};

// Default export for backward compatibility - returns English defaults
export const navData = getBaseNavData((key: string) => key.split('.').pop() || key);
