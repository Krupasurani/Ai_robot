// Self-Contained ChatInput.tsx - Manages its own state
import { PromptLibraryApi } from '@/api/prompt-library';
import type { PromptTemplate } from '@/api/prompt-library';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';
import { useTranslate } from '@/locales/use-locales';
import filterIcon from '@iconify-icons/mdi/filter-variant';
import {
  MicIcon,
  PlusIcon,
  GlobeIcon,
  BrainCircuit,
  BookMarked,
  ScanSearch,
  ChevronDown,
  Rocket,
  BookOpen,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
// Enhanced ChatInput.tsx - Beautiful dark/light mode UI with textarea
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import { AIInputButton, AIInputSubmit, AIInputTextarea } from '@/components/ui/ai/input';

import axios from 'src/utils/axios';

import ChatBotFilters from './chat-bot-filters';
import { MentionBubbleOverlay } from './mention-bubble-overlay';
import { MentionSuggestionsList } from './mention-suggestions-list';
import { ContextChips } from './context-chips';
import { FilterBadges } from './filter-badges';
import { FileUploadDisplay } from './file-upload-display';
import { PromptPickerSheet } from './prompt-picker-sheet';
import { CustomTooltip } from './custom-tooltip';

// TEMPORARILY DISABLED: 'agent' removed from ModelType - commented out as requested
type ModelType = /* 'agent' | */ 'knowledge' | 'chat' | 'deepResearch' | 'image';

type ContextType = 'kb' | 'project' | 'record' | 'app' | 'user';

export type ContextRef = {
  type: ContextType;
  id: string;
  label: string;
};

type SuggestionItem = {
  type: ContextType;
  id: string;
  label: string;
  secondary?: string;
};

// type AgentOption = {
//   id: string;
//   name: string;
// };

export interface Model {
  modelType: string;
  provider: string;
  modelName: string;
  modelKey: string;
  isMultimodal: boolean;
  isDefault: boolean;
}

export interface ChatMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  temperature: number;
  maxTokens: number;
}

export type ChatInputProps = {
  onSubmit: (
    message: string,
    modelType: ModelType,
    attachedFiles?: ProcessedFile[],
    modelKey?: string,
    modelName?: string,
    chatMode?: string,
    useReasoning?: boolean,
    useWebSearch?: boolean,
    contextRefs?: ContextRef[],
    filters?: { apps: string[]; kb: string[] },
    agentId?: string
  ) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: Model | null;
  selectedChatMode: ChatMode | null;
  onModelChange: (model: Model) => void;
  onChatModeChange: (mode: ChatMode) => void;
  apps?: Array<{ id: string; name: string; iconPath?: string }>;
  knowledgeBases?: Array<{ id: string; name: string }>;
  initialSelectedApps?: string[];
  initialSelectedKbIds?: string[];
  onFiltersChange?: (filters: { apps: string[]; kb: string[] }) => void;
  prefillMessage?: string;
};

type ProcessedFile = {
  filename: string;
  fileType: string;
  markdownContent: string;
  processingTimeMs: number;
};

type UploadingFile = {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  processed?: ProcessedFile;
};

// Define chat modes locally in the frontend
const CHAT_MODES: ChatMode[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced responses with moderate creativity',
    icon: '🎯',
    temperature: 0.7,
    maxTokens: 4000,
  },
  {
    id: 'quick',
    name: 'Quick',
    description: 'Quick responses with minimal context',
    icon: '🚀',
    temperature: 0.1,
    maxTokens: 1000,
  },
];

