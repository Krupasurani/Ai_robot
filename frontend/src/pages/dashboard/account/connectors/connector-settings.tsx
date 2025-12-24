import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import Connectors from 'src/sections/accountdetails/connectors/connectors';

// ----------------------------------------------------------------------

const metadata = { title: `Connector Settings  - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <div className="flex flex-1 overflow-hidden bg-background dark:bg-background/90">
        <Connectors />
      </div>
    </>
  );
}
