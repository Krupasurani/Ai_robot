import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { UserProvider } from 'src/context/UserContext';
import RecordDetails from 'src/sections/knowledgebase/record-details';

const metadata = { title: `Knowledge Base | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <div className="flex flex-grow overflow-hidden z-0">
        <UserProvider>
          <RecordDetails />
        </UserProvider>
      </div>
    </>
  );
}
