import type React from 'react';
import type {
  Message,
  Citation,
  Conversation,
  CustomCitation,
  FormattedMessage,
  ExpandedCitationsState,
} from '@/types/chat-bot';

import { toast } from 'sonner';
import { useTheme } from '@/theme/theme-provider';
import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import axios from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import { KnowledgeBaseAPI } from 'src/sections/knowledgebase/services/api';
import { ORIGIN } from 'src/sections/knowledgebase/constants/knowledge-search';
import { getConnectorPublicUrl } from 'src/sections/accountdetails/account-settings/services/utils/services-configuration-service';

import { showMemorySuggestionToast } from '../components/memory-suggestion-toast';
// Import all types used in the original file
// import { Conversation, FormattedMessage, Message, Citation, CustomCitation, ExpandedCitationsState } from './types';

interface StreamingState {
  messageId: string | null;
  content: string;
  citations: CustomCitation[];
  thinking: string;
  toolCalls: NonNullable<FormattedMessage['toolCalls']>;
  webSources: NonNullable<FormattedMessage['webSources']>;
  isActive: boolean;
}

interface StreamingContextType {
  streamingState: StreamingState;
  updateStreamingContent: (messageId: string, content: string, citations: CustomCitation[]) => void;
  clearStreaming: () => void;
}

interface StreamingController {
  abort: () => void;
}

const STREAMING_ENDPOINTS = {
  agent: '/api/v1/chat/agent/stream',
  knowledge: '/api/v1/chat/knowledge/stream',
  chat: '/api/v1/chat/chat/stream',
  deepResearch: '/api/v1/chat/deep-research/stream',
  image: '/api/v1/chat/chat/stream',
} as const;

type StreamingMode = keyof typeof STREAMING_ENDPOINTS;

type WebSourceSummary = {
  id: number | string;
  title: string;
  url?: string;
  snippet?: string;
  domain?: string;
};

const STEP_LABELS: Record<string, string> = {
  started: 'Processing your query',
  transforming: 'Understanding conversation context',
  analyzing_query: 'Analyzing your question',
  searching_kb: 'Searching your knowledge bases',
  processing_results: 'Processing search results',
  ranking_results: 'Ranking relevant information',
  analyzing_intent: 'Deciding whether to search the web',
  knowledge_base_unavailable: 'Knowledge base unavailable',
  rag_search: 'Querying the knowledge base',
  rag_results: 'Knowledge base results ready',
  web_search: 'Starting web search',
  web_search_service_ready: 'Web search service ready',
  web_search_searxng: 'Searching the web (SearxNG)',
  web_search_firecrawl: 'Searching the web (Firecrawl fallback)',
  web_search_enrich_start: 'Fetching page content',
  web_search_enrich_complete: 'Web enrichment complete',
  web_search_enrich_error: 'Web enrichment failed',
  web_search_service_complete: 'Web search complete',
  web_results: 'Web sources ready',
  tool_call: 'Calling a tool',
  tool_success: 'Tool returned results',
  tool_error: 'Tool execution failed',
  thinking_chunk: 'Thinking',
  thinking_complete: 'Reasoning ready',
};

