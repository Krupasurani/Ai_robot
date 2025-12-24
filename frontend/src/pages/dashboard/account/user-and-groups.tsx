import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';

import UsersAndGroups from 'src/sections/accountdetails/user-and-groups/users-and-groups';

const metadata = { title: `Users and groups | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex w-full flex-1 overflow-hidden z-0">
        <UsersAndGroups />
      </div>
    </>
  );
}
