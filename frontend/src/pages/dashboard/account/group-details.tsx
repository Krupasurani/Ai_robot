import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import GroupDetails from 'src/sections/accountdetails/user-and-groups/group-details';

const metadata = { title: `Group Details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <GroupDetails />
      </div>
    </>
  );
}
