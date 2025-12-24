import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import ShareProjectDialog from '@/sections/projects/ShareProjectDialog';
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  Check,
  Folder,
  FilePlus,
  Sparkles,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/drop-down-menu';

import { paths } from 'src/routes/paths';

import axios from 'src/utils/axios';

import { useAdmin } from 'src/context/AdminContext';

import { useChatBot } from 'src/sections/qna/chatbot/utils/useChatBot';
import ChatInput from 'src/sections/qna/chatbot/components/chat-input';
import { KnowledgeBaseAPI } from 'src/sections/knowledgebase/services/api';
import { useTranslate } from 'src/locales';

// Simple in-memory cache for KB content checks to avoid frequent API calls
const KB_CONTENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const kbContentCache: Map<string, { hasContent: boolean; ts: number }> = new Map();

type Conversation = { _id: string; title?: string; lastActivityAt?: string | number; createdAt?: string | number; };

export default function ProjectWorkspacePage() {
  const { t } = useTranslate('navbar');
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<{ _id: string; title: string; description?: string; systemPrompt?: string; kbId?: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [kbHasContent, setKbHasContent] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [form, setForm] = useState({ title: '', description: '', systemPrompt: '' });
  const [memories, setMemories] = useState<Array<{ _id: string; text: string; approved?: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const TITLE_MAX = 60;
  const DESC_MAX = 300;
  const PROMPT_MAX = 2000;
  const { handleSendMessage: baseSend, handleChatSelect, isLoadingConversation } = useChatBot();
  const { isAdmin } = useAdmin();
  const chatInputAnchorRef = useRef<HTMLDivElement | null>(null);

  const fetchProject = useCallback(async () => {
    const res = await axios.get(`/api/v1/projects/${projectId}`);
    setProject(res.data);
    setForm({
      title: res.data?.title || '',
      description: res.data?.description || '',
      systemPrompt: res.data?.systemPrompt || '',
    });
    try {
      const memRes = await axios.get(`/api/v1/projects/${projectId}/memories`);
      setMemories(memRes.data?.memories || []);
    } catch { /* noop */ }
  }, [projectId]);
  const fetchConversations = useCallback(async () => {
    const res = await axios.get(`/api/v1/conversations`, { params: { projectId } });
    setConversations(res.data?.conversations || []);
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchConversations();
      // Make projectId globally discoverable for chat components regardless of route shape
      try {
        localStorage.setItem('currentProjectId', projectId);
      } catch { /* noop */ }
    }
    return () => {
      try {
        const stored = localStorage.getItem('currentProjectId');
        if (stored && projectId && stored === projectId) {
          localStorage.removeItem('currentProjectId');
        }
      } catch { /* noop */ }
    };
  }, [projectId, fetchProject, fetchConversations]);

  const handleOpenConversation = useCallback(async (conv: Conversation) => {
    await handleChatSelect(conv as any);
  }, [handleChatSelect]);

  const handleChatInputSubmit = useCallback(
    async (text: string, modelType: any) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      await baseSend(trimmed, modelType || 'chat');
      fetchConversations();
    },
    [baseSend, fetchConversations]
  );

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.lastActivityAt || b.createdAt || 0).getTime() -
          new Date(a.lastActivityAt || a.createdAt || 0).getTime()
      ),
    [conversations]
  );

  const hasKnowledge = !!project?.kbId && kbHasContent;
  const hasPrompt = !!(project?.systemPrompt && project.systemPrompt.trim());
  const hasFirstChat = conversations.length > 0;
  const allDone = hasKnowledge && hasPrompt && hasFirstChat;

  const handleOpenKnowledge = useCallback(async () => {
    let kbId = project?.kbId;
    if (!kbId && projectId) {
      try {
        const res = await axios.get(`/api/v1/projects/${projectId}`);
        kbId = res.data?.kbId;
      } catch (_) {
        // ignore
      }
    }
    if (kbId) {
      navigate(`${paths.dashboard.knowledgebase.root}?view=knowledge-base&kbId=${encodeURIComponent(kbId)}`);
    } else {
      navigate(paths.dashboard.knowledgebase.root);
    }
  }, [navigate, project?.kbId, projectId]);

  // Check KB contents to ensure the KB actually has files/folders
  useEffect(() => {
    let mounted = true;
    const checkKb = async () => {
      const kbId = project?.kbId;
      if (!kbId) {
        if (mounted) setKbHasContent(false);
        return;
      }

      // Check cache first
      const cached = kbContentCache.get(kbId);
      const now = Date.now();
      if (cached && now - cached.ts < KB_CONTENT_CACHE_TTL_MS) {
        if (mounted) setKbHasContent(cached.hasContent);
        return;
      }

      try {
        const data = await KnowledgeBaseAPI.getFolderContents(kbId);
        const records = data.records || [];
        const folders = data.folders || [];

        // Consider PENDING/IN_PROGRESS/NOT_STARTED as content as well
        const hasActiveIndexing = records.some(
          (r: any) => r.indexingStatus === 'PENDING' || r.indexingStatus === 'IN_PROGRESS' || r.indexingStatus === 'NOT_STARTED'
        );

        const hasContent = records.length > 0 || folders.length > 0 || hasActiveIndexing;

        // Update cache
        try {
          kbContentCache.set(kbId, { hasContent, ts: now });
        } catch (_e) {
          // ignore cache set errors
        }

        if (mounted) setKbHasContent(hasContent);
      } catch (_err) {
        if (mounted) setKbHasContent(false);
      }
    };
    checkKb();
    return () => {
      mounted = false;
    };
  }, [project?.kbId]);

  const handleScrollToChat = useCallback(() => {
    if (chatInputAnchorRef.current) {
      chatInputAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  

  return (
    <>
    <div className="max-w-[870px] mx-auto pt-10 pb-16 flex flex-col min-h-[calc(100vh-48px)]">
        <div className="relative flex items-center justify-center gap-2 mb-2">
          <Folder className="w-5 h-5 text-foreground" aria-hidden="true" />
          <h1 className="text-xl font-semibold leading-[1.2]">
            {project?.title || t('pages.projectOnboarding.fallbackTitle', 'Project')}
          </h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('pages.projectOnboarding.menuAria', 'Project menu')}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => setShareOpen(true)}>
                  {t('pages.projectOnboarding.menuManageMembers', 'Manage members')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTitle(project?.title || '');
                    setRenameOpen(true);
                  }}
                >
                  {t('pages.projectOnboarding.menuRename', 'Rename project')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  {t('pages.projectOnboarding.menuSettings', 'Settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      if (!projectId) return;
                      const confirmed = window.confirm(
                        t('pages.projectOnboarding.confirmDelete', 'Delete project?')
                      );
                      if (!confirmed) return;
                      await axios.delete(`/api/v1/projects/${projectId}`);
                      navigate(paths.dashboard.projects.root);
                    }}
                  >
                    {t('pages.projectOnboarding.menuDelete', 'Delete project')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground text-center mb-6">
          {project?.description?.trim()
            ? project.description
            : t(
                'pages.projectOnboarding.description',
                'Projects bundle files, settings and chats. Follow the steps below to get started in seconds.'
              )}
        </p>

        {/* Onboarding steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Step 1: Knowledge */}
          <Card className="border-[#EDEDED] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className={
                `flex items-center justify-center mt-0.5 h-6 min-w-6 rounded-full text-[11px] ${hasKnowledge ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-200'}`
              }>
                {hasKnowledge ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] leading-5 font-medium text-foreground">
                    {t('pages.projectOnboarding.step1Title', 'Add files')}
                  </div>
                  {hasKnowledge && (
                    <Badge variant="secondary" className="text-[10px] py-0.5">
                      {t('pages.projectOnboarding.doneBadge', 'Done')}
                    </Badge>
                  )}
                </div>
                <p className="text-[12.5px] leading-[18px] text-muted-foreground mt-0.5">
                  {t(
                    'pages.projectOnboarding.step1Description',
                    'Upload content your chats are allowed to access.'
                  )}
                </p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant={hasKnowledge ? 'secondary' : 'default'}
                    onClick={handleOpenKnowledge}
                  >
                    <FilePlus className="w-4 h-4 mr-2" />{' '}
                    {hasKnowledge
                      ? t(
                          'pages.projectOnboarding.step1ButtonOpenKnowledgeBase',
                          'Open knowledge base'
                        )
                      : t(
                          'pages.projectOnboarding.step1ButtonAdd',
                          'Add files'
                        )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2: Prompt */}
          <Card className="border-[#EDEDED] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className={
                `flex items-center justify-center mt-0.5 h-6 min-w-6 rounded-full text-[11px] ${hasPrompt ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-200'}`
              }>
                {hasPrompt ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] leading-5 font-medium text-foreground">
                    {t(
                      'pages.projectOnboarding.step2Title',
                      'Add instructions'
                    )}
                  </div>
                  {hasPrompt && (
                    <Badge variant="secondary" className="text-[10px] py-0.5">
                      {t('pages.projectOnboarding.doneBadge', 'Done')}
                    </Badge>
                  )}
                </div>
                <p className="text-[12.5px] leading-[18px] text-muted-foreground mt-0.5">
                  {t(
                    'pages.projectOnboarding.step2Description',
                    'Define the role and tone for responses.'
                  )}
                </p>
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={hasPrompt ? 'secondary' : 'default'}
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />{' '}
                      {hasPrompt
                        ? t(
                            'pages.projectOnboarding.step2ButtonEdit',
                            'Edit instructions'
                          )
                        : t(
                            'pages.projectOnboarding.step2ButtonAdd',
                            'Add instructions'
                          )}
                    </Button>
                    
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 3: Chat (nur während Einrichtung, ausgeblendet sobald Gespräche existieren) */}
          {!hasFirstChat && (
            <Card className="border-[#EDEDED] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center mt-0.5 h-6 min-w-6 rounded-full text-[11px] bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
                  3
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] leading-5 font-medium text-foreground">
                      {t(
                        'pages.projectOnboarding.step3Title',
                        'Start first chat'
                      )}
                    </div>
                  </div>
                  <p className="text-[12.5px] leading-[18px] text-muted-foreground mt-0.5">
                    {t(
                      'pages.projectOnboarding.step3Description',
                      'Test your setup directly in the chat field below.'
                    )}
                  </p>
                  <div className="mt-2">
                    <Button size="sm" onClick={handleScrollToChat}>
                      <MessageSquare className="w-4 h-4 mr-2" />{' '}
                      {t(
                        'pages.projectOnboarding.step3Button',
                        'Start chat'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Team einladen (optional) */}
          <Card className="border-[#EDEDED] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center mt-0.5 h-6 min-w-6 rounded-full text-[11px] bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
                {!hasFirstChat ? '4' : '3'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] leading-5 font-medium text-foreground">
                    {t('pages.projectOnboarding.step4Title', 'Invite team')}
                  </div>
                  <Badge variant="outline" className="text-[10px] py-0.5">
                    {t('pages.projectOnboarding.step4Optional', 'Optional')}
                  </Badge>
                </div>
                <p className="text-[12.5px] leading-[18px] text-muted-foreground mt-0.5">
                  {t(
                    'pages.projectOnboarding.step4Description',
                    'Share the project with colleagues and collaborate.'
                  )}
                </p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShareOpen(true)}
                  >
                    {t(
                      'pages.projectOnboarding.step4Button',
                      'Invite members'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Helper card */}
        <Card className="mt-3 border-[#EDEDED] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <span className="inline-flex h-6 items-center rounded-full bg-neutral-100 px-2 text-[11px] text-neutral-700 dark:bg-white/10 dark:text-neutral-200">
                {t('pages.projectOnboarding.helperTipLabel', 'Tip')}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-[18px] text-muted-foreground">
                {t(
                  'pages.projectOnboarding.helperText',
                  'You can find your project-related conversations in the left sidebar. You can also share projects with teammates and manage permissions.'
                )}
              </p>
              {allDone && (
                <p className="mt-1 text-[12px] text-emerald-600 dark:text-emerald-400">
                  {t(
                    'pages.projectOnboarding.helperAllDone',
                    'Everything is set up – good luck!'
                  )}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Conversations list removed: Sidebar shows project-based chats in project context */}

        {/* Spacer pushes compose bar to the bottom */}
        <div className="flex-1" />

        {/* Unified ChatInput at the bottom (same as welcome-message/chat-input) */}
        <div ref={chatInputAnchorRef} className="pt-2 pb-6">
          <ChatInput
            onSubmit={handleChatInputSubmit}
            isLoading={!!isLoadingConversation}
            disabled={false}
            placeholder={
              project?.title
                ? t('chat.projectPlaceholder', {
                    projectTitle: project.title,
                    defaultValue: `New chat in ${project.title}`,
                  })
                : t('chat.newChat')
            }
            selectedModel={null}
            selectedChatMode={null}
            onModelChange={() => {}}
            onChatModeChange={() => {}}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const isValid = form.title.trim().length > 0 && !saving;
              if (!isValid) return;
              setSaving(true);
              try {
                await axios.patch(`/api/v1/projects/${projectId}`, {
                  title: form.title.trim(),
                  description: form.description.trim(),
                  systemPrompt: form.systemPrompt.trim(),
                });
                setSettingsOpen(false);
                fetchProject();
              } finally {
                setSaving(false);
              }
            }}
            className="w-full bg-white dark:bg-neutral-900 dark:text-neutral-100"
          >
            {/* Header */}
            <div className="relative border-b border-neutral-200 px-6 py-4 dark:border-white/10">
              <h2 className="text-lg font-semibold tracking-tight">
                {t(
                  'pages.projectSettings.title',
                  'Edit Project Settings'
                )}
              </h2>
            </div>

            {/* Body */}
            <div className="grid gap-5 px-6 py-5">
              {/* Title */}
              <div>
                <div className="flex items-end justify-between">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('pages.projectSettings.fieldTitleLabel', 'Title')}{' '}
                    <span className="text-neutral-400">
                      {t(
                        'pages.projectSettings.fieldTitleRequired',
                        '(required)'
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {form.title.length}/{TITLE_MAX}
                  </span>
                </div>
                <input
                  id="project-title"
                  type="text"
                  aria-label={t('pages.projectSettings.fieldTitleLabel', 'Title')}
                  value={form.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t(
                    'pages.projectSettings.fieldTitlePlaceholder',
                    'e.g. Growth Experiments Q3'
                  )}
                  className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {t(
                    'pages.projectSettings.fieldTitleHelper',
                    'Short, unique name. Max. {{max}} characters.',
                    { max: TITLE_MAX }
                  )}
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-end justify-between">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t(
                      'pages.projectSettings.fieldDescriptionLabel',
                      'Description'
                    )}{' '}
                    <span className="text-neutral-400">
                      {t(
                        'pages.projectSettings.fieldDescriptionOptional',
                        '(optional)'
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {form.description.length}/{DESC_MAX}
                  </span>
                </div>
                <textarea
                  id="project-description"
                  aria-label={t(
                    'pages.projectSettings.fieldDescriptionLabel',
                    'Description'
                  )}
                  value={form.description}
                  maxLength={DESC_MAX}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t(
                    'pages.projectSettings.fieldDescriptionPlaceholder',
                    'What is this project about? What is the output?'
                  )}
                  className="mt-2 block min-h-[96px] w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {t(
                    'pages.projectSettings.fieldDescriptionHelper',
                    'Shared with the team. Helps everyone understand the project.'
                  )}
                </p>
              </div>

              {/* System Prompt */}
              <div>
                <div className="flex items-end justify-between">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t(
                      'pages.projectSettings.fieldPromptLabel',
                      'System Prompt'
                    )}{' '}
                    <span className="text-neutral-400">
                      {t(
                        'pages.projectSettings.fieldPromptPersona',
                        '(persona)'
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {form.systemPrompt.length}/{PROMPT_MAX}
                  </span>
                </div>
                <textarea
                  id="project-system-prompt"
                  aria-label={t(
                    'pages.projectSettings.fieldPromptLabel',
                    'System Prompt'
                  )}
                  value={form.systemPrompt}
                  maxLength={PROMPT_MAX}
                  onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                  placeholder={t(
                    'pages.projectSettings.fieldPromptPlaceholder',
                    `Describe role, goal, tone and limits.
- Role: You are a technical PM assistant …
- Goal: Focus on clear action items …
- Style: concise, bullet-pointed …`
                  )}
                  className="mt-2 block min-h-[140px] w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-neutral-500">
                    {t(
                      'pages.projectSettings.fieldPromptHelper',
                      'Tip: Describe observable behaviour (“Answer with…”) instead of traits (“be smart”).'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        systemPrompt:
                          f.systemPrompt ||
                          `You are "Thies PM Copilot".
- Answer in German by default.
- Format: bullets first, summary last.
- Ask 2–3 clarifying questions before proposing a plan.
- Never invent data; if unsure, say so and propose how to verify.`,
                      }))
                    }
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {t(
                      'pages.projectSettings.insertExample',
                      'Insert example'
                    )}
                  </button>
                </div>
              </div>

              {/* Project Memories */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t(
                      'pages.projectSettings.memoriesTitle',
                      'Project Memories'
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-indigo-600 dark:text-indigo-400"
                    onClick={async () => {
                      const text = window.prompt('Neue Memory (kurzer Satz):');
                      if (!text || !text.trim()) return;
                      const res = await axios.post(`/api/v1/projects/${projectId}/memories`, { text: text.trim(), approved: true });
                      setMemories((m) => [...m, res.data.memory]);
                    }}
                  >
                    {t('pages.projectSettings.memoriesAdd', '+ Add')}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {memories.length === 0 && (
                    <p className="text-xs text-neutral-500">
                      {t(
                        'pages.projectSettings.memoriesEmpty',
                        'No memories saved yet.'
                      )}
                    </p>
                  )}
                  {memories.map((m) => (
                    <div key={m._id} className="flex items-start gap-2 rounded-md border border-neutral-200 dark:border-white/10 px-2 py-1">
                      <div className="text-xs flex-1">{m.text}</div>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 dark:text-red-400"
                        onClick={async () => {
                          await axios.delete(`/api/v1/projects/${projectId}/memories/${m._id}`);
                          setMemories((list) => list.filter((x) => x._id !== m._id));
                        }}
                      >
                        {t(
                          'pages.projectSettings.memoriesRemove',
                          'Remove'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="inline-flex items-center rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 dark:text-neutral-300 dark:hover:bg-white/10"
              >
                {t('pages.projectSettings.cancel', 'Cancel')}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!(form.title.trim().length > 0) || saving}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                >
                  {saving && (
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {t('pages.projectSettings.save', 'Save')}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('pages.projectRename.title', 'Rename project')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder={t(
                'pages.projectRename.namePlaceholder',
                'New project name'
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              {t('pages.projectRename.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={async () => {
                const title = renameTitle.trim();
                if (!title) return;
                await axios.patch(`/api/v1/projects/${projectId}`, { title });
                setRenameOpen(false);
                fetchProject();
              }}
            >
              {t('pages.projectRename.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog (kept for future) */}
      {project?._id && (
        <ShareProjectDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={project._id}
          projectTitle={project.title}
        />
      )}
    </>
  );
}


