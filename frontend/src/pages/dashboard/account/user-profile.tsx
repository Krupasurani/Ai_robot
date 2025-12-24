import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import UserProfile from 'src/sections/accountdetails/user-profile';

// ----------------------------------------------------------------------

const metadata = { title: `User Profile | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <div className="flex flex-grow overflow-hidden z-0">
        <UserProfile />
      </div>
    </>
  );
}
