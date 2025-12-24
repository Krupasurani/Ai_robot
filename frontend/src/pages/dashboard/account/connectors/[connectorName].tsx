import React, { lazy, Suspense, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Only eagerly load the default connector manager
const ConnectorManager = lazy(
  () => import('src/sections/accountdetails/connectors/components/connector-manager')
);

// ----------------------------------------------------------------------

const metadata = { title: `Connector Management` };

// Lazy-loaded setup views - only loaded when needed
const lazySetupViews = {
  jira: () =>
    import('src/sections/accountdetails/connectors/components/jira-setup-view').then((m) => ({
      default: m.JiraSetupView,
    })),
  confluence: () =>
    import('src/sections/accountdetails/connectors/components/confluence-setup-view').then((m) => ({
      default: m.ConfluenceSetupView,
    })),
  slack: () =>
    import('src/sections/accountdetails/connectors/components/slack-setup-view').then((m) => ({
      default: m.SlackSetupView,
    })),
  sharepoint: () =>
    import('src/sections/accountdetails/connectors/components/sharepoint-setup-view').then((m) => ({
      default: m.SharePointSetupView,
    })),
  'google drive': () =>
    import('src/sections/accountdetails/connectors/components/google-drive-setup-view').then(
      (m) => ({ default: m.GoogleDriveSetupView })
    ),
  onedrive: () =>
    import('src/sections/accountdetails/connectors/components/onedrive-setup-view').then((m) => ({
      default: m.OneDriveSetupView,
    })),
  gmail: () =>
    import('src/sections/accountdetails/connectors/components/gmail-setup-view').then((m) => ({
      default: m.GmailSetupView,
    })),
  outlook: () =>
    import('src/sections/accountdetails/connectors/components/outlook-setup-view').then((m) => ({
      default: m.OutlookSetupView,
    })),
  'outlook calendar': () =>
    import('src/sections/accountdetails/connectors/components/outlook-calendar-setup-view').then(
      (m) => ({ default: m.OutlookCalendarSetupView })
    ),
  teams: () =>
    import('src/sections/accountdetails/connectors/components/teams-setup-view').then((m) => ({
      default: m.TeamsSetupView,
    })),
  'google calendar': () =>
    import('src/sections/accountdetails/connectors/components/google-calendar-setup-view').then(
      (m) => ({ default: m.GoogleCalendarSetupView })
    ),
  dropbox: () =>
    import('src/sections/accountdetails/connectors/components/dropbox-setup-view').then((m) => ({
      default: m.DropboxSetupView,
    })),
  bookstack: () =>
    import('src/sections/accountdetails/connectors/components/bookstack-setup-view').then((m) => ({
      default: m.BookStackSetupView,
    })),
  samba: () =>
    import('src/sections/accountdetails/connectors/components/samba-setup-view').then((m) => ({
      default: m.SambaSetupView,
    })),
  servicenow: () =>
    import('src/sections/accountdetails/connectors/components/servicenow-setup-view').then((m) => ({
      default: m.ServiceNowSetupView,
    })),
  airtable: () =>
    import('src/sections/accountdetails/connectors/components/airtable-setup-view').then((m) => ({
      default: m.AirtableSetupView,
    })),
  'azure blob': () =>
    import('src/sections/accountdetails/connectors/components/azure-blob-setup-view').then((m) => ({
      default: m.AzureBlobSetupView,
    })),
  linear: () =>
    import('src/sections/accountdetails/connectors/components/linear-setup-view').then((m) => ({
      default: m.LinearSetupView,
    })),
  notion: () =>
    import('src/sections/accountdetails/connectors/components/notion-setup-view').then((m) => ({
      default: m.NotionSetupView,
    })),
  s3: () =>
    import('src/sections/accountdetails/connectors/components/s3-setup-view').then((m) => ({
      default: m.S3SetupView,
    })),
  zendesk: () =>
    import('src/sections/accountdetails/connectors/components/zendesk-setup-view').then((m) => ({
      default: m.ZendeskSetupView,
    })),
  web: () =>
    import('src/sections/accountdetails/connectors/components/web-setup-view').then((m) => ({
      default: m.WebSetupView,
    })),
} as const;

// Alias mappings for connector names
const CONNECTOR_ALIASES: Record<string, keyof typeof lazySetupViews> = {
  'sharepoint online': 'sharepoint',
  googledrive: 'google drive',
  drive: 'google drive',
  outlookcalendar: 'outlook calendar',
  'microsoft teams': 'teams',
  googlecalendar: 'google calendar',
  calendar: 'google calendar',
  smb: 'samba',
  'web crawler': 'web',
  webcrawler: 'web',
  'azure blob': 'azure blob',
  'azure blob storage': 'azure blob',
};

// Loading fallback component
function ConnectorLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Generic connector management page
export default function Page() {
  const { connectorName } = useParams<{ connectorName: string }>();

  // Resolve the connector name (handle aliases)
  const normalizedName = connectorName?.toLowerCase() || '';
  const resolvedName = CONNECTOR_ALIASES[normalizedName] || normalizedName;

  // Memoize the lazy component to prevent re-creation on every render
  const SetupViewComponent = useMemo(() => {
    const loader = lazySetupViews[resolvedName as keyof typeof lazySetupViews];
    if (loader) {
      return lazy(loader);
    }
    return null;
  }, [resolvedName]);

  return (
    <>
      <Helmet>
        <title>
          {metadata.title} - {connectorName}
        </title>
      </Helmet>
      <div className="flex w-full flex-1 overflow-hidden z-0 bg-background dark:bg-background/90">
        <Suspense fallback={<ConnectorLoadingFallback />}>
          {SetupViewComponent ? (
            <SetupViewComponent />
          ) : (
            <ConnectorManager showStats={Boolean(true)} />
          )}
        </Suspense>
      </div>
    </>
  );
}
