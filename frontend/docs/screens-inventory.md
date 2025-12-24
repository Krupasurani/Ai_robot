### Screens-Inventar TheroAI (Wellen 1–3)

#### Welle 1 – High-traffic & Demo-kritisch
- Dashboard / Chat
  - `src/pages/dashboard/chat/index.tsx`
  - `src/sections/qna/chatbot/view/index.tsx` (Chat-Bot-View)
- Projects
  - `src/pages/dashboard/projects/index.tsx` (Projects-Übersicht)
  - `src/pages/dashboard/projects/project.tsx` (Projekt-Workspace)
  - `src/sections/projects/ShareProjectDialog.tsx`
- Knowledgebase – zentrale Views
  - `src/pages/dashboard/knowledgebase/knowledgebase.tsx`
  - `src/pages/dashboard/knowledgebase/knowledge-records.tsx`
  - `src/pages/dashboard/knowledgebase/knowledgebase-search.tsx`
  - `src/pages/dashboard/knowledgebase/record-details.tsx`
  - `src/sections/knowledgebase/knowledge-records.tsx` (Tabellen-View, Add-Data-Flow, Default-KB-Selektion)

#### Welle 2 – Tabellen-, Listen- & Arbeitsansichten
- Knowledgebase – Detail- und Listenkomponenten
  - `src/sections/knowledgebase/dashboard.tsx`
  - `src/sections/knowledgebase/dashboard-grid-view.tsx`
  - `src/sections/knowledgebase/dashboard-list-view.tsx`
  - `src/sections/knowledgebase/knowledge-records.tsx`
  - `src/sections/knowledgebase/knowledge-search.tsx`
  - `src/sections/knowledgebase/knowledge-search-sidebar.tsx`
  - `src/sections/knowledgebase/knowledge-search-filters.tsx`
  - `src/sections/knowledgebase/knowledge-base.tsx`
  - `src/sections/knowledgebase/knowledge-base-search.tsx`
- QnA/Agents
  - `src/pages/dashboard/qna/agent.tsx`
  - `src/pages/dashboard/qna/agent-builder.tsx`
  - `src/sections/qna/agents/agent-chat.tsx`
  - `src/sections/qna/agents/agents-management.tsx`

#### Welle 3 – Settings, Randbereiche & System-Seiten
- Account & Settings
  - `src/pages/dashboard/account/personal-profile.tsx`
  - `src/pages/dashboard/account/company-profile.tsx`
  - `src/pages/dashboard/account/preferences-settings.tsx`
  - `src/pages/dashboard/account/platform-settings.tsx`
  - `src/pages/dashboard/account/services-settings.tsx`
  - `src/pages/dashboard/account/authentication-settings.tsx`
  - `src/pages/dashboard/account/session-management.tsx`
  - `src/pages/dashboard/account/user-and-groups.tsx`
- Auth
  - `src/pages/auth/jwt/sign-in.tsx`
  - `src/pages/auth/jwt/sign-up.tsx`
  - `src/pages/auth/jwt/reset-password.tsx`
- Fehler & Maintenance
  - `src/pages/error/403.tsx`
  - `src/pages/error/404.tsx`
  - `src/pages/error/500.tsx`
  - `src/pages/maintenance/index.tsx`


