import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import PlatformSettings from 'src/sections/accountdetails/account-settings/platform/platform-settings';

// ----------------------------------------------------------------------

const metadata = { title: `Platform Settings  - ${CONFIG.appName}` };

export default function PlatformSettingsPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlatformSettings />
      </div>
    </>
  );
}
