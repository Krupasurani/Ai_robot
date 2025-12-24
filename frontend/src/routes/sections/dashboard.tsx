import type { ReactNode } from 'react';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { CONFIG } from 'src/config-global';
import { useAdmin } from 'src/context/AdminContext';
import { DashboardLayout } from 'src/layouts/dashboard-layout';
import { usePlatformFeatureFlag } from 'src/context/PlatformSettingsContext';

import { ConnectorProvider } from 'src/sections/accountdetails/connectors/context';

import { AuthGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

// Lazy load SettingsLayout for settings routes (reduces initial bundle)
const SettingsLayout = lazy(() => import('src/layouts/settings/SettingsLayout'));

// Loading fallback for settings section
function SettingsLoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0f0f10]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Overview
const ChatBotPage = lazy(() => import('src/pages/dashboard/qna/chatbot'));
const AgentPage = lazy(() => import('src/pages/dashboard/qna/agent'));
const AgentBuilderPage = lazy(() => import('src/pages/dashboard/qna/agent-builder'));
const AgentChatPage = lazy(() => import('src/sections/qna/agents/agent-chat'));
const ProjectsListPage = lazy(() => import('src/pages/dashboard/projects'));
const ProjectWorkspacePage = lazy(() => import('src/pages/dashboard/projects/project'));
const PromptLibraryPage = lazy(() => import('src/pages/dashboard/prompt-library'));

// Accountdetails
const CompanyProfile = lazy(() => import('src/pages/dashboard/account/company-profile'));
const UsersAndGroups = lazy(() => import('src/pages/dashboard/account/user-and-groups'));
const GroupDetails = lazy(() => import('src/pages/dashboard/account/group-details'));
const UserProfile = lazy(() => import('src/pages/dashboard/account/user-profile'));
const PersonalProfile = lazy(() => import('src/pages/dashboard/account/personal-profile'));
const ServiceSettings = lazy(() => import('src/pages/dashboard/account/services-settings'));
const PreferencesSettings = lazy(() => import('src/pages/dashboard/account/preferences-settings'));
const SessionManagementPage = lazy(() => import('src/pages/dashboard/account/session-management'));
const AuthenticationSettings = lazy(
  () => import('src/pages/dashboard/account/authentication-settings')
);
// AI Models configuration is now centrally managed - component removed
const PlatformSettings = lazy(() => import('src/pages/dashboard/account/platform-settings'));
const LicenseBillingPage = lazy(() => import('src/pages/dashboard/account/license-billing'));
const ConnectorSettings = lazy(
  () => import('src/pages/dashboard/account/connectors/connector-settings')
);

// Generic connector management (parameterized by name)
const ConnectorManagementPage = lazy(
  () => import('src/pages/dashboard/account/connectors/[connectorName]')
);

// OAuth callback page for connectors
const ConnectorOAuthCallback = lazy(
  () => import('src/pages/dashboard/account/connectors/oauth-callback')
);

// Deprecated connector config pages removed; use ConnectorSettings instead

const SamlSsoConfigPage = lazy(() => import('src/pages/dashboard/account/saml-sso-config'));

// knowledge-base
const KnowledgeBaseList = lazy(() => import('src/pages/dashboard/knowledgebase/knowledgebase'));
const KnowledgeRecordsPage = lazy(
  () => import('src/pages/dashboard/knowledgebase/knowledge-records')
);
const RecordDetails = lazy(() => import('src/pages/dashboard/knowledgebase/record-details'));
const RecordViewer = lazy(() => import('src/pages/dashboard/knowledgebase/record-viewer'));
const KnowledgeSearch = lazy(
  () => import('src/pages/dashboard/knowledgebase/knowledgebase-search')
);

// ----------------------------------------------------------------------

// Redirect component based on account type
function AccountTypeRedirect() {
  const { user } = useAuthContext();
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.accountType === 'company';

  if (isBusiness) {
    return <Navigate to="/account/company-settings/profile" replace />;
  }
  return <Navigate to="/account/individual/profile" replace />;
}

