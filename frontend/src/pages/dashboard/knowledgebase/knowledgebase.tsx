
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import KnowledgeBase from 'src/sections/knowledgebase/knowledge-base';

// ----------------------------------------------------------------------

const metadata = { title: `Knowledge Base | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id } = useParams<{ id?: string }>();

  // Bridge React Router path params to the internal query-param router
  // used by `useRouter` inside `KnowledgeBase`.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const expectedView = id ? 'knowledge-base' : 'dashboard';
    let changed = false;

    if (params.get('view') !== expectedView) {
      params.set('view', expectedView);
      changed = true;
    }

    if (id) {
      if (params.get('kbId') !== id) {
        params.set('kbId', id);
        changed = true;
      }
    } else {
      if (params.has('kbId')) {
        params.delete('kbId');
        changed = true;
      }
      if (params.has('folderId')) {
        params.delete('folderId');
        changed = true;
      }
    }

    if (changed) {
      const search = params.toString();
      const newUrl = `${window.location.pathname}${search ? `?${search}` : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <KnowledgeBase />
    </div>
  );
}
