import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import SamlSsoConfigPage from 'src/sections/accountdetails/account-settings/auth/components/saml-sso-config';

// ----------------------------------------------------------------------

const metadata = { title: `Authentication Settings  - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <SamlSsoConfigPage />
      </div>
    </>
  );
}