// Guard components
function BusinessRouteGuard({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.accountType === 'company';

  if (!isBusiness) {
    return <Navigate to="/account/individual/profile" replace />;
  }

  return <>{children}</>;
}

function IndividualRouteGuard({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.accountType === 'company';

  if (isBusiness) {
    return <Navigate to="/account/company-settings/profile" replace />;
  }

  return <>{children}</>;
}

function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin();
  const { user } = useAuthContext();
  const isBusiness =
    user?.accountType === 'business' ||
    user?.accountType === 'organization' ||
    user?.accountType === 'company';

  if (!isBusiness) {
    return <Navigate to="/account/individual/profile" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/account/company-settings/profile" replace />;
  }

  return <>{children}</>;
}

function AgentBuilderAccessRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin } = useAdmin();
  const flag = usePlatformFeatureFlag('AGENT_BUILDER_VISIBLE_FOR_ALL_USERS');

  if (flag === undefined && !isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin && !flag) {
    return <Navigate to="/" replace />;
  }

  return <Component />;
}


export function FullNameGuard({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();

  // Check if user has a full name
  const hasFullName = !!(user?.fullName && user.fullName.trim() !== '');

  if (!hasFullName) {
    // Redirect to the home page where the dialog will appear
    return <Navigate to="/" replace />;
  }

  // If we're here, the user has a full name and can proceed
  return <>{children}</>;
}

// Route components with guards
const BusinessOnlyRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AuthGuard>
    <FullNameGuard>
      <BusinessRouteGuard>
        <Component />
      </BusinessRouteGuard>
    </FullNameGuard>
  </AuthGuard>
);

const BusinessAdminOnlyRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AuthGuard>
    <FullNameGuard>
      <AdminRouteGuard>
        <Component />
      </AdminRouteGuard>
    </FullNameGuard>
  </AuthGuard>
);

const IndividualOnlyRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AuthGuard>
    <FullNameGuard>
      <IndividualRouteGuard>
        <Component />
      </IndividualRouteGuard>
    </FullNameGuard>
  </AuthGuard>
);

const AdminProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AuthGuard>
    <FullNameGuard>
      <AdminRouteGuard>
        <Component />
      </AdminRouteGuard>
    </FullNameGuard>
  </AuthGuard>
);

const ProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <AuthGuard>
    <FullNameGuard>
      <Component />
    </FullNameGuard>
  </AuthGuard>
);

// Layout with outlet for nested routes
const layoutContent = (
  <ConnectorProvider>
    <DashboardLayout>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  </ConnectorProvider>
);

// Settings layout wrapper - for use with dedicated settings routes
// This provides a lighter-weight layout for settings pages
const SettingsLayoutWrapper = () => (
  <Suspense fallback={<SettingsLoadingFallback />}>
    <SettingsLayout />
  </Suspense>
);

