import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import CompanyProfile from 'src/sections/accountdetails/company-profile';

// ----------------------------------------------------------------------

const metadata = { title: `Company Profile | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <CompanyProfile />
      </div>
    </>
  );
}
