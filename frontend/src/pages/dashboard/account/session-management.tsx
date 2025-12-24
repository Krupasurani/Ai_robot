import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import SessionManagement from 'src/sections/accountdetails/account-settings/session/session-management';

const metadata = { title: `Session Management - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <SessionManagement />
      </div>
    </>
  );
}