export const formatStepLabel = (value?: string): string => {
  if (!value) return 'Working...';
  const normalized = value.toLowerCase();
  if (STEP_LABELS[normalized]) {
    return STEP_LABELS[normalized];
  }
  return normalized
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const TRACKED_EVENTS = new Set([
  'status',
  'rag_search',
  'rag_results',
  'web_search',
  'web_results',
  'web_sources',
  'tool_call',
  'tool_success',
  'tool_error',
  'thinking_chunk',
  'thinking_complete',
  'meta',
  'error',
]);

const MAX_TIMELINE_EVENTS = 40;

export type TimelineEvent = {
  id: string;
  event: string;
  step: string;
  message?: string;
  timestamp: string;
  details?: Record<string, any>;
};

const getEngagingStatusMessage = (event: string, data: any): string | null => {
  const normalizedStep =
    typeof data?.step === 'string'
      ? data.step.toLowerCase()
      : typeof data?.status === 'string'
        ? data.status.toLowerCase()
        : undefined;
  const baseMessage = data?.message || formatStepLabel(normalizedStep);

  switch (event) {
    case 'status':
      return baseMessage;
    case 'rag_search':
    case 'rag_results':
    case 'web_search':
    case 'web_results':
    case 'web_sources':
    case 'tool_call':
    case 'tool_success':
    case 'tool_error':
      return baseMessage;
    case 'thinking_chunk':
      return data?.chunk ? `🧠 ${data.chunk}` : baseMessage || '🧠 Thinking...';
    case 'thinking_complete':
      return data?.thinking ? `🧠 ${data.thinking}` : baseMessage || '🧠 Reasoning ready.';
    case 'query_decomposed': {
      const queryCount = data.queries?.length || 0;
      if (queryCount > 1) {
        return `Breaking your request into ${queryCount} intents for better coverage.`;
      }
      return 'Analyzing your request...';
    }
    case 'search_complete': {
      const resultsCount = data.results_count || 0;
      if (resultsCount > 0) {
        return `Found ${resultsCount} potential sources. Processing them now...`;
      }
      return 'Finished searching...';
    }
    case 'connected':
      return 'Processing...';
    default:
      return baseMessage;
  }
};

export function useChatBot() {
  // State
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(false);
  const [expandedCitations, setExpandedCitations] = useState<ExpandedCitationsState>({});
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // eslint-disable-next-line
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [shouldRefreshSidebar, setShouldRefreshSidebar] = useState<boolean>(false);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aggregatedCitations, setAggregatedCitations] = useState<CustomCitation[] | null>([]);
  const [openPdfView, setOpenPdfView] = useState<boolean>(false);
  // const [showQuestionDetails, setShowQuestionDetails] = useState<boolean>(false);
  const [isExcel, setIsExcel] = useState<boolean>(false);
  const [isViewerReady, setIsViewerReady] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>();
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [isDocx, setIsDocx] = useState<boolean>(false);
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  const [isHtml, setIsHtml] = useState<boolean>(false);
  const [isTextFile, setIsTextFile] = useState<boolean>(false);
  const [isImage, setIsImage] = useState<boolean>(false);
  const [loadingConversations, setLoadingConversations] = useState<{ [key: string]: boolean }>({});
  const theme = useTheme();

  const accumulatedContentRef = useRef<string>('');
  const accumulatedThinkingRef = useRef<string>('');
  const accumulatedToolCallsRef = useRef<
    Record<string, NonNullable<FormattedMessage['toolCalls']>[number]>
  >({});
  const accumulatedCitationsRef = useRef<CustomCitation[]>([]);
  const displayedContentRef = useRef<string>('');
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const wordQueueRef = useRef<string[]>([]);
  const isStreamingActiveRef = useRef<boolean>(false);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionDataRef = useRef<any>(null);
  const pendingChunksRef = useRef<string[]>([]);
  const pendingThinkingChunksRef = useRef<string[]>([]);
  const isCompletionPendingRef = useRef<boolean>(false);
  const finalMessageIdRef = useRef<string | null>(null);
  const isProcessingCompletionRef = useRef<boolean>(false);
  const pendingGeneratedTitleRef = useRef<Record<string, string>>({});
  const suppressNextRouteLoadRef = useRef<boolean>(false);

  // const BATCH_SIZE = 1;
  const TYPING_SPEED = 25;
  const COMPLETION_DELAY = 300;

  const isCurrentConversationLoading = useCallback(
    () =>
      currentConversationId
        ? loadingConversations[currentConversationId]
        : loadingConversations.new,
    [currentConversationId, loadingConversations]
  );

  const [conversationStatus, setConversationStatus] = useState<{
    [key: string]: string | undefined;
  }>({});

  // const [conversationErrors, setConversationErrors] = useState<{
  //   [key: string]: boolean;
  // }>({});

  const [pendingResponseConversationId, setPendingResponseConversationId] = useState<string | null>(
    null
  );
  const [showWelcome, setShowWelcome] = useState<boolean>(
    () => messages.length === 0 && !currentConversationId
  );
  const [activeRequestTracker, setActiveRequestTracker] = useState<{
    current: string | null;
    type: 'create' | 'continue' | null;
  }>({
    current: null,
    type: null,
  });
  const currentConversationIdRef = useRef<string | null>(null);

  const [highlightedCitation, setHighlightedCitation] = useState<CustomCitation | null>(null);
  const [webSources, setWebSources] = useState<WebSourceSummary[]>([]);

  const [streamingState, setStreamingState] = useState<StreamingState>({
    messageId: null,
    content: '',
    citations: [],
    thinking: '',
    toolCalls: [],
    webSources: [],
    isActive: false,
  });

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);

  const [streamingController, setStreamingController] = useState<StreamingController | null>(null);

  const stopStreaming = useCallback(() => {
    try {
      if (streamingController) {
        streamingController.abort();
      }
      // eslint-disable-next-line no-empty
    } finally {
      setStreamingState((prev) => ({ ...prev, isActive: false }));
    }
  }, [streamingController]);

  const [knowledgeUsed, setKnowledgeUsed] = useState<boolean | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const timelineEventsRef = useRef<TimelineEvent[]>([]);

  // Sync ref with state
  useEffect(() => {
    timelineEventsRef.current = timelineEvents;
  }, [timelineEvents]);

  const formatMessage = useCallback((apiMessage: Message): FormattedMessage | null => {
    if (!apiMessage) return null;

    // Common base message properties
    const baseMessage = {
      id: apiMessage._id,
      timestamp: new Date(apiMessage.createdAt || new Date()),
      content: apiMessage.content || '',
      type: apiMessage.messageType === 'user_query' ? 'user' : 'bot',
      contentFormat: apiMessage.contentFormat || 'MARKDOWN',
      followUpQuestions: apiMessage.followUpQuestions || [],
      createdAt: apiMessage.createdAt ? new Date(apiMessage.createdAt) : new Date(),
      updatedAt: apiMessage.updatedAt ? new Date(apiMessage.updatedAt) : new Date(),
    };

    // For user messages
    if (apiMessage.messageType === 'user_query') {
      return {
        ...baseMessage,
        type: 'user',
        feedback: apiMessage.feedback || [],
      };
    }

    // For bot messages
    if (apiMessage.messageType === 'bot_response') {
      return {
        ...baseMessage,
        type: 'bot',
        confidence: apiMessage.confidence || '',
        thinking: apiMessage.thinking,
        toolCalls: apiMessage.toolCalls,
        webSources: apiMessage.webSources,
        citations: (apiMessage?.citations || []).map((citation: Citation) => ({
          id: citation.citationId,
          _id: citation?.citationData?._id || citation.citationId,
          citationId: citation.citationId,
          content: citation?.citationData?.content || '',
          metadata: citation?.citationData?.metadata || [],
          orgId: citation?.citationData?.metadata?.orgId || '',
          citationType: citation?.citationType || '',
          createdAt: citation?.citationData?.createdAt || new Date().toISOString(),
          updatedAt: citation?.citationData?.updatedAt || new Date().toISOString(),
          chunkIndex: citation?.citationData?.chunkIndex || 1,
        })),
      };
    }

    if (apiMessage.messageType === 'error') {
      return {
        ...baseMessage,
        type: 'bot',
        messageType: 'error',
        confidence: apiMessage.confidence || '',
        citations: (apiMessage?.citations || []).map((citation: Citation) => ({
          id: citation.citationId,
          _id: citation?.citationData?._id || citation.citationId,
          citationId: citation.citationId,
          content: citation?.citationData?.content || '',
          metadata: citation?.citationData?.metadata || [],
          orgId: citation?.citationData?.metadata?.orgId || '',
          citationType: citation?.citationType || '',
          createdAt: citation?.citationData?.createdAt || new Date().toISOString(),
          updatedAt: citation?.citationData?.updatedAt || new Date().toISOString(),
          chunkIndex: citation?.citationData?.chunkIndex || 1,
        })),
      };
    }

    return null;
  }, []);

  const clearStreaming = useCallback(() => {
    if (isProcessingCompletionRef.current) {
      return;
    }

    // Clear all intervals and timeouts
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }

    // Reset all refs
    accumulatedContentRef.current = '';
    accumulatedThinkingRef.current = '';
    accumulatedToolCallsRef.current = {};
    accumulatedCitationsRef.current = [];
    displayedContentRef.current = '';
    pendingChunksRef.current = [];
    pendingThinkingChunksRef.current = [];
    isStreamingActiveRef.current = false;
    completionDataRef.current = null;
    isCompletionPendingRef.current = false;
    finalMessageIdRef.current = null;
    isProcessingCompletionRef.current = false;

    // Only clear streaming state if it's still active
    setStreamingState((prev) => {
      if (prev.isActive) {
        return {
          messageId: null,
          content: '',
          citations: [],
          thinking: '',
          toolCalls: [],
          webSources: [],
          isActive: false,
        };
      }
      return prev;
    });
  }, []);

  const finalizeStreamingWithCompletion = useCallback(
    (messageId: string, completionData: any) => {
      // Mark that we're processing completion
      isProcessingCompletionRef.current = true;

      if (completionData?.conversation) {
        const finalBotMessage = completionData.conversation.messages
          .filter((msg: any) => msg.messageType === 'bot_response')
          .pop();

        if (finalBotMessage) {
          const formattedFinalMessage = formatMessage(finalBotMessage);
          if (formattedFinalMessage) {
            // Store the final message ID for reference
            finalMessageIdRef.current = finalBotMessage._id;

            // Apply the final message content with all proper formatting and citations
            // Use accumulated citations if available, otherwise fall back to formatted message citations
            const finalCitations =
              accumulatedCitationsRef.current.length > 0
                ? accumulatedCitationsRef.current
                : formattedFinalMessage.citations || [];

            // Use accumulated tool calls if final message doesn't have them (fixes "tool calls gone" issue)
            const finalToolCalls =
              formattedFinalMessage.toolCalls && formattedFinalMessage.toolCalls.length > 0
                ? formattedFinalMessage.toolCalls
                : Object.values(accumulatedToolCallsRef.current);

            // Use accumulated thinking if final message doesn't have it
            const finalThinking = formattedFinalMessage.thinking || accumulatedThinkingRef.current;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? {
                      ...formattedFinalMessage,
                      id: finalBotMessage._id,
                      content: formattedFinalMessage.content,
                      citations: finalCitations,
                      reason: completionData?.reason || msg.reason,
                      thinking: finalThinking,
                      toolCalls: finalToolCalls,
                      webSources: formattedFinalMessage.webSources,
                      workflowSteps: timelineEventsRef.current, // Use Ref to get latest steps
                    }
                  : msg
              )
            );

            // Update streaming state to show completion
            setStreamingState((prev) => ({
              ...prev,
              messageId: finalBotMessage._id,
              content: formattedFinalMessage.content,
              citations: finalCitations,
              thinking: formattedFinalMessage.thinking || prev.thinking,
              toolCalls: formattedFinalMessage.toolCalls || prev.toolCalls,
              webSources: formattedFinalMessage.webSources || prev.webSources,
              isActive: false,
            }));
          }
        }
      }

      // Clean up after completion
      setTimeout(() => {
        isCompletionPendingRef.current = false;
        completionDataRef.current = null;
        isProcessingCompletionRef.current = false;

        // Now safe to clear streaming
        setTimeout(() => {
          clearStreaming();
        }, 100);
      }, 100);
    },
    [formatMessage, clearStreaming]
  );

  const processChunkQueue = useCallback(
    (messageId: string, citations: CustomCitation[]) => {
      if (!isStreamingActiveRef.current && !isCompletionPendingRef.current) {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        return;
      }

      // If no more chunks to process
      if (pendingChunksRef.current.length === 0) {
        // If completion is pending, finalize now
        if (isCompletionPendingRef.current && completionDataRef.current) {
          if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }

          // Apply final message
          setTimeout(() => {
            finalizeStreamingWithCompletion(messageId, completionDataRef.current);
          }, COMPLETION_DELAY);

          return;
        }

        // No completion pending, just stop the interval
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        return;
      }

      // Process the next chunk
      const nextChunk = pendingChunksRef.current.shift();
      if (nextChunk) {
        displayedContentRef.current += nextChunk;

        // Update the streaming state
        setStreamingState((prev) => ({
          ...prev,
          messageId,
          content: displayedContentRef.current,
          citations,
          isActive: true,
        }));

        // Update the messages array
        setMessages((prevMessages) => {
          const messageIndex = prevMessages.findIndex((msg) => msg.id === messageId);
          if (messageIndex === -1) return prevMessages;

          const updatedMessages = [...prevMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: displayedContentRef.current,
            citations,
            updatedAt: new Date(),
          };
          return updatedMessages;
        });
      }
    },
    [finalizeStreamingWithCompletion]
  );

  const startChunkStreaming = useCallback(
    (messageId: string, citations: CustomCitation[]) => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }

      streamingIntervalRef.current = setInterval(() => {
        processChunkQueue(messageId, citations);
      }, TYPING_SPEED);
    },
    [processChunkQueue]
  );

  const updateStreamingContent = useCallback(
    (messageId: string, newChunk: string, citations: CustomCitation[] = []) => {
      if (!isStreamingActiveRef.current) {
        // Start new streaming session
        accumulatedContentRef.current = '';
        accumulatedCitationsRef.current = [];
        displayedContentRef.current = '';
        pendingChunksRef.current = [];
        isStreamingActiveRef.current = true;
        completionDataRef.current = null;
        isCompletionPendingRef.current = false;
        finalMessageIdRef.current = null;
        isProcessingCompletionRef.current = false;
      }

      if (newChunk && newChunk.trim()) {
        const cleanedChunk = newChunk
          .replace(/\\n/g, '\n')
          .replace(/\*\*(\d+)\*\*/g, '[$1]')
          .replace(/\*\*([^*]+)\*\*/g, '**$1**');

        pendingChunksRef.current.push(cleanedChunk);
      }

      // Accumulate citations
      if (citations && citations.length > 0) {
        const newCitationIds = new Set(accumulatedCitationsRef.current.map((c) => c.id));
        citations.forEach((c) => {
          if (!newCitationIds.has(c.id)) {
            accumulatedCitationsRef.current.push(c);
          }
        });
      }

      if (!streamingIntervalRef.current) {
        startChunkStreaming(messageId, accumulatedCitationsRef.current);
      }
    },
    [startChunkStreaming]
  );

  const updateStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setShowStatus(true);
  }, []);

  const streamingContextValue: StreamingContextType = useMemo(
    () => ({
      streamingState,
      updateStreamingContent,
      clearStreaming,
    }),
    [streamingState, updateStreamingContent, clearStreaming]
  );

  const updateConversationTitle = useCallback(
    (title: string, convId?: string): void => {
      const conversationIdToUpdate = convId || currentConversationIdRef.current;
      if (!conversationIdToUpdate || !title?.trim()) return;

      setSelectedChat((prev) =>
        prev && prev._id === conversationIdToUpdate ? { ...prev, title } : prev
      );
      setShouldRefreshSidebar(true);
    },
    [setSelectedChat, setShouldRefreshSidebar]
  );

  const parseSSELine = (line: string): { event?: string; data?: any } | null => {
    if (line.startsWith('event: ')) {
      return { event: line.substring(7).trim() };
    }
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.substring(6).trim());
        return { data };
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const createStreamingController = (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): StreamingController => ({
    abort: () => {
      reader.cancel().catch(console.error);
    },
  });

  const createStreamingMessage = useCallback((messageId: string) => {
    const streamingMessage: FormattedMessage = {
      type: 'bot',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      id: messageId,
      contentFormat: 'MARKDOWN',
      followUpQuestions: [],
      citations: [],
      confidence: '',
      messageType: 'bot_response',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, streamingMessage]);
  }, []);

  const appendTimelineEvent = useCallback((eventName: string, payload: any) => {
    if (!payload) return;
    setTimelineEvents((prev) => {
      const timestamp =
        typeof payload?.timestamp === 'string' ? payload.timestamp : new Date().toISOString();
      const stepValue = payload?.step || payload?.status || eventName;
      const normalizedStep = typeof stepValue === 'string' ? stepValue : eventName;
      let resolvedMessage =
        payload?.message ||
        payload?.summary ||
        payload?.reason ||
        payload?.error ||
        (payload?.query ? `Query: ${payload.query}` : undefined);

      if (!resolvedMessage && normalizedStep) {
        resolvedMessage = formatStepLabel(normalizedStep);
      }

      if (eventName === 'thinking_chunk' || eventName === 'thinking_complete') {
        const existingIndex = prev.findIndex(
          (evt) => evt.event === 'thinking_chunk' || evt.event === 'thinking_complete'
        );
        const thinkingMessage =
          eventName === 'thinking_complete'
            ? payload?.thinking || resolvedMessage || 'Reasoning complete.'
            : payload?.chunk || resolvedMessage || 'Thinking...';

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            event: eventName,
            step: normalizedStep,
            message: thinkingMessage,
            timestamp,
            details: payload,
          };
          return updated;
        }

        const thinkingEvent: TimelineEvent = {
          id: `${timestamp}-${eventName}`,
          event: eventName,
          step: normalizedStep,
          message: thinkingMessage,
          timestamp,
          details: payload,
        };
        return [...prev, thinkingEvent].slice(-MAX_TIMELINE_EVENTS);
      }

      const eventId = `${timestamp}-${eventName}-${Math.random().toString(36).slice(2, 7)}`;
      const nextEvent: TimelineEvent = {
        id: eventId,
        event: eventName,
        step: normalizedStep,
        message: resolvedMessage,
        timestamp,
        details: payload,
      };
      return [...prev, nextEvent].slice(-MAX_TIMELINE_EVENTS);
    });
  }, []);

  const handleStreamingEvent = useCallback(
    async (
      event: string,
      data: any,
      context: {
        streamingBotMessageId: string;
        isNewConversation: boolean;
        hasCreatedMessage: boolean;
        onConversationComplete: (conversation: Conversation) => void;
        onMessageCreated: () => void;
        onErrorReceived: () => void;
      }
    ): Promise<boolean> => {
      // console.log('🔄 Streaming Event:', { event, data, context });

      const statusMsg = getEngagingStatusMessage(event, data);

      if (statusMsg) {
        // console.log('📊 Status Message:', statusMsg);
        updateStatus(statusMsg);
      }

      // Normalize alternate event names to current handler semantics
      if (event === 'token' && data?.content) {
        event = 'answer_chunk';
        data = { chunk: data.content, citations: data.citations || [] };
      } else if (event === 'end') {
        event = 'complete';
      } else if (event === 'message' && typeof data?.content === 'string') {
        // Treat final message as completion with content
        event = 'complete';
      }

      if (TRACKED_EVENTS.has(event) && data) {
        appendTimelineEvent(event, data);
      }

      // Always set streaming to active for any relevant event to ensure UI updates immediately
      // (fixes "first nothing, then all at once" issue)
      if (['status', 'tool_call', 'thinking_chunk'].includes(event) && !streamingState.isActive) {
        setStreamingState((prev) => ({
          ...prev,
          isActive: true,
          messageId: context.streamingBotMessageId,
        }));
      }

      switch (event) {
        case 'meta': {
          try {
            setKnowledgeUsed(Boolean(data?.knowledgeUsed));
          } catch {
            // noop
          }
          return false;
        }
        case 'tool': {
          const toolData = data.tool || data;
          const toolId = toolData.id;
          if (toolId) {
            accumulatedToolCallsRef.current[toolId] = {
              ...accumulatedToolCallsRef.current[toolId],
              ...toolData,
              status: toolData.status || 'running',
            };
            const toolCalls = Object.values(accumulatedToolCallsRef.current) as NonNullable<
              FormattedMessage['toolCalls']
            >;

            setStreamingState((prev) => ({
              ...prev,
              toolCalls,
            }));

            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex(
                (msg) => msg.id === context.streamingBotMessageId
              );
              if (messageIndex === -1) return prevMessages;
              const updated = [...prevMessages];
              updated[messageIndex] = {
                ...updated[messageIndex],
                toolCalls,
              };
              return updated;
            });
          }
          return false;
        }
        case 'tool_result': {
          const resultData = data;
          const toolId = resultData.id;
          if (toolId) {
            accumulatedToolCallsRef.current[toolId] = {
              ...accumulatedToolCallsRef.current[toolId],
              result: resultData.result,
              status: 'completed',
            };
            const toolCalls = Object.values(accumulatedToolCallsRef.current) as NonNullable<
              FormattedMessage['toolCalls']
            >;

            setStreamingState((prev) => ({
              ...prev,
              toolCalls,
            }));

            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex(
                (msg) => msg.id === context.streamingBotMessageId
              );
              if (messageIndex === -1) return prevMessages;
              const updated = [...prevMessages];
              updated[messageIndex] = {
                ...updated[messageIndex],
                toolCalls,
              };
              return updated;
            });
          }
          return false;
        }
        case 'web_sources':
        case 'web_results': {
          if (Array.isArray(data?.sources)) {
            const sources = data.sources as WebSourceSummary[];
            setWebSources(sources);

            setStreamingState((prev) => ({
              ...prev,
              webSources: sources,
            }));

            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex(
                (msg) => msg.id === context.streamingBotMessageId
              );
              if (messageIndex === -1) return prevMessages;
              const updated = [...prevMessages];
              updated[messageIndex] = {
                ...updated[messageIndex],
                webSources: sources,
              };
              return updated;
            });
          }
          return false;
        }
        case 'answer_chunk':
          // console.log('📝 Answer Chunk:', { chunk: data.chunk, citations: data.citations });
          if (data.chunk) {
            if (!context.hasCreatedMessage) {
              createStreamingMessage(context.streamingBotMessageId);
              context.onMessageCreated();
            }

            setShowStatus(false);
            setStatusMessage('');

            updateStreamingContent(context.streamingBotMessageId, data.chunk, data.citations || []);
          }
          return false;

        case 'thinking_chunk':
        case 'reasoning_chunk':
          if (data.chunk) {
            accumulatedThinkingRef.current += data.chunk;

            setStreamingState((prev) => ({
              ...prev,
              thinking: accumulatedThinkingRef.current,
            }));

            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex(
                (msg) => msg.id === context.streamingBotMessageId
              );
              if (messageIndex === -1) return prevMessages;
              const updated = [...prevMessages];
              updated[messageIndex] = {
                ...updated[messageIndex],
                thinking: accumulatedThinkingRef.current,
              };
              return updated;
            });
          }
          // ignore reasoning stream per request
          return false;

        case 'title_generated': {
          const generatedTitle: string | undefined = data?.title || data?.generatedTitle;
          const conversationIdFromEvent: string | undefined = data?.conversationId || data?.chatId;
          if (generatedTitle && generatedTitle.trim() && conversationIdFromEvent) {
            pendingGeneratedTitleRef.current[conversationIdFromEvent] = generatedTitle.trim();
            updateConversationTitle(generatedTitle.trim(), conversationIdFromEvent);
            if (currentConversationIdRef.current === conversationIdFromEvent) {
              delete pendingGeneratedTitleRef.current[conversationIdFromEvent];
            }
          }
          return false;
        }

        case 'complete':
          setShowStatus(false);
          setStatusMessage('');

          // Store completion data and mark as pending
          completionDataRef.current = data;
          isCompletionPendingRef.current = true;

          // Mark that we're processing completion to prevent clearing
          isProcessingCompletionRef.current = true;

          // If conversation is missing, fetch it
          // It makes sure that the conversation is set to the latest conversation
          if (context.isNewConversation && data.conversation && data.conversation._id) {
            setCurrentConversationId(data.conversation._id);
            currentConversationIdRef.current = data.conversation._id;

            setSelectedChat(data.conversation);
            if (typeof window !== 'undefined') {
              const projectMatch = window.location.pathname.match(/\/projects\/(\w{24})/);
              const pid = projectMatch?.[1];
              const targetPath = pid
                ? `/projects/${pid}/${data.conversation._id}`
                : `/${data.conversation._id}`;
              if (window.location.pathname !== targetPath) {
                // Use replace to avoid adding to history stack and make it feel smoother
                suppressNextRouteLoadRef.current = true;
                navigate(targetPath, { replace: true });
              }
            } else {
              suppressNextRouteLoadRef.current = true;
              navigate(`/${data.conversation._id}`, { replace: true });
            }

            // If we received a pending generated title earlier, apply it now that we have the id
            const pendingTitle = pendingGeneratedTitleRef.current[data.conversation._id];
            if (pendingTitle) {
              updateConversationTitle(pendingTitle, data.conversation._id);
              delete pendingGeneratedTitleRef.current[data.conversation._id];
            }
          }

          // If there are no pending chunks, finalize immediately
          if (pendingChunksRef.current.length === 0) {
            setTimeout(() => {
              finalizeStreamingWithCompletion(context.streamingBotMessageId, data);
              if (data.conversation) {
                context.onConversationComplete(data.conversation);
              }
            }, COMPLETION_DELAY);
          }

          return false;

        case 'memory_suggestion': {
          try {
            const suggestionText: string | undefined = data?.text;
            const projectId: string | undefined =
              typeof window !== 'undefined'
                ? window.location.pathname.match(/\/projects\/(\w{24})/)?.[1]
                : undefined;
            if (suggestionText && projectId) {
              showMemorySuggestionToast({
                initialText: suggestionText,
                onSave: async (finalText: string) => {
                  await axios.post(`/api/v1/projects/${projectId}/memories`, {
                    text: finalText,
                    sourceConversationId: currentConversationIdRef.current || undefined,
                    approved: true,
                  });
                },
                durationMs: 20000,
              });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error handling memory_suggestion event', err);
          }
          return false;
        }

        case 'error': {
          setShowStatus(false);
          setStatusMessage('');

          // Stop streaming on error
          isStreamingActiveRef.current = false;
          isProcessingCompletionRef.current = false;

          // If we already have meaningful streamed content, finalize using it instead of
          // replacing with a generic error. This avoids losing generated images/text
          // when the backend doesn't emit a final "complete" event.
          const currentStreamContent = (
            displayedContentRef.current ||
            streamingState.content ||
            ''
          ).trim();
          const currentCitations = streamingState.citations || [];
          const hasMeaningfulContent = currentStreamContent.length > 0;

          if (hasMeaningfulContent && context.hasCreatedMessage) {
            // Preserve streamed content in the existing message
            setMessages((prevMessages) => {
              const idx = prevMessages.findIndex((m) => m.id === context.streamingBotMessageId);
              if (idx === -1) return prevMessages;
              const updated = [...prevMessages];
              updated[idx] = {
                ...updated[idx],
                content: currentStreamContent,
                citations: currentCitations,
                messageType: 'bot_response',
                updatedAt: new Date(),
              } as FormattedMessage;
              return updated;
            });
            // Clear timers/refs after preserving the content
            clearStreaming();
            context.onErrorReceived();
            return true;
          }

          // Otherwise, show the error as a message
          clearStreaming();

          const errorMessage = data.message || data.error || 'An error occurred';
          if (!context.hasCreatedMessage) {
            const errorMsg: FormattedMessage = {
              type: 'bot',
              content: errorMessage,
              createdAt: new Date(),
              updatedAt: new Date(),
              id: context.streamingBotMessageId,
              contentFormat: 'MARKDOWN',
              followUpQuestions: [],
              citations: [],
              confidence: '',
              messageType: 'error',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            context.onMessageCreated();
          } else {
            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex(
                (msg) => msg.id === context.streamingBotMessageId
              );
              if (messageIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[messageIndex] = {
                  ...updatedMessages[messageIndex],
                  content: errorMessage,
                  messageType: 'error',
                  updatedAt: new Date(),
                };
                return updatedMessages;
              }
              return prevMessages;
            });
          }
          context.onErrorReceived();
          return true;
        }

        default:
          return false;
      }
    },
    [
      createStreamingMessage,
      updateStreamingContent,
      updateStatus,
      clearStreaming,
      finalizeStreamingWithCompletion,
      navigate,
      updateConversationTitle,
      streamingState,
      setWebSources,
      appendTimelineEvent,
    ]
  );

  const handleStreamingComplete = useCallback(
    async (
      conversation: Conversation,
      isNewConversation: boolean,
      streamingBotMessageId: string
    ): Promise<void> => {
      if (isNewConversation) {
        setSelectedChat(conversation);
        setCurrentConversationId(conversation._id);
        currentConversationIdRef.current = conversation._id;
        setShouldRefreshSidebar(true);

        // As a safety, if a generated title was received but not yet saved, save it now
        const pendingTitle = pendingGeneratedTitleRef.current[conversation._id];
        if (pendingTitle) {
          updateConversationTitle(pendingTitle, conversation._id);
          delete pendingGeneratedTitleRef.current[conversation._id];
        }
      }
    },
    [updateConversationTitle]
  );

  const handleStreamingResponse = useCallback(
    async (url: string, body: any, isNewConversation: boolean): Promise<void> => {
      const streamingBotMessageId = `streaming-${Date.now()}`;

      accumulatedContentRef.current = '';
      accumulatedCitationsRef.current = [];

      const streamState = {
        finalConversation: null as Conversation | null,
        hasCreatedMessage: false,
        hasReceivedError: false,
      };

      const callbacks = {
        onConversationComplete: (conversation: Conversation) => {
          streamState.finalConversation = conversation;
        },
        onMessageCreated: () => {
          streamState.hasCreatedMessage = true;
        },
        onErrorReceived: () => {
          streamState.hasReceivedError = true;
        },
      };

      try {
        const token = localStorage.getItem('jwt_access_token');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        // console.log('📡 Response status:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const controller = createStreamingController(reader);
        setStreamingController(controller);
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        const processLine = async (line: string): Promise<void> => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          const parsed = parseSSELine(trimmedLine);
          if (!parsed) return;

          if (parsed.event) {
            currentEvent = parsed.event;
          } else if (parsed.data && currentEvent) {
            const errorReceived = await handleStreamingEvent(currentEvent, parsed.data, {
              streamingBotMessageId,
              isNewConversation,
              hasCreatedMessage: streamState.hasCreatedMessage,
              onConversationComplete: callbacks.onConversationComplete,
              onMessageCreated: callbacks.onMessageCreated,
              onErrorReceived: callbacks.onErrorReceived,
            });

            if (errorReceived) {
              streamState.hasReceivedError = true;
            }
          }
        };

        const readNextChunk = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done) return;

          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          await Promise.all(lines.map(processLine));
          await readNextChunk();
        };

        await readNextChunk();

        if (streamState.finalConversation && !streamState.hasReceivedError) {
          await handleStreamingComplete(
            streamState.finalConversation,
            isNewConversation,
            streamingBotMessageId
          );
        }
      } catch (error) {
        console.error('❌ Streaming connection error:', error);
        setShowStatus(false);
        clearStreaming();
        // Reset accumulated content on error
        accumulatedContentRef.current = '';
        accumulatedCitationsRef.current = [];
      } finally {
        setStreamingController(null);
      }
    },
    [handleStreamingEvent, handleStreamingComplete, clearStreaming]
  );

  const resetViewerStates = () => {
    setTransitioning(true);
    setIsViewerReady(false);
    setPdfUrl(null);
    setFileBuffer(null);
    setHighlightedCitation(null);
    setIsImage(false);
    // Delay clearing other states to ensure clean unmount
    setTimeout(() => {
      setOpenPdfView(false);
      setIsExcel(false);
      setAggregatedCitations(null);
      setTransitioning(false);
      setFileBuffer(null);
    }, 100);
  };

  const handleLargePPTFile = (record: any) => {
    if (record.sizeInBytes / 1048576 > 5) {
      console.log('PPT with large file size');
      throw new Error('Large fize size, redirecting to web page ');
    }
  };

  const onViewPdf = async (
    url: string,
    citation: CustomCitation,
    citations: CustomCitation[],
    isExcelFile: boolean = false,
    bufferData?: ArrayBuffer
  ): Promise<void> => {
    const citationMeta = citation.metadata;
    setTransitioning(true);
    setIsViewerReady(false);
    setDrawerOpen(false);
    setOpenPdfView(true);
    setAggregatedCitations(citations);
    setFileBuffer(null);
    setPdfUrl(null);
    setHighlightedCitation(citation || null);
    try {
      const recordId = citationMeta?.recordId;
      const { record } = await KnowledgeBaseAPI.getRecordDetails(recordId);
      const { externalRecordId } = record;
      const fileName = record.recordName;
      if (record.origin === ORIGIN.UPLOAD) {
        try {
          const downloadResponse = await axios.get(
            `/api/v1/document/${externalRecordId}/download`,
            { responseType: 'blob' }
          );

          // Read the blob response as text to check if it's JSON with signedUrl
          const reader = new FileReader();
          const textPromise = new Promise<string>((resolve) => {
            reader.onload = () => {
              resolve(reader.result?.toString() || '');
            };
          });

          reader.readAsText(downloadResponse.data);
          const text = await textPromise;

          let filename = fileName || `document-${externalRecordId}`;
          const contentDisposition = downloadResponse.headers['content-disposition'];
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          }

          try {
            // Try to parse as JSON to check for signedUrl property
            const jsonData = JSON.parse(text);
            console.log('🔍 onViewPdf - JSON data:', jsonData);
            if (jsonData && jsonData.signedUrl) {
              setPdfUrl(jsonData.signedUrl);
            }
          } catch (e) {
            // Case 2: Local storage - Return buffer
            const bufferReader = new FileReader();
            const arrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
              bufferReader.onload = () => {
                const result = bufferReader.result as ArrayBuffer;
                console.log('🔍 onViewPdf - FileReader loaded buffer, size:', result.byteLength);
                resolve(result);
              };
              bufferReader.readAsArrayBuffer(downloadResponse.data);
            });

            const buffer = await arrayBufferPromise;
            setFileBuffer(buffer);

            // if (['pptx', 'ppt'].includes(citationMeta?.extension)) {

            // }
          }
        } catch (error) {
          console.error('Error downloading document:', error);
          toast.info('Failed to load preview. Redirecting to the original document shortly...');
          let webUrl = record.fileRecord?.webUrl || record.mailRecord?.webUrl;

          // Keep the URL fix logic (though less likely needed for non-UPLOAD here, better safe)
          if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            webUrl = baseUrl + webUrl;
          }

          console.log(`Attempting to redirect to webUrl: ${webUrl}`);

          setTimeout(() => {
            onClosePdf();
          }, 500);

          setTimeout(() => {
            if (webUrl) {
              try {
                window.open(webUrl, '_blank', 'noopener,noreferrer');
                console.log('Opened document in new tab');
              } catch (openError) {
                console.error('Error opening new tab:', openError);
                toast.error(
                  'Failed to automatically open the document. Please check your browser pop-up settings.'
                );
              }
            } else {
              console.error('Cannot redirect: No webUrl found for the record.');

              toast.error('Failed to load preview and cannot redirect (document URL not found).');
            }
          }, 2500);
          return;
        }
      } else if (record.origin === ORIGIN.CONNECTOR) {
        try {
          let params = {};
          if (['pptx', 'ppt'].includes(citationMeta?.extension)) {
            params = {
              convertTo: 'pdf',
            };
            handleLargePPTFile(record);
          }

          const publicConnectorUrlResponse = await getConnectorPublicUrl();
          let connectorResponse;
          if (publicConnectorUrlResponse && publicConnectorUrlResponse.url) {
            const CONNECTOR_URL = publicConnectorUrlResponse.url;
            connectorResponse = await axios.get(
              `${CONNECTOR_URL}/api/v1/stream/record/${recordId}`,
              {
                responseType: 'blob',
                params,
              }
            );
          } else {
            connectorResponse = await axios.get(
              `${CONFIG.backendUrl}/api/v1/knowledgeBase/stream/record/${recordId}`,
              {
                responseType: 'blob',
                params,
              }
            );
          }
          if (!connectorResponse) return;
          // Extract filename from content-disposition header
          let filename = record.recordName || `document-${recordId}`;
          const contentDisposition = connectorResponse.headers['content-disposition'];
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          }

          // Convert blob directly to ArrayBuffer
          const bufferReader = new FileReader();
          const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
            bufferReader.onload = () => {
              // Create a copy of the buffer to prevent detachment issues
              const originalBuffer = bufferReader.result as ArrayBuffer;
              const bufferCopy = originalBuffer.slice(0);
              resolve(bufferCopy);
            };
            bufferReader.onerror = () => {
              reject(new Error('Failed to read blob as array buffer'));
            };
            bufferReader.readAsArrayBuffer(connectorResponse.data);
          });

          const buffer = await arrayBufferPromise;
          console.log(
            '🔍 onViewPdf - Connector case: Setting file buffer, size:',
            buffer.byteLength
          );
          setFileBuffer(buffer);
        } catch (err) {
          console.error('Error downloading document:', err);
          toast.info('Failed to load preview. Redirecting to the original document shortly...');
          let webUrl = record.fileRecord?.webUrl || record.mailRecord?.webUrl;

          // Keep the URL fix logic (though less likely needed for non-UPLOAD here, better safe)
          if (record.origin === 'UPLOAD' && webUrl && !webUrl.startsWith('http')) {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            webUrl = baseUrl + webUrl;
          }

          console.log(`Attempting to redirect to webUrl: ${webUrl}`);

          setTimeout(() => {
            onClosePdf();
          }, 500);

          setTimeout(() => {
            if (webUrl) {
              try {
                window.open(webUrl, '_blank', 'noopener,noreferrer');
                console.log('Opened document in new tab');
              } catch (openError) {
                console.error('Error opening new tab:', openError);
                toast.error(
                  'Failed to automatically open the document. Please check your browser pop-up settings.'
                );
              }
            } else {
              console.error('Cannot redirect: No webUrl found for the record.');
              toast.error('Failed to load preview and cannot redirect (document URL not found).');
            }
          }, 2500);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch document:', err);
      // setSnackbar({
      //   open: true,
      //   message: err.message.includes('fetch failed') ? 'Failed to fetch document' : err.message,
      //   severity: 'error',
      // });
      setTimeout(() => {
        onClosePdf();
      }, 500);
      return;
    }
    setTransitioning(true);
    setDrawerOpen(false);
    setOpenPdfView(true);
    const isExcelOrCSV = ['csv', 'xlsx', 'xls'].includes(citationMeta?.extension);
    setIsDocx(['docx'].includes(citationMeta?.extension));
    setIsMarkdown(['md'].includes(citationMeta?.extension));
    setIsHtml(['html'].includes(citationMeta?.extension));
    setIsTextFile(['txt'].includes(citationMeta?.extension));
    setIsExcel(isExcelOrCSV);
    setIsImage(['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(citationMeta?.extension));
    setIsPdf(['pptx', 'ppt', 'pdf'].includes(citationMeta?.extension));

    // Allow component to mount
    setTimeout(() => {
      // Use a callback to get the latest state values
      setTransitioning(false);
      setIsViewerReady(true);
      console.log('🔍 onViewPdf - Viewer ready set to true');
    }, 100);
  };

  const onClosePdf = (): void => {
    // setOpenPdfView(false);
    // setIsExcel(false);
    // setShowQuestionDetails(false);

    // setTimeout(() => {
    //   setPdfUrl(null);
    //   setAggregatedCitations([]);
    // }, 50); // Match this with your transition duration
    resetViewerStates();
    setFileBuffer(null);
    setHighlightedCitation(null);
  };

  // Also update the toggleCitations function to handle citation state more explicitly
  const toggleCitations = useCallback((index: number): void => {
    setExpandedCitations((prev: Record<number, boolean>) => {
      const newState = { ...prev };
      newState[index] = !prev[index];
      return newState;
    });
  }, []);

  const handleSendMessage = useCallback(
    async (
      message: string,
      modelType: string,
      _attachedFiles?: any[],
      _modelKey?: string,
      _modelName?: string,
      _chatMode?: string,
      useReasoning?: boolean,
      useWebSearch?: boolean,
      contextRefs?: { type: 'kb' | 'project' | 'record' | 'app'; id: string; label: string }[],
      filters?: { apps: string[]; kb: string[] },
      agentId?: string
    ) => {
      // console.log('currentConversationId before sending:', currentConversationId);
      if (!message.trim()) {
        console.warn('Attempted to send an empty message.');
        return;
      }
      if (streamingController) {
        streamingController.abort();
      }

      // Save timeline events to the last bot message before clearing
      if (timelineEvents.length > 0 && messages.length > 0) {
        const lastBotMessageIndex = messages.findIndex(
          (msg, idx) => msg.type === 'bot' && idx === messages.length - 1
        );
        if (lastBotMessageIndex !== -1) {
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === lastBotMessageIndex ? { ...msg, workflowSteps: timelineEvents } : msg
            )
          );
        }
      }

      setTimelineEvents([]);

      const wasCreatingNewConversation = !currentConversationId;

      const tempUserMessage: FormattedMessage = {
        type: 'user',
        content: message,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: `temp-user-${Date.now()}`,
        citations: [],
        followUpQuestions: [],
        timestamp: new Date(),
        contentFormat: 'MARKDOWN',
      };
      if (showWelcome) {
        setShowWelcome(false);
      }
      setInputValue('');
      setMessages((prev) => [...prev, tempUserMessage]);
      setWebSources([]);

      const normalizedMode = (() => {
        switch (modelType) {
          case 'science':
            return 'knowledge';
          case 'search':
            return 'deepResearch';
          default:
            return modelType || 'chat';
        }
      })() as StreamingMode;
      const allowKnowledgeContext = normalizedMode !== 'chat' && normalizedMode !== 'image';
      const derivedWebSearchEnabled = normalizedMode === 'deepResearch' ? true : !!useWebSearch;

      const filterApps = new Set<string>();
      const filterKb = new Set<string>();
      const recordIdSet = new Set<string>();
      let projectIdFromContext: string | undefined;

      if (allowKnowledgeContext && Array.isArray(contextRefs)) {
        contextRefs.forEach((ref) => {
          if (ref.type === 'app') filterApps.add(ref.id);
          if (ref.type === 'kb') filterKb.add(ref.id);
          if (ref.type === 'record') recordIdSet.add(ref.id);
          if (ref.type === 'project') projectIdFromContext = ref.id;
        });
      }

      if (allowKnowledgeContext && filters?.apps) {
        filters.apps.forEach((id) => filterApps.add(id));
      }
      if (allowKnowledgeContext && filters?.kb) {
        filters.kb.forEach((id) => filterKb.add(id));
      }

      const resolveProjectId = (): string | undefined => {
        if (projectIdFromContext) return projectIdFromContext;
        if (typeof window === 'undefined' || typeof window.location?.pathname !== 'string') {
          return undefined;
        }
        const match = window.location.pathname.match(/\/projects\/(\w{24})/);
        if (match?.[1]) {
          return match[1];
        }
        try {
          return localStorage.getItem('currentProjectId') || undefined;
        } catch {
          return undefined;
        }
      };

      const attachmentsPayload =
        Array.isArray(_attachedFiles) && _attachedFiles.length > 0
          ? _attachedFiles.map((file: any) => ({
              name: file.filename,
              type: file.fileType,
              content: file.markdownContent,
              processingTimeMs: file.processingTimeMs,
            }))
          : undefined;

      const filtersPayload: { apps?: string[]; kb?: string[] } = {};
      if (filterApps.size > 0) {
        filtersPayload.apps = Array.from(filterApps);
      }
      if (filterKb.size > 0) {
        filtersPayload.kb = Array.from(filterKb);
      }

      const contextPayload: { recordIds?: string[]; projectId?: string } = {};
      if (recordIdSet.size > 0) {
        contextPayload.recordIds = Array.from(recordIdSet);
      }
      const resolvedProjectId = resolveProjectId();
      if (resolvedProjectId) {
        contextPayload.projectId = resolvedProjectId;
      }

      const normalizedModelKey =
        typeof _modelKey === 'string' && _modelKey.trim().length > 0 ? _modelKey.trim() : undefined;
      const normalizedModelName =
        typeof _modelName === 'string' && _modelName.trim().length > 0
          ? _modelName.trim()
          : undefined;

      const modelPayload =
        normalizedModelKey || normalizedModelName
          ? {
              ...(normalizedModelKey ? { key: normalizedModelKey } : {}),
              ...(normalizedModelName ? { name: normalizedModelName } : {}),
            }
          : undefined;

      const requestPayload: Record<string, any> = {
        conversationId: currentConversationId || undefined,
        message,
        chatMode: _chatMode || undefined,
        model: modelPayload,
        reasoningEnabled: !!useReasoning,
        webSearchEnabled: derivedWebSearchEnabled,
        filters: Object.keys(filtersPayload).length > 0 ? filtersPayload : undefined,
        context: Object.keys(contextPayload).length > 0 ? contextPayload : undefined,
        attachments: attachmentsPayload,
        agentId: normalizedMode === 'agent' ? agentId : undefined,
      };

      if (!requestPayload.attachments) {
        delete requestPayload.attachments;
      }
      if (!requestPayload.filters) {
        delete requestPayload.filters;
      }
      if (!requestPayload.context) {
        delete requestPayload.context;
      }
      if (!requestPayload.chatMode) {
        delete requestPayload.chatMode;
      }
      if (!requestPayload.model) {
        delete requestPayload.model;
      }
      if (!agentId) {
        delete requestPayload.agentId;
      }

      // Persist reasoning flag per conversation (or 'new')
      try {
        const convKey = currentConversationId || 'new';
        localStorage.setItem(`reasoning:${convKey}`, JSON.stringify(!!useReasoning));
      } catch {
        /* noop */
      }

      // Forward project systemPrompt inline only when creating a new conversation. For existing
      // conversations, backend infers project from conversation and fetches the prompt.
      try {
        if (!currentConversationId && typeof window !== 'undefined') {
          const sysPromptEl = document.getElementById(
            'project-system-prompt'
          ) as HTMLTextAreaElement | null;
          const promptValue = sysPromptEl?.value?.trim();
          if (promptValue) {
            requestPayload.systemPrompt = promptValue;
          }
        }
      } catch {
        /* noop */
      }

      const streamingPath = STREAMING_ENDPOINTS[normalizedMode] ?? STREAMING_ENDPOINTS.chat;
      const streamingUrl = `${CONFIG.backendUrl}${streamingPath}`;
      await handleStreamingResponse(streamingUrl, requestPayload, wasCreatingNewConversation);
    },
    [
      currentConversationId,
      showWelcome,
      streamingController,
      handleStreamingResponse,
      messages,
      timelineEvents,
    ]
  );

  const handleNewChat = useCallback(() => {
    if (streamingController) {
      streamingController.abort();
    }

    // Force clear streaming even if completion is processing (user wants new chat)
    isProcessingCompletionRef.current = false;
    clearStreaming();
    setTimelineEvents([]);

    currentConversationIdRef.current = null;
    setCurrentConversationId(null);
    // Stay within project context if present; otherwise go to root
    try {
      if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/\/projects\/(\w{24})/);
        const pid = match?.[1];
        if (pid) {
          navigate(`/projects/${pid}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      navigate('/', { replace: true });
    }
    setShowStatus(false);
    setMessages([]);
    setInputValue('');
    setShouldRefreshSidebar(true);
    console.log('shouldRefreshSidebar', shouldRefreshSidebar);
    setShowWelcome(true);
    setSelectedChat(null);
    accumulatedContentRef.current = '';
    accumulatedCitationsRef.current = [];
  }, [navigate, streamingController, clearStreaming, shouldRefreshSidebar]);

  // Update handleRegenerateMessage
  const handleRegenerateMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!currentConversationId || !messageId) return;

      try {
        setIsLoading(true);
        const response = await axios.post<{ conversation: Conversation }>(
          `/api/v1/conversations/${currentConversationId}/message/${messageId}/regenerate`,
          { instruction: 'Improve writing style and clarity' }
        );

        if (!response?.data?.conversation?.messages) {
          throw new Error('Invalid response format');
        }

        // Format all messages from response
        const allMessages = response.data.conversation.messages
          .map(formatMessage)
          .filter(Boolean) as FormattedMessage[];

        // Find the regenerated message - it should be the last bot message
        const regeneratedMessage = allMessages.filter((msg) => msg.type === 'bot').pop();

        if (!regeneratedMessage) {
          throw new Error('No regenerated message found in response');
        }

        // Update messages by replacing only the regenerated message while keeping all others
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            // Only replace the message that was regenerated
            if (msg.id === messageId) {
              return {
                ...regeneratedMessage,
                // Keep any existing metadata/state that shouldn't be changed
                createdAt: msg.createdAt, // Preserve original timestamp to maintain order
              };
            }
            return msg;
          })
        );

        // Update citation states
        setExpandedCitations((prevStates) => {
          const newStates = { ...prevStates };
          const messageIndex = messages.findIndex((msg) => msg.id === messageId);
          if (messageIndex !== -1) {
            // Safely check citations array existence and length
            const hasCitations =
              regeneratedMessage.citations && regeneratedMessage.citations.length > 0;
            // Preserve existing citation state or initialize to false
            newStates[messageIndex] = hasCitations ? prevStates[messageIndex] || false : false;
          }
          return newStates;
        });
      } catch (error) {
        // Show error in place of regenerated message while preserving others
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: 'Sorry, I encountered an error regenerating this message.',
                  error: true,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentConversationId, formatMessage, messages]
  );

  const handleChatSelect = useCallback(
    async (chat: Conversation) => {
      if (!chat?._id) return;

      try {
        setWebSources([]);
        // Critical state changes first
        setShowWelcome(false);
        setCurrentConversationId(chat._id);
        currentConversationIdRef.current = chat._id;
        // Navigate inside project scope if present
        if (typeof window !== 'undefined') {
          const projectMatch = window.location.pathname.match(/\/projects\/(\w{24})/);
          const pid = projectMatch?.[1];
          const targetPath = pid ? `/projects/${pid}/${chat._id}` : `/${chat._id}`;
          navigate(targetPath, { replace: true });
        } else {
          navigate(`/${chat._id}`, { replace: true });
        }
        setIsLoadingConversation(true);

        // Clear other states
        setActiveRequestTracker({ current: null, type: null });
        setLoadingConversations({});
        setConversationStatus({});
        setPendingResponseConversationId(null);

        // Reset UI state with slight delay
        setTimeout(() => {
          setMessages([]);
          setExpandedCitations({});
          setOpenPdfView(false);
        }, 0);

        // Get conversation details
        const response = await axios.get(`/api/v1/conversations/${chat._id}`);
        const { conversation } = response.data;
        // console.log(conversation , "🔴 coming from the resoonse")

        if (!conversation || !Array.isArray(conversation.messages)) {
          throw new Error('Invalid conversation data');
        }

        // Only proceed if we're still viewing this conversation
        if (currentConversationIdRef.current === chat._id) {
          if (conversation.status) {
            setConversationStatus((prev) => ({
              ...prev,
              [chat._id]: conversation.status,
            }));
          }

          // Set complete conversation data
          setSelectedChat(conversation);

          // Format messages and preserve full data structure
          const formattedMessages = conversation.messages
            .map(formatMessage)
            .filter(Boolean) as FormattedMessage[];

          // Initialize citation states for all bot messages with citations
          const citationStates: ExpandedCitationsState = {};
          formattedMessages.forEach((msg, idx) => {
            if (msg.type === 'bot' && msg.citations && msg.citations.length > 0) {
              citationStates[idx] = false;
            }
          });

          setMessages(formattedMessages);
          setExpandedCitations(citationStates);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        setSelectedChat(null);
        setCurrentConversationId(null);
        currentConversationIdRef.current = null;
        setMessages([]);
        setExpandedCitations({});
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [formatMessage, navigate]
  );

  const handleSidebarRefreshComplete = useCallback(() => {
    setShouldRefreshSidebar(false);
    console.log('shouldRefreshSidebar', shouldRefreshSidebar);
  }, [shouldRefreshSidebar]);

  // Handle feedback submission
  const handleFeedbackSubmit = useCallback(
    async (messageId: string, feedback: any) => {
      if (!currentConversationId || !messageId) return;

      try {
        await axios.post(
          `/api/v1/conversations/${currentConversationId}/message/${messageId}/feedback`,
          feedback
        );
      } catch (error) {
        throw new Error('Feedback submission error');
      }
    },
    [currentConversationId]
  );

  const handleInputChange = useCallback(
    (input: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      let newValue: string;
      if (typeof input === 'string') {
        newValue = input;
      } else if (
        input &&
        typeof input === 'object' &&
        'target' in input &&
        input.target &&
        'value' in input.target
      ) {
        newValue = input.target.value;
      } else {
        return;
      }
      setInputValue(newValue);
    },
    []
  );

  // const nputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  //   // Make sure you are using event.target.value directly
  //   // without any reversal logic.
  //   console.log(event);
  //   setInputValue(event.target.value);
  // };

  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      // Avoid refetching/reloading messages while a stream is active
      // or immediately after we navigated due to stream completion
      if (
        suppressNextRouteLoadRef.current ||
        isStreamingActiveRef.current ||
        isProcessingCompletionRef.current
      ) {
        suppressNextRouteLoadRef.current = false;
        return;
      }
      handleChatSelect({ _id: conversationId } as Conversation);
    }
  }, [conversationId, handleChatSelect, currentConversationId]);

  // Add this useEffect to check conversation status periodically
  useEffect(() => {
    // Disable polling while streaming to prevent abrupt message replacement
    if (isStreamingActiveRef.current || isProcessingCompletionRef.current) {
      return () => {};
    }
    let intervalId: NodeJS.Timeout | null = null;

    const checkConversationStatus = async () => {
      const inProgressConversations = Object.entries(conversationStatus)
        .filter(([_, status]) => status === 'Inprogress')
        .map(([id]) => id);

      if (inProgressConversations.length > 0) {
        const promises = inProgressConversations.map(async (convId) => {
          try {
            // Capture the current conversation ID at the start of this request
            const currentId = currentConversationIdRef.current;

            const response = await axios.get(`/api/v1/conversations/${convId}`);
            // console.log(response , currentId , "🔴")
            const { conversation } = response.data;

            if (conversation?.status) {
              setConversationStatus((prev) => ({
                ...prev,
                [convId]: conversation.status,
              }));

              // Handle when conversation becomes complete
              if (conversation.status === 'Complete') {
                // Triple check: the conversation ID must match what we captured initially,
                // what's currently in the ref, and the state
                if (
                  convId === currentId &&
                  convId === currentConversationIdRef.current &&
                  convId === currentConversationId
                ) {
                  const formattedMessages = conversation.messages
                    .map(formatMessage)
                    .filter(Boolean) as FormattedMessage[];

                  setMessages(formattedMessages);
                }
              }
            }
          } catch (error) {
            console.error(`Failed to check status for conversation ${convId}:`, error);
          }
        });

        // Wait for all checks to complete
        await Promise.all(promises);
      }
    };

    // Check every 3 seconds if there are any 'Inprogress' conversations
    if (
      Object.values(conversationStatus).includes('Inprogress') &&
      !isStreamingActiveRef.current &&
      !isProcessingCompletionRef.current
    ) {
      intervalId = setInterval(checkConversationStatus, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [conversationStatus, currentConversationId, formatMessage]);

  // useEffect(() => {
  //   if (conversationId && currentConversationId !== conversationId) {
  //     setCurrentConversationId(conversationId);
  //     currentConversationIdRef.current = conversationId;
  //   }
  // }, [conversationId, currentConversationId]);

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    isLoadingConversation,
    setIsLoadingConversation,
    expandedCitations,
    setExpandedCitations,
    isDrawerOpen,
    setDrawerOpen,
    currentConversationId,
    setCurrentConversationId,
    selectedChat,
    setSelectedChat,
    shouldRefreshSidebar,
    setShouldRefreshSidebar,
    navigate,
    conversationId,
    pdfUrl,
    setPdfUrl,
    aggregatedCitations,
    setAggregatedCitations,
    openPdfView,
    setOpenPdfView,
    isExcel,
    setIsExcel,
    isViewerReady,
    setIsViewerReady,
    transitioning,
    setTransitioning,
    fileBuffer,
    setFileBuffer,
    isPdf,
    setIsPdf,
    isDocx,
    setIsDocx,
    isMarkdown,
    setIsMarkdown,
    isHtml,
    setIsHtml,
    isTextFile,
    setIsTextFile,
    isImage,
    setIsImage,
    loadingConversations,
    setLoadingConversations,
    theme,
    isCurrentConversationLoading,
    conversationStatus,
    setConversationStatus,
    pendingResponseConversationId,
    setPendingResponseConversationId,
    showWelcome,
    setShowWelcome,
    activeRequestTracker,
    setActiveRequestTracker,
    currentConversationIdRef,
    highlightedCitation,
    setHighlightedCitation,
    formatMessage,
    resetViewerStates,
    onViewPdf,
    onClosePdf,
    toggleCitations,
    handleNewChat,
    handleSendMessage,
    handleRegenerateMessage,
    handleChatSelect,
    handleSidebarRefreshComplete,
    handleFeedbackSubmit,
    handleInputChange,
    streamingState,
    updateStreamingContent,
    clearStreaming,
    showStatus,
    statusMessage,
    knowledgeUsed,
    timelineEvents,
    stopStreaming,
    webSources,
  };
}
