import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import ServiceSettings from 'src/sections/accountdetails/account-settings/services/service-settings';

// ----------------------------------------------------------------------

const metadata = { title: `Service Settings  - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <ServiceSettings />
      </div>
    </>
  );
}
