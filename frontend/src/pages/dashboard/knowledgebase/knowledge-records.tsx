import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import KnowledgeRecords from 'src/sections/knowledgebase/knowledge-records';

const metadata = { title: `Knowledge Records | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <div className="h-screen">
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <KnowledgeRecords />
    </div>
  );
}