// Provider display names
const normalizeDisplayName = (name: string): string =>
  name
    .split('_')
    .map((word) => {
      const upperWord = word.toUpperCase();
      if (
        [
          'ID',
          'URL',
          'API',
          'UI',
          'DB',
          'AI',
          'ML',
          'KB',
          'PDF',
          'CSV',
          'JSON',
          'XML',
          'HTML',
          'CSS',
          'JS',
          'GCP',
          'AWS',
        ].includes(upperWord)
      ) {
        return upperWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  azureOpenAI: 'Azure OpenAI',
  openAI: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  claude: 'Claude',
  ollama: 'Ollama',
  bedrock: 'AWS Bedrock',
  xai: 'xAI',
  together: 'Together',
  groq: 'Groq',
  fireworks: 'Fireworks',
  cohere: 'Cohere',
  openAICompatible: 'OpenAI API Compatible',
  mistral: 'Mistral',
  voyage: 'Voyage',
  jinaAI: 'Jina AI',
  sentenceTransformers: 'Default',
  default: 'Default',
};

export const formattedProvider = (provider: string): string =>
  PROVIDER_DISPLAY_NAMES[provider] || normalizeDisplayName(provider);

const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
  placeholder = 'Send a message to Thero',
  selectedModel,
  selectedChatMode,
  onModelChange,
  onChatModeChange,
  apps = [],
  knowledgeBases = [],
  initialSelectedApps = [],
  initialSelectedKbIds = [],
  onFiltersChange,
  prefillMessage,
}) => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { t } = useTranslate('navbar');
  const placeholderText =
    placeholder && placeholder.trim().length > 0 ? placeholder : 'What would you like to know?';
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [hasText, setHasText] = useState(false);
  const [promptPickerOpen, setPromptPickerOpen] = useState(false);
  const [promptQuickList, setPromptQuickList] = useState<PromptTemplate[]>([]);
  const [promptSearch, setPromptSearch] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelType>('chat');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const dragStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [useReasoning, setUseReasoning] = useState<boolean>(false);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  // const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([]);
  // const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  // const [agentsError, setAgentsError] = useState<string | null>(null);
  // const showCenterHint = !hasText && !isFocused;
  const messageRef = useRef<string>('');
  const voiceBaseMessageRef = useRef<string>('');

  // Context mentions state
  const [selectedContext, setSelectedContext] = useState<ContextRef[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<{
    kbs: SuggestionItem[];
    projects: SuggestionItem[];
    records: SuggestionItem[];
    apps: SuggestionItem[];
    users: SuggestionItem[];
  }>({ kbs: [], projects: [], records: [], apps: [], users: [] });
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const projectsCacheRef = useRef<any[] | null>(null);
  const mentionSearchRef = useRef<HTMLInputElement | null>(null);
  const mentionListRef = useRef<HTMLDivElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'kb' | 'project' | 'record' | 'app' | 'user'
  >('all');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const debouncedPromptSearch = useDebounce(promptSearch, 300);

  // Filter state
  const [resourcesAnchor, setResourcesAnchor] = useState<null | HTMLElement>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>(initialSelectedApps || []);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(initialSelectedKbIds || []);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showMoreApps, setShowMoreApps] = useState(false);
  const [showMoreKBs, setShowMoreKBs] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    apps: true,
    kb: false,
  });

  const kbNameMap = useMemo(() => {
    const map = new Map<string, string>();
    knowledgeBases.forEach((kb) => map.set(kb.id, kb.name));
    return map;
  }, [knowledgeBases]);

  const appItems = useMemo(() => apps || [], [apps]);

  // Sync from parent only when props actually change
  useEffect(() => {
    const initialSet = new Set(initialSelectedApps || []);
    const currentSet = new Set(selectedApps);
    const same =
      initialSet.size === currentSet.size &&
      [...initialSet].every((value) => currentSet.has(value));
    if (!same) {
      setSelectedApps(initialSelectedApps || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedApps]);

  useEffect(() => {
    const initialSet = new Set(initialSelectedKbIds || []);
    const currentSet = new Set(selectedKbIds);
    const same =
      initialSet.size === currentSet.size &&
      [...initialSet].every((value) => currentSet.has(value));
    if (!same) {
      setSelectedKbIds(initialSelectedKbIds || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedKbIds]);

  // Memoized filtered lists for performance and stability
  const filteredApps = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return appItems;
    return appItems.filter((a) => (a?.name || '').toLowerCase().includes(term));
  }, [appItems, searchTerm]);

  const filteredKBs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return knowledgeBases;
    return knowledgeBases.filter((kb) => (kb?.name || '').toLowerCase().includes(term));
  }, [knowledgeBases, searchTerm]);

  // Prefetch app icons to avoid flicker when switching tabs
  useEffect(() => {
    try {
      (appItems || []).forEach((app) => {
        if (app?.iconPath) {
          const img = new Image();
          img.src = app.iconPath;
        }
      });
    } catch (e) {
      // ignore prefetch errors
    }
  }, [appItems]);

  const loadPromptQuickList = useCallback(async (query?: string) => {
    try {
      setPromptLoading(true);
      const list = await PromptLibraryApi.list({
        visibility: 'all',
        search: query?.trim() ? query.trim() : undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setPromptQuickList(list.slice(0, 30));
    } catch (error) {
      toast.error('Prompt library is unavailable right now.');
    } finally {
      setPromptLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!promptPickerOpen) return;
    loadPromptQuickList(debouncedPromptSearch);
  }, [promptPickerOpen, debouncedPromptSearch, loadPromptQuickList]);

  // Notify parent about filters so first submit has correct filters
  const lastEmittedRef = useRef<{ apps: string[]; kb: string[] } | null>(null);
  useEffect(() => {
    if (!onFiltersChange) return;
    const payload = { apps: selectedApps, kb: selectedKbIds };
    const last = lastEmittedRef.current;
    const same =
      !!last &&
      last.apps.length === payload.apps.length &&
      last.kb.length === payload.kb.length &&
      last.apps.every((v, i) => v === payload.apps[i]) &&
      last.kb.every((v, i) => v === payload.kb[i]);
    if (!same) {
      lastEmittedRef.current = payload;
      onFiltersChange(payload);
    }
  }, [selectedApps, selectedKbIds, onFiltersChange]);

  const openResourcesMenu = (event: React.MouseEvent<HTMLElement>) =>
    setResourcesAnchor(event.currentTarget);

  const closeResourcesMenu = () => setResourcesAnchor(null);

  const toggleApp = (id: string) => {
    setSelectedApps((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleKb = (id: string) => {
    setSelectedKbIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const toggleSection = (section: 'apps' | 'kb') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const fetchAvailableModels = async () => {
    try {
      setLoadingModels(true);
      const response = await axios.get('/api/v1/configurationManager/ai-models/available/llm');

      if (response.data.status === 'success') {
        setModels(response.data.data || []);

        // Set default model if not already selected
        if (!selectedModel && response.data.data && response.data.data.length > 0) {
          const defaultModel =
            response.data.data.find((model: Model) => model.isDefault) || response.data.data[0];
          onModelChange(defaultModel);
        }
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // --- Mention Suggestions Fetchers ---
  const fetchKBs = useCallback(async (search: string) => {
    try {
      const res = await axios.get('/api/v1/knowledgeBase/', {
        params: { page: 1, limit: 5, search },
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.knowledgeBases || [];
      return (list || []).map((kb: any) => ({
        type: 'kb' as const,
        id: kb.id || kb._key || kb._id || kb?.kbId,
        label: kb.name,
      }));
    } catch {
      return [] as SuggestionItem[];
    }
  }, []);

  const fetchProjects = useCallback(async (search: string) => {
    try {
      if (!projectsCacheRef.current) {
        const res = await axios.get('/api/v1/projects', { params: { scope: 'all' } });
        projectsCacheRef.current = Array.isArray(res.data) ? res.data : [];
      }
      const list = (projectsCacheRef.current || [])
        .filter((p: any) => (p?.title || '').toLowerCase().includes((search || '').toLowerCase()))
        .slice(0, 5)
        .map((p: any) => ({
          type: 'project' as const,
          id: String(p._id || p.id),
          label: p.title || p.name || 'Project',
        }));
      return list as SuggestionItem[];
    } catch {
      return [] as SuggestionItem[];
    }
  }, []);

  const fetchRecords = useCallback(async (search: string) => {
    try {
      const res = await axios.get('/api/v1/knowledgeBase/records', {
        params: { page: 1, limit: 5, search },
      });
      const { records } = res.data || {};
      const list = (records || []).map((r: any) => ({
        type: 'record' as const,
        id: r._id || r.id || r.recordId,
        label: r.recordName || r.name || r.fileRecord?.name || 'File',
      }));
      return list as SuggestionItem[];
    } catch {
      return [] as SuggestionItem[];
    }
  }, []);

  const fetchApps = useCallback(async (search: string) => {
    // Static app types supported by ES validators
    const all = [
      { id: 'drive', label: 'Drive' },
      { id: 'gmail', label: 'Gmail' },
      { id: 'local', label: 'Local' },
    ];
    const filtered = all
      .filter((a) => a.label.toLowerCase().includes((search || '').toLowerCase()))
      .slice(0, 5)
      .map((a) => ({ type: 'app' as const, id: a.id, label: a.label }));
    return filtered as SuggestionItem[];
  }, []);

  const fetchUsers = useCallback(async (search: string) => {
    try {
      const res = await axios.get('/api/v1/users');
      const list = Array.isArray(res.data) ? res.data : [];
      const q = (search || '').toLowerCase();
      return list
        .filter(
          (u: any) =>
            (u.fullName || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        )
        .slice(0, 8)
        .map((u: any) => ({
          type: 'user' as const,
          id: String(u._id || u.id),
          label: u.fullName || u.email || 'User',
        }));
    } catch {
      return [] as SuggestionItem[];
    }
  }, []);

  // Debounced mention query handler
  useEffect(() => {
    if (!showMentionMenu) return;
    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
    mentionDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const [kbs, projects, records, appsList, users] = await Promise.all([
          fetchKBs(mentionQuery),
          fetchProjects(mentionQuery),
          fetchRecords(mentionQuery),
          fetchApps(mentionQuery),
          fetchUsers(mentionQuery),
        ]);
        setSuggestions({ kbs, projects, records, apps: appsList, users });
      } finally {
        setLoadingSuggestions(false);
      }
    }, 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionQuery, showMentionMenu]);

  const updateScrollIndicators = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      setShowScrollHint(false);
      return;
    }
    const canScroll = textarea.scrollHeight - textarea.clientHeight > 1;
    const isAtBottom = textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight - 1;
    setShowScrollHint(canScroll && !isAtBottom);
  }, []);

  const syncOverlayScroll = useCallback(() => {
    if (!inputRef.current || !overlayRef.current) {
      return;
    }
    const scrollOffset = inputRef.current.scrollTop;
    overlayRef.current.style.transform = `translateY(-${scrollOffset}px)`;
    updateScrollIndicators();
  }, [updateScrollIndicators]);

  // Auto-resize textarea with debounce
  const autoResizeTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(inputRef.current.scrollHeight, 46), 180);
      inputRef.current.style.height = `${newHeight}px`;
      syncOverlayScroll();
    }
  }, [syncOverlayScroll]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return undefined;
    }

    const handleScroll = () => {
      syncOverlayScroll();
      updateScrollIndicators();
    };

    textarea.addEventListener('scroll', handleScroll);
    // Ensure overlay stays aligned on mount
    syncOverlayScroll();

    return () => {
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, [syncOverlayScroll, updateScrollIndicators]);

  const normalizeWhitespace = useCallback((text: string) => text.replace(/\s+/g, ' ').trim(), []);

  const handleSpeechResult = useCallback(
    ({
      finalTranscript,
      interimTranscript,
    }: {
      finalTranscript: string;
      interimTranscript: string;
    }) => {
      const base = voiceBaseMessageRef.current || '';
      if (finalTranscript) {
        const combined = normalizeWhitespace([base, finalTranscript].filter(Boolean).join(' '));
        voiceBaseMessageRef.current = combined;
        setMessage(combined);
        setHasText(!!combined);
        return;
      }

      if (interimTranscript) {
        const preview = normalizeWhitespace([base, interimTranscript].filter(Boolean).join(' '));
        setMessage(preview);
        setHasText(!!preview);
      }
    },
    [normalizeWhitespace]
  );

  const handleSpeechError = useCallback((err: unknown) => {
    voiceBaseMessageRef.current = '';
    // eslint-disable-next-line no-console
    console.error('[Voice] Fehler', err);
  }, []);

  const {
    isSupported: isSpeechSupported,
    isRecording,
    toggle: toggleVoiceRecording,
    stop: stopVoiceRecording,
    error: speechError,
  } = useSpeechRecognition({
    onStart: () => {
      voiceBaseMessageRef.current = messageRef.current || '';
      // eslint-disable-next-line no-console
      console.info('[Voice] Aufnahme gestartet');
    },
    onResult: ({ finalTranscript, interimTranscript }) => {
      handleSpeechResult({ finalTranscript, interimTranscript });
    },
    onEnd: () => {
      voiceBaseMessageRef.current = '';
      // eslint-disable-next-line no-console
      console.info('[Voice] Aufnahme beendet');
    },
    onError: handleSpeechError,
  });

  useEffect(() => {
    if (disabled && isRecording) {
      stopVoiceRecording();
    }
  }, [disabled, isRecording, stopVoiceRecording]);

  const speechErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!speechError) return;
    const code = 'error' in speechError ? speechError.error : speechError.message;
    if (!code || speechErrorRef.current === code) {
      return;
    }
    speechErrorRef.current = code;

    const descriptionMap: Record<string, string> = {
      'not-allowed':
        'Mikrofonberechtigung verweigert. Bitte erlaube den Zugriff in deinem Browser.',
      'service-not-allowed':
        'Der Browser blockiert die Spracherkennung. Bitte überprüfe deine Einstellungen.',
      network:
        'Verbindung zur Spracherkennung fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut.',
      aborted: 'Die Spracherkennung wurde abgebrochen. Bitte starte sie erneut.',
    };

    toast(descriptionMap[code] || 'Die Spracherkennung konnte nicht fortgesetzt werden.', {
      description: 'Sprachaufnahme fehlgeschlagen',
    });
  }, [speechError]);

  // Keep a live ref of the current message to avoid stale closures
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    if (!prefillMessage?.trim()) return;
    // Always set the message when prefillMessage is provided (for prompt card selection)
    setMessage(prefillMessage);
    setHasText(!!prefillMessage.trim());
    setTimeout(() => {
      autoResizeTextarea();
      // Focus the textarea after prefilling
      if (inputRef.current) {
        inputRef.current.focus();
        // Move cursor to end
        const length = prefillMessage.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  }, [prefillMessage, autoResizeTextarea]);

  // Ensure textarea height stays in sync with content, including when
  // message is updated programmatically (e.g. inserting a large prompt).
  useEffect(() => {
    autoResizeTextarea();
  }, [message, autoResizeTextarea]);

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target;
      setMessage(value);
      setHasText(!!value.trim());

      // Debounce resize to prevent excessive calculations
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(autoResizeTextarea, 50);

      // Detect mention trigger and query
      const caretPos = e.target.selectionStart || value.length;
      const uptoCaret = value.slice(0, caretPos);
      // Find the last '@' that starts a token
      const atIndex = uptoCaret.lastIndexOf('@');
      if (atIndex >= 0) {
        // Ensure '@' is at start or preceded by whitespace
        const before = atIndex === 0 ? ' ' : uptoCaret[atIndex - 1];
        if (/\s/.test(before)) {
          const token = uptoCaret.slice(atIndex + 1);
          // stop token at first whitespace or newline
          const stopIdx = token.search(/[\s\n]/);
          if (stopIdx === -1) {
            const rawQuery = token;
            setMentionQuery(rawQuery);
            setShowMentionMenu(true);
            return;
          }
        }
      }
      setShowMentionMenu(false);
      setMentionQuery('');
    },
    [autoResizeTextarea]
  );

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    if (!message.trim()) {
      setIsFocused(false);
    }
  }, [message]);

  // Handle submission
  const handlePromptInsert = (content: string) => {
    const normalized = content || '';
    setMessage(normalized);
    setHasText(!!normalized.trim());
    setPromptPickerOpen(false);
    if (inputRef.current) {
      inputRef.current.scrollTop = 0;
    }
    // ensure textarea height is updated when inserting large prompts
    setTimeout(() => {
      autoResizeTextarea();
      updateScrollIndicators();
    }, 0);
  };

  const handleSubmit = useCallback(async () => {
    const trimmedValue = message.trim();
    if (!trimmedValue || isLoading || isSubmitting || disabled) {
      return;
    }
    // TEMPORARILY DISABLED: Agent-specific submit guard since 'agent' model is disabled

    setIsSubmitting(true);

    try {
      // Clear input immediately for better UX
      setMessage('');
      setHasText(false);

      // Reset textarea height
      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = '54px';
            inputRef.current.scrollTop = 0;
            syncOverlayScroll();
          }
        }, 50);
      }

      // Build active context from inline mentions that remain in the text
      const activeContext = selectedContext.filter((ref) => trimmedValue.includes(`@${ref.label}`));

      // Send message to parent (this is the ONLY parent communication)
      await onSubmit(
        trimmedValue,
        activeModel,
        processedFiles.length > 0 ? processedFiles : undefined,
        selectedModel?.modelKey,
        selectedModel?.modelName,
        selectedChatMode?.id,
        useReasoning,
        useWebSearch,
        activeContext,
        { apps: selectedApps, kb: selectedKbIds },
        selectedAgentId
      );

      setProcessedFiles([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setMessage(trimmedValue);
      setHasText(true);
    } finally {
      setIsSubmitting(false);

      // Refocus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [
    message,
    isLoading,
    isSubmitting,
    disabled,
    onSubmit,
    processedFiles,
    activeModel,
    selectedModel,
    selectedChatMode,
    useReasoning,
    useWebSearch,
    selectedContext,
    selectedApps,
    selectedKbIds,
    selectedAgentId,
    syncOverlayScroll,
  ]);

  // Helper: insert a selected mention inline and place caret after it
  const insertMention = useCallback((s: SuggestionItem) => {
    setSelectedContext((prev) => {
      const exists = prev.find((p) => p.id === s.id && p.type === s.type);
      if (exists) return prev;
      return [...prev, { type: s.type, id: s.id, label: s.label }];
    });

    const textarea = inputRef.current;
    const prevText = messageRef.current;
    const caret = textarea?.selectionStart ?? prevText.length;
    const upto = prevText.slice(0, caret);
    const atIdx = upto.lastIndexOf('@');
    if (atIdx >= 0) {
      const before = atIdx === 0 ? ' ' : upto[atIdx - 1];
      if (/\s/.test(before)) {
        const after = prevText.slice(caret);
        const next = `${prevText.slice(0, atIdx)}@${s.label} ${after}`;
        setMessage(next);
        setHasText(!!next.trim());
        setShowMentionMenu(false);
        setMentionQuery('');
        setActiveIndex(-1);
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          const pos = atIdx + 1 + s.label.length + 1; // include trailing space
          try {
            el.setSelectionRange(pos, pos);
          } catch {
            /* noop */
          }
          el.focus();
        });
      }
    }
  }, []);

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMentionMenu) {
        const all: SuggestionItem[] = [
          ...(suggestions.kbs || []),
          ...(suggestions.projects || []),
          ...(suggestions.records || []),
          ...(suggestions.apps || []),
          ...(suggestions.users || []),
        ];
        const visible = all.filter((s) => activeCategory === 'all' || s.type === activeCategory);
        if (e.key === ' ') {
          setShowMentionMenu(false);
          setActiveIndex(-1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => Math.min((prev ?? -1) + 1, visible.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((prev) => Math.max((prev ?? visible.length) - 1, 0));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < visible.length) {
            const s = visible[activeIndex];
            insertMention(s);
            return;
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowMentionMenu(false);
          setActiveIndex(-1);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, showMentionMenu, suggestions, activeCategory, activeIndex, insertMention]
  );

  // Reset submission state when loading state changes or component unmounts
  useEffect(() => {
    // If loading is false and we were submitting, reset the state
    if (!isLoading && isSubmitting) {
      setIsSubmitting(false);
    }

    // Cleanup function to reset submission state on unmount
    return () => {
      // isSubmittingRef.current = false; // This line is removed as per the edit hint
    };
  }, [isLoading, isSubmitting]);

  // Process uploaded file
  const processFile = useCallback(
    async (file: File) => {
      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'uploading',
      };

      setUploadingFiles((prev) => [...prev, uploadingFile]);

      let progressInterval: NodeJS.Timeout | null = null;

      try {
        // Simulate upload progress
        progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file && f.status === 'uploading'
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 100);

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload and process file
        const url = conversationId
          ? `/api/v1/temp-file-process?chatId=${encodeURIComponent(conversationId)}`
          : '/api/v1/temp-file-process';
        const response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (progressInterval) {
          clearInterval(progressInterval);
        }

        if (response.data.success) {
          const processedFile: ProcessedFile = {
            filename: response.data.filename,
            fileType: response.data.file_type,
            markdownContent: response.data.markdown_content,
            processingTimeMs: response.data.processing_time_ms,
          };

          // Update uploading file to completed
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, progress: 100, status: 'completed', processed: processedFile }
                : f
            )
          );

          // Add to processed files
          setProcessedFiles((prev) => [...prev, processedFile]);

          // Remove from uploading files after animation
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
          }, 2000);
        } else {
          throw new Error(response.data.error || 'Verarbeitung fehlgeschlagen');
        }
      } catch (error) {
        console.error('File processing error:', error);

        // Clear any existing progress interval
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        // Update uploading file to error with proper error message
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unbekannter Fehler',
                  progress: 0, // Reset progress on error
                }
              : f
          )
        );

        // Remove from uploading files after a longer delay to show error
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
        }, 3000);
      }
    },
    [conversationId]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      // Validate files
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'text/plain',
        'text/markdown',
        'text/html',
        'text/csv',
      ];

      const validFiles = fileArray.filter((file) => {
        const isValidType =
          supportedTypes.includes(file.type) ||
          file.name.toLowerCase().endsWith('.md') ||
          file.name.toLowerCase().endsWith('.txt') ||
          file.name.toLowerCase().endsWith('.csv');

        const isValidSize = file.size <= 30 * 1024 * 1024; // 30MB limit

        if (!isValidType) {
          console.warn(`Unsupported file type: ${file.type} for ${file.name}`);
          return false;
        }

        if (!isValidSize) {
          console.warn(`File too large: ${file.name} (${file.size} bytes)`);
          return false;
        }

        return true;
      });

      // Process valid files
      validFiles.forEach(processFile);
    },
    [processFile]
  );

  // Handle drag and drop with improved state management
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear any existing timeout
    if (dragStateTimeoutRef.current) {
      clearTimeout(dragStateTimeoutRef.current);
    }

    // Only set drag over if not already in that state to prevent unnecessary re-renders
    setIsDragOver((prev) => {
      if (!prev) return true;
      return prev;
    });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only clear drag over if we're actually leaving the drop zone
    // Check if we're leaving the actual drop target, not just a child element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      // Use debounced state update to prevent flickering
      if (dragStateTimeoutRef.current) {
        clearTimeout(dragStateTimeoutRef.current);
      }

      dragStateTimeoutRef.current = setTimeout(() => {
        setIsDragOver(false);
      }, 50); // Small delay to prevent rapid state changes
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Clear any pending drag state timeout
      if (dragStateTimeoutRef.current) {
        clearTimeout(dragStateTimeoutRef.current);
      }

      // Immediately clear drag state to prevent UI flickering
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  // Handle file input click
  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        handleFileUpload(e.target.files);
      } catch (error) {
        console.error('Error handling file input change:', error);
      } finally {
        // Always reset the input value to allow selecting the same file again
        e.target.value = '';
      }
    },
    [handleFileUpload]
  );

  const handleMicToggle = useCallback(() => {
    if (!isSpeechSupported || disabled) return;
    toggleVoiceRecording();
  }, [disabled, isSpeechSupported, toggleVoiceRecording]);

  // Remove processed file
  const removeProcessedFile = useCallback((filename: string) => {
    setProcessedFiles((prev) => prev.filter((f) => f.filename !== filename));
  }, []);

  // Note: Model and Chat Mode selection menus removed per design request.

  // Auto-focus on mount and add scrollbar styles
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();

      // Add scrollbar styles - thinner scrollbar without shadows
      // const styleId = 'chat-textarea-style';
      // if (!document.getElementById(styleId)) {
      //   const style = document.createElement('style');
      //   style.id = styleId;
      //   style.textContent = `
      //   textarea::-webkit-scrollbar {
      //     width: 4px;
      //     background-color: transparent;
      //   }
      //   textarea::-webkit-scrollbar-track {
      //     background-color: transparent;
      //     border: none;
      //     box-shadow: none;
      //   }
      //   textarea::-webkit-scrollbar-thumb {
      //     background-color: rgba(0, 0, 0, 0.15);
      //     border-radius: 1px;
      //     border: none;
      //     box-shadow: none;
      //   }
      //   textarea::-webkit-scrollbar-thumb:hover {
      //     background-color: rgba(0, 0, 0, 0.25);
      //   }
      //   .dark textarea::-webkit-scrollbar-thumb {
      //     background-color: rgba(255, 255, 255, 0.15);
      //   }
      //   .dark textarea::-webkit-scrollbar-thumb:hover {
      //     background-color: rgba(255, 255, 255, 0.25);
      //   }
      //   textarea::-webkit-scrollbar-corner {
      //     background-color: transparent;
      //   }
      // `;
      //   document.head.appendChild(style);
      // }
    }

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Load stored reasoning state per conversation
  useEffect(() => {
    try {
      const convKey = conversationId || 'new';
      const stored = localStorage.getItem(`reasoning:${convKey}`);
      if (stored != null) {
        setUseReasoning(Boolean(JSON.parse(stored)));
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Set default chat mode if not already selected
  useEffect(() => {
    if (!selectedChatMode && CHAT_MODES.length > 0) {
      onChatModeChange(CHAT_MODES[0]); // Set first mode as default
    }
    if (!selectedModel && models.length > 0) {
      const defaultModel = models.find((model: Model) => model.isDefault) || models[0];
      onModelChange(defaultModel); // Set first model as default
    }
  }, [selectedChatMode, onChatModeChange, models, onModelChange, selectedModel]);

  useEffect(() => {
    fetchAvailableModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeModel === 'deepResearch') {
      setUseWebSearch(true);
    }
  }, [activeModel]);

  // After the prompt picker sheet fully closes, safely restore focus to the textarea.
  // This avoids focusing descendants while Radix temporarily sets aria-hidden on #root.
  useEffect(() => {
    if (!promptPickerOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [promptPickerOpen]);

  // TEMPORARILY DISABLED: Agent selection memo & requirement flag since 'agent' model is disabled
  const canSubmit = hasText && !isLoading && !isSubmitting && !disabled;

  const quickMode = CHAT_MODES.find((mode) => mode.id === 'quick') || CHAT_MODES[1];
  const defaultMode = CHAT_MODES[0];
  const isQuickModeActive = selectedChatMode?.id === 'quick';

  const handleQuickToggle = () => {
    if (!quickMode) return;
    if (isQuickModeActive) {
      onChatModeChange(defaultMode);
    } else {
      onChatModeChange(quickMode);
    }
  };

  // Cleanup effect to prevent state conflicts and memory leaks
  // Cleanup function to reset states when component unmounts or when there are rapid changes
  useEffect(() => {
    // Clear any pending timeouts or intervals
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    if (dragStateTimeoutRef.current) {
      clearTimeout(dragStateTimeoutRef.current);
    }

    // Reset drag state to prevent stuck states
    setIsDragOver(false);

    // Reset submission state
    setIsSubmitting(false);
  }, []);

  // Effect to handle disabled state changes
  useEffect(() => {
    if (disabled) {
      // Clear drag state when disabled
      setIsDragOver(false);
      // Reset submission state
      setIsSubmitting(false);
    }
  }, [disabled]);

  const submitStatus: 'submitted' | 'streaming' | 'ready' | 'error' =
    isLoading || isSubmitting ? 'submitted' : 'ready';

  // Memoize modeOptions to prevent recreation on every render
  const modeOptions: { id: ModelType; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      // TEMPORARILY DISABLED: Agent mode option - commented out as requested
      /*
    {
      id: 'agent',
      label: t('chatInput.modelTypes.agent'),
      icon: (
        <svg viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
          <g clipPath="url(#agent-clip)">
            <path d="M7.9987 9.46029C8.36689 9.46029 8.66536 9.16181 8.66536 8.79362C8.66536 8.42543 8.36689 8.12695 7.9987 8.12695C7.63051 8.12695 7.33203 8.42543 7.33203 8.79362C7.33203 9.16181 7.63051 9.46029 7.9987 9.46029Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.4679 6.32507C7.43972 3.31022 3.8846 1.96288 2.53059 3.32356C1.16991 4.67757 2.51725 8.23269 5.5321 11.2609" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.729 6.32507C14.1482 5.03571 14.0955 3.94661 13.4694 3.32356C12.1154 1.96288 8.56028 3.31022 5.5321 6.32507C2.51725 9.35325 1.16991 12.9084 2.53059 14.2624C3.34907 15.0849 4.97182 14.9179 6.79629 13.9912" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.9043 14.4512L13.5625 13.5527H10.6523L10.3105 14.4707C10.1771 14.8288 10.0632 15.0713 9.96875 15.1982C9.87435 15.3219 9.71973 15.3838 9.50488 15.3838C9.32259 15.3838 9.16146 15.3171 9.02148 15.1836C8.88151 15.0501 8.81152 14.8988 8.81152 14.7295C8.81152 14.6318 8.8278 14.5309 8.86035 14.4268C8.8929 14.3226 8.94661 14.1777 9.02148 13.9922L10.8525 9.34375C10.9046 9.21029 10.9665 9.05078 11.0381 8.86523C11.113 8.67643 11.1911 8.52018 11.2725 8.39648C11.3571 8.27279 11.4661 8.1735 11.5996 8.09863C11.7363 8.02051 11.904 7.98145 12.1025 7.98145C12.3044 7.98145 12.472 8.02051 12.6055 8.09863C12.7422 8.1735 12.8512 8.27116 12.9326 8.3916C13.0173 8.51204 13.0872 8.64225 13.1426 8.78223C13.2012 8.91895 13.2744 9.10286 13.3623 9.33398L15.2324 13.9531C15.3789 14.3047 15.4521 14.5602 15.4521 14.7197C15.4521 14.8857 15.3822 15.0387 15.2422 15.1787C15.1055 15.3154 14.9395 15.3838 14.7441 15.3838C14.6302 15.3838 14.5326 15.3626 14.4512 15.3203C14.3698 15.2812 14.3014 15.2275 14.2461 15.1592C14.1908 15.0876 14.1305 14.9801 14.0654 14.8369C14.0036 14.6904 13.9499 14.5618 13.9043 14.4512ZM11.0332 12.4639H13.1719L12.0928 9.50977L11.0332 12.4639Z" fill="currentColor" />
          </g>
          <defs>
            <clipPath id="agent-clip"><rect width="16" height="16" fill="white" y="0.5" /></clipPath>
          </defs>
        </svg>
      ),
    },
    */
      {
        id: 'knowledge',
        label: t('chatInput.modelTypes.knowledge'),
        icon: <BookOpen size={14} />,
      },
      {
        id: 'chat',
        label: t('chatInput.modelTypes.chat'),
        icon: <MessageCircle size={14} />,
      },
      {
        id: 'deepResearch',
        label: t('chatInput.modelTypes.deepResearch'),
        icon: <ScanSearch size={16} />,
      },
      {
        id: 'image',
        label: t('chatInput.modelTypes.image'),
        icon: <ImageIcon size={14} />,
      },
    ],
    [t]
  );

  return (
    <div className="w-full mx-auto max-w-4xl py-2">
      <ContextChips
        selectedContext={selectedContext}
        onRemove={(idx) => setSelectedContext((prev) => prev.filter((_, i) => i !== idx))}
      />

      <FilterBadges
        selectedApps={selectedApps}
        selectedKbIds={selectedKbIds}
        appItems={appItems}
        kbNameMap={kbNameMap}
        onToggleApp={toggleApp}
        onToggleKb={toggleKb}
        onOpenResourcesMenu={openResourcesMenu}
      />

      <FileUploadDisplay
        processedFiles={processedFiles}
        uploadingFiles={uploadingFiles}
        onRemoveProcessedFile={removeProcessedFile}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt,.txt,.md,.html,.csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        {isDragOver && (
          <div className="absolute inset-0 pointer-none: rounded-3xl flex items-center justify-center z-[10] border-2 border-dashed transition-all duration-200 ease-out bg-background/80 border-border backdrop-blur-sm">
            <h3 className="text-muted-foreground font-medium text-center select-none">
              {t('chatInput.dropFilesHere')}
            </h3>
          </div>
        )}

        <form
          className={cn(
            'w-full overflow-hidden rounded-3xl border border-border bg-background shadow-none p-1',
            'transition-all duration-200 focus-within:border-primary/50',
            disabled ? 'opacity-70' : ''
          )}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <AIInputTextarea
            ref={inputRef}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder=""
            maxHeight={180}
            aria-label={placeholderText}
            value={message}
            disabled={disabled || isSubmitting}
            className="text-transparent caret-foreground selection:bg-transparent"
          />
          {/* Visual overlay to render inline mention bubbles */}
          <div className="absolute left-0 right-0 top-0 bottom-12 pointer-events-none overflow-hidden">
            <div
              ref={overlayRef}
              className="p-3 text-base md:text-sm leading-6 md:leading-5 whitespace-pre-wrap break-words pointer-events-none pb-12"
              aria-hidden
            >
              <MentionBubbleOverlay
                message={message}
                selectedContext={selectedContext}
                placeholderText={placeholderText}
                onMessageChange={setMessage}
                onHasTextChange={setHasText}
                inputRef={inputRef}
              />
            </div>
            <div
              className={cn(
                'pointer-events-none absolute left-0 right-0 bottom-0 h-12 flex items-end justify-center pb-1',
                showScrollHint ? 'flex' : 'hidden'
              )}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          {/* Mention Suggestions: single panel with search + tabs inside chat area */}
          {showMentionMenu && (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              className={cn('absolute left-2 right-2 bottom-14 z-20')}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="p-2 border-b flex items-center gap-2">
                  <input
                    ref={mentionSearchRef}
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.target.value)}
                    className="w-full text-sm outline-none rounded-md px-2 py-1 bg-muted text-foreground placeholder:text-muted-foreground"
                    placeholder={t('chatInput.searchMentions')}
                  />
                </div>
                <div className="px-2 pt-2 flex items-center gap-2">
                  {(
                    [
                      { key: 'all', label: t('chatInput.all') },
                      { key: 'kb', label: t('chatInput.kb') },
                      { key: 'project', label: t('chatInput.projects') },
                      { key: 'record', label: t('chatInput.files') },
                      { key: 'app', label: t('chatInput.apps') },
                      { key: 'user', label: t('chatInput.users') },
                    ] as { key: any; label: string }[]
                  ).map(({ key, label }) => (
                    <button
                      type="button"
                      key={key}
                      className={cn(
                        'text-xs px-2 py-1 rounded-md border',
                        activeCategory === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-foreground hover:bg-muted/80'
                      )}
                      onClick={() => {
                        setActiveCategory(key);
                        setActiveIndex(-1);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  ref={mentionListRef}
                  className={cn('max-h-64 overflow-auto p-2 grid grid-cols-1 gap-1')}
                >
                  <MentionSuggestionsList
                    suggestions={suggestions}
                    activeCategory={activeCategory}
                    activeIndex={activeIndex}
                    loadingSuggestions={loadingSuggestions}
                    onInsertMention={insertMention}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between p-0">
            <div className="flex items-center gap-1 [&_button:first-child]:rounded-bl-3xl">
              {/* Compact modes dropdown */}
              <Select value={activeModel} onValueChange={(v) => setActiveModel(v as ModelType)}>
                <SelectTrigger className="h-8 px-2 border-0 bg-transparent shadow-none text-muted-foreground hover:bg-accent hover:text-foreground rounded-3xl">
                  <SelectValue>
                    <div
                      className="flex items-center gap-1"
                      title={modeOptions.find((m) => m.id === activeModel)?.label}
                    >
                      {modeOptions.find((m) => m.id === activeModel)?.icon}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        {m.icon}
                        <span className="text-muted-foreground">{m.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* TEMPORARILY DISABLED: Agent selection field - commented out as requested */}
              {/*
              {activeModel === 'agent' && (
                <CustomTooltip
                  title={
                    selectedAgent
                      ? t('chatInput.agentSelectedTooltip', { agentName: selectedAgent.name })
                      : t('chatInput.selectAgentTooltip')
                  }
                >
                  <Select
                    value={selectedAgentId}
                    onValueChange={(value) => setSelectedAgentId(value)}
                    disabled={agentsLoading || availableAgents.length === 0}
                  >
                    <SelectTrigger className="h-8 px-3 border-0 bg-transparent shadow-none text-muted-foreground hover:bg-accent hover:text-foreground">
                      {selectedAgent ? (
                        <span className="text-foreground text-sm">{selectedAgent.name}</span>
                      ) : agentsLoading ? (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t('chatInput.loadingAgents')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {t('chatInput.selectAgentPlaceholder')}
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" disabled className="hidden" />
                      {agentsLoading && (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('chatInput.loadingAgents')}
                          </div>
                        </SelectItem>
                      )}
                      {!agentsLoading && availableAgents.length === 0 && (
                        <SelectItem value="no-agents" disabled>
                          {agentsError ? t('chatInput.agentLoadError') : t('chatInput.noAgentsFound')}
                        </SelectItem>
                      )}
                      {!agentsLoading &&
                        availableAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </CustomTooltip>
              )}
              */}

              {/* Unified Resources selector with badge */}
              {(apps.length > 0 || knowledgeBases.length > 0) && (
                <CustomTooltip title={t('chatInput.selectAppsAndKnowledgeBases')}>
                  <div className="relative">
                    <AIInputButton
                      className="rounded-3xl"
                      onClick={openResourcesMenu}
                      aria-label="filter-resources"
                      title={t('chatInput.filterSources')}
                    >
                      <Icon icon={filterIcon} width={16} height={16} />
                    </AIInputButton>
                    {selectedApps.length + selectedKbIds.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {Math.min(selectedApps.length + selectedKbIds.length, 99)}
                      </span>
                    )}
                  </div>
                </CustomTooltip>
              )}

              <CustomTooltip title={t('chatInput.buttons.insertPromptFromLibrary')}>
                <AIInputButton
                  onClick={() => setPromptPickerOpen(true)}
                  aria-label="prompt-library"
                  className={cn('rounded-3xl', promptPickerOpen ? 'text-primary' : '')}
                >
                  <BookMarked size={16} />
                </AIInputButton>
              </CustomTooltip>

              {/* Reasoning toggle */}
              <CustomTooltip
                title={
                  useReasoning
                    ? t('chatInput.buttons.disableReasoning')
                    : t('chatInput.buttons.enableReasoning')
                }
              >
                <AIInputButton
                  onClick={() => setUseReasoning((v) => !v)}
                  aria-label="reasoning-toggle"
                  className={cn(
                    'rounded-3xl',
                    useReasoning
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30'
                      : ''
                  )}
                >
                  <BrainCircuit size={16} />
                </AIInputButton>
              </CustomTooltip>

              {/* Quick mode toggle */}
              <CustomTooltip
                title={
                  isQuickModeActive
                    ? t('chatInput.quickModeDeactivate')
                    : t('chatInput.quickModeActivate')
                }
              >
                <AIInputButton
                  onClick={handleQuickToggle}
                  aria-label="quick-mode-toggle"
                  className={cn(
                    'rounded-3xl',
                    isQuickModeActive
                      ? 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                      : ''
                  )}
                >
                  <Rocket size={16} />
                </AIInputButton>
              </CustomTooltip>

              <CustomTooltip
                title={
                  useWebSearch
                    ? t('chatInput.buttons.disableWebSearch')
                    : t('chatInput.buttons.enableWebSearch')
                }
              >
                <AIInputButton
                  onClick={() => setUseWebSearch((v) => !v)}
                  aria-label="web-search-toggle"
                  className={cn(
                    'rounded-3xl',
                    useWebSearch
                      ? 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30'
                      : ''
                  )}
                >
                  <GlobeIcon size={16} />
                </AIInputButton>
              </CustomTooltip>

              {/* Tools */}
              <CustomTooltip title={t('chatInput.buttons.attachFile')}>
                <AIInputButton
                  onClick={handleFileInputClick}
                  aria-label="attach"
                  className="rounded-3xl"
                >
                  <PlusIcon size={16} />
                </AIInputButton>
              </CustomTooltip>
              <CustomTooltip
                title={
                  isSpeechSupported
                    ? isRecording
                      ? t('chatInput.buttons.stopRecording')
                      : t('chatInput.buttons.startDictation')
                    : t('chatInput.buttons.speechNotSupported')
                }
              >
                <AIInputButton
                  aria-label="mic"
                  onClick={handleMicToggle}
                  disabled={!isSpeechSupported || disabled}
                  className={cn(
                    'rounded-3xl',
                    isRecording ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' : ''
                  )}
                >
                  <MicIcon size={16} />
                </AIInputButton>
              </CustomTooltip>
            </div>
            <AIInputSubmit disabled={!canSubmit} status={submitStatus} variant="ghost" />
          </div>
        </form>
      </div>

      <PromptPickerSheet
        open={promptPickerOpen}
        onOpenChange={setPromptPickerOpen}
        promptQuickList={promptQuickList}
        promptSearch={promptSearch}
        promptLoading={promptLoading}
        onSearchChange={setPromptSearch}
        onPromptInsert={handlePromptInsert}
      />

      {/* ChatBotFilters Component */}
      {(apps.length > 0 || knowledgeBases.length > 0) && (
        <ChatBotFilters
          resourcesAnchor={resourcesAnchor}
          closeResourcesMenu={closeResourcesMenu}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedApps={selectedApps}
          selectedKbIds={selectedKbIds}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          toggleApp={toggleApp}
          toggleKb={toggleKb}
          filteredApps={filteredApps}
          filteredKBs={filteredKBs}
          showMoreApps={showMoreApps}
          showMoreKBs={showMoreKBs}
          setShowMoreApps={setShowMoreApps}
          setShowMoreKBs={setShowMoreKBs}
          setSelectedApps={setSelectedApps}
          setSelectedKbIds={setSelectedKbIds}
        />
      )}
    </div>
  );
};

// CRITICAL: Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(ChatInput);
