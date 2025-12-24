import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import PreferencesSettings from 'src/sections/accountdetails/account-settings/preferences/preferences-settings';

// ----------------------------------------------------------------------

const metadata = { title: `Preferences Settings  - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <PreferencesSettings />
      </div>
    </>
  );
}
 