export const dashboardRoutes = [
  {
    path: '/',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <ChatBotPage key="home" />, index: true },
      { path: ':conversationId', element: <ChatBotPage key="conversation" /> },
      {
        path: 'agents',
        element: <AgentBuilderAccessRoute component={AgentPage} />,
      },
      {
        path: 'agents/new',
        element: <AgentBuilderAccessRoute component={AgentBuilderPage} />,
      },
      {
        path: 'agents/:agentKey',
        element: <AgentBuilderAccessRoute component={AgentChatPage} />,
      },
      {
        path: 'agents/:agentKey/edit',
        element: <AgentBuilderAccessRoute component={AgentBuilderPage} />,
      },
      {
        path: 'agents/:agentKey/flow',
        element: <AgentBuilderAccessRoute component={AgentBuilderPage} />,
      },
      {
        path: 'agents/:agentKey/conversations/:conversationId',
        element: <AgentBuilderAccessRoute component={AgentChatPage} />,
      },
      {
        path: 'knowledge-bases',
        element: <ProtectedRoute component={KnowledgeBaseList} />,
      },
      {
        path: 'knowledge-bases/:id',
        element: <ProtectedRoute component={KnowledgeBaseList} />,
      },
      {
        path: 'knowledge-records',
        element: <ProtectedRoute component={KnowledgeRecordsPage} />,
      },
      {
        path: 'prompt-library',
        element: <ProtectedRoute component={PromptLibraryPage} />,
      },
      { path: 'record/:recordId', element: <RecordDetails /> },
      { path: 'record/:recordId/view', element: <ProtectedRoute component={RecordViewer} /> },
      {
        path: 'connectors',
        element: <Navigate to="/account/individual/settings/connector" replace />,
      },
      // OAuth callback route for connectors
      {
        path: 'connectors/oauth/callback/:connectorName',
        element: <ConnectorOAuthCallback />,
      },
      {
        path: 'account',
        children: [
          // Catch-all redirect for /account path
          { index: true, element: <ProtectedRoute component={AccountTypeRedirect} /> },

          // Business account routes
          {
            path: 'company-settings/profile',
            element: CONFIG.auth.skip ? (
              <CompanyProfile />
            ) : (
              <BusinessAdminOnlyRoute component={CompanyProfile} />
            ),
          },
          {
            path: 'personal/profile',
            element: CONFIG.auth.skip ? (
              <PersonalProfile />
            ) : (
              <BusinessOnlyRoute component={PersonalProfile} />
            ),
          },

          // Admin-only routes (business + admin)
          {
            path: 'company-settings/user-profile/:id',
            element: CONFIG.auth.skip ? (
              <UserProfile />
            ) : (
              <AdminProtectedRoute component={UserProfile} />
            ),
          },
          {
            path: 'company-settings/groups/:id',
            element: CONFIG.auth.skip ? (
              <GroupDetails />
            ) : (
              <AdminProtectedRoute component={GroupDetails} />
            ),
          },
          {
            path: 'company-settings',
            children: [
              // Index route for company-settings
              {
                index: true,
                element: (
                  <ProtectedRoute
                    component={() => <Navigate to="/account/company-settings/profile" replace />}
                  />
                ),
              },

              {
                path: 'users',
                element: CONFIG.auth.skip ? (
                  <UsersAndGroups />
                ) : (
                  <AdminProtectedRoute component={UsersAndGroups} />
                ),
              },
              {
                path: 'groups',
                element: CONFIG.auth.skip ? (
                  <UsersAndGroups />
                ) : (
                  <AdminProtectedRoute component={UsersAndGroups} />
                ),
              },
              {
                path: 'invites',
                element: CONFIG.auth.skip ? (
                  <UsersAndGroups />
                ) : (
                  <AdminProtectedRoute component={UsersAndGroups} />
                ),
              },
              {
                path: 'settings',
                children: [
                  // Index route for company settings
                  {
                    index: true,
                    element: CONFIG.auth.skip ? (
                      <Navigate to="/account/company-settings/settings/authentication" replace />
                    ) : (
                      <FullNameGuard>
                        <AdminRouteGuard>
                          <Navigate
                            to="/account/company-settings/settings/authentication"
                            replace
                          />
                        </AdminRouteGuard>
                      </FullNameGuard>
                    ),
                  },

                  {
                    path: 'authentication',
                    children: [
                      {
                        element: CONFIG.auth.skip ? (
                          <AuthenticationSettings />
                        ) : (
                          <BusinessAdminOnlyRoute component={AuthenticationSettings} />
                        ),
                        index: true,
                      },
                      {
                        path: 'saml',
                        element: CONFIG.auth.skip ? (
                          <SamlSsoConfigPage />
                        ) : (
                          <BusinessAdminOnlyRoute component={SamlSsoConfigPage} />
                        ),
                      },
                    ],
                  },
                  {
                    path: 'connector',
                    children: [
                      {
                        element: CONFIG.auth.skip ? (
                          <ConnectorSettings />
                        ) : (
                          <BusinessAdminOnlyRoute component={ConnectorSettings} />
                        ),
                        index: true,
                      },
                      {
                        path: 'oauth/callback/:connectorName',
                        element: CONFIG.auth.skip ? (
                          <ConnectorOAuthCallback />
                        ) : (
                          <BusinessAdminOnlyRoute component={ConnectorOAuthCallback} />
                        ),
                      },
                      {
                        path: ':connectorName',
                        element: CONFIG.auth.skip ? (
                          <ConnectorManagementPage />
                        ) : (
                          <BusinessAdminOnlyRoute component={ConnectorManagementPage} />
                        ),
                      },
                      // legacy routes removed; fallback to connector settings
                    ],
                  },
                  {
                    path: 'services',
                    element: CONFIG.auth.skip ? (
                      <ServiceSettings />
                    ) : (
                      <BusinessAdminOnlyRoute component={ServiceSettings} />
                    ),
                  },
                  {
                    path: 'platform',
                    element: CONFIG.auth.skip ? (
                      <PlatformSettings />
                    ) : (
                      <BusinessAdminOnlyRoute component={PlatformSettings} />
                    ),
                  },
                  {
                    path: 'license',
                    element: CONFIG.auth.skip ? (
                      <LicenseBillingPage />
                    ) : (
                      <BusinessAdminOnlyRoute component={LicenseBillingPage} />
                    ),
                  },
                ],
              },
            ],
          },
          {
            path: 'personal',
            children: [
              {
                path: 'session',
                element: CONFIG.auth.skip ? (
                  <SessionManagementPage />
                ) : (
                  <BusinessOnlyRoute component={SessionManagementPage} />
                ),
              },
              {
                path: 'preferences',
                element: CONFIG.auth.skip ? (
                  <PreferencesSettings />
                ) : (
                  <BusinessOnlyRoute component={PreferencesSettings} />
                ),
              },
            ],
          },

          // Individual account routes
          {
            path: 'individual',
            children: [
              // Index route for individual
              {
                index: true,
                element: (
                  <ProtectedRoute
                    component={() => <Navigate to="/account/individual/profile" replace />}
                  />
                ),
              },

              {
                path: 'profile',
                element: CONFIG.auth.skip ? (
                  <PersonalProfile />
                ) : (
                  <IndividualOnlyRoute component={PersonalProfile} />
                ),
              },
              {
                path: 'settings',
                children: [
                  // Index route for individual settings
                  {
                    index: true,
                    element: CONFIG.auth.skip ? (
                      <Navigate to="/account/individual/settings/authentication" replace />
                    ) : (
                      <FullNameGuard>
                        <IndividualRouteGuard>
                          <Navigate to="/account/individual/settings/authentication" replace />
                        </IndividualRouteGuard>
                      </FullNameGuard>
                    ),
                  },

                  {
                    path: 'authentication',
                    children: [
                      {
                        element: CONFIG.auth.skip ? (
                          <AuthenticationSettings />
                        ) : (
                          <IndividualOnlyRoute component={AuthenticationSettings} />
                        ),
                        index: true,
                      },
                      {
                        path: 'config-saml',
                        element: CONFIG.auth.skip ? (
                          <SamlSsoConfigPage />
                        ) : (
                          <IndividualOnlyRoute component={SamlSsoConfigPage} />
                        ),
                      },
                    ],
                  },
                  {
                    path: 'connector',
                    children: [
                      {
                        element: CONFIG.auth.skip ? (
                          <ConnectorSettings />
                        ) : (
                          <IndividualOnlyRoute component={ConnectorSettings} />
                        ),
                        index: true,
                      },
                      {
                        path: 'oauth/callback/:connectorName',
                        element: CONFIG.auth.skip ? (
                          <ConnectorOAuthCallback />
                        ) : (
                          <IndividualOnlyRoute component={ConnectorOAuthCallback} />
                        ),
                      },
                      // Parameterized connector management page
                      {
                        path: ':connectorName',
                        element: <IndividualOnlyRoute component={ConnectorManagementPage} />,
                      },
                      // legacy routes removed; fallback to connector settings
                    ],
                  },
                  {
                    path: 'services',
                    element: CONFIG.auth.skip ? (
                      <ServiceSettings />
                    ) : (
                      <IndividualOnlyRoute component={ServiceSettings} />
                    ),
                  },
                  {
                    path: 'session',
                    element: CONFIG.auth.skip ? (
                      <SessionManagementPage />
                    ) : (
                      <IndividualOnlyRoute component={SessionManagementPage} />
                    ),
                  },
                  {
                    path: 'preferences',
                    element: CONFIG.auth.skip ? (
                      <PreferencesSettings />
                    ) : (
                      <IndividualOnlyRoute component={PreferencesSettings} />
                    ),
                  },
                  {
                    path: 'platform',
                    element: CONFIG.auth.skip ? (
                      <PlatformSettings />
                    ) : (
                      <IndividualOnlyRoute component={PlatformSettings} />
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'knowledge-base',
        children: [
          {
            path: 'search',
            children: [{ element: <ProtectedRoute component={KnowledgeSearch} />, index: true }],
          },
        ],
      },
      {
        path: 'projects',
        children: [
          { index: true, element: <ProtectedRoute component={ProjectsListPage} /> },
          {
            path: ':projectId/:conversationId',
            element: <ProtectedRoute component={ChatBotPage} />,
          },
          { path: ':projectId', element: <ProtectedRoute component={ProjectWorkspacePage} /> },
        ],
      },
    ],
  },
];
