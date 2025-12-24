import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import PersonalProfile from 'src/sections/accountdetails/personal-profile';

const metadata = { title: `Personal Profile | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-grow overflow-hidden z-0">
        <PersonalProfile />
      </div>
    </>
  );
}
