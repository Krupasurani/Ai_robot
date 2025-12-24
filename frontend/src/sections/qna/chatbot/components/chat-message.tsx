import { ThumbsUp, ThumbsDown, User, Sparkles } from 'lucide-react';
import React, { useMemo, useContext, useCallback, createContext } from 'react';
import type { CustomCitation, FormattedMessage } from 'src/types/chat-bot';
import type { ChatAnswerCitation } from '@/types/chat-answer';
import type { ChatMessageProps } from 'src/types/chat-message';
import { toast } from 'sonner';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/components/ui/sidebar';
import ChatAnswerCard from './chat-answer-card';
import MessageFeedback from './message-feedback';
import ThinkingAnimation from './thinking-animation';
import { buildChatAnswer } from '../utils/chat-answer';

interface StreamingContextType {
  streamingState: {
    messageId: string | null;
    content: string;
    citations: CustomCitation[];
    thinking: string;
    toolCalls: NonNullable<FormattedMessage['toolCalls']>;
    webSources: NonNullable<FormattedMessage['webSources']>;
    isActive: boolean;
  };
  updateStreamingContent: (messageId: string, content: string, citations: CustomCitation[]) => void;
  clearStreaming: () => void;
}

export const StreamingContext = createContext<StreamingContextType | null>(null);

export const useStreamingContent = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreamingContent must be used within StreamingProvider');
  }
  return context;
};

// --- PATCH INCOMPLETE MARKDOWN FOR STREAMING ---
const patchIncompleteMarkdown = (content: string): string => {
  const codeBlockMatches = content.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    content += '\n```';
  }
  if (/([*\-+] |\d+\. )/.test(content.split('\n').slice(-1)[0])) {
    content += '\n';
  }
  return content;
};

const unescapeMarkdown = (content: string): string =>
  content.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');

const normalizeMarkdownContent = (content: string): string => {
  if (!content) return '';

  let normalized = content.trim();
  const fencedWholeMessage = /^```(?:md|markdown|text)?\s*([\s\S]*?)\s*```\s*$/i;
  const fencedMatch = normalized.match(fencedWholeMessage);
  if (fencedMatch) {
    normalized = fencedMatch[1].trim();
  }

  normalized = normalized.replace(/\r\n/g, '\n');
  normalized = normalized
    .replace(/\\(\\)(?=[a-zA-Z]+\b)/g, '\\')
    .replace(/\\(\\)(?=[()])/g, '\\')
    .replace(/\\(\\)(?=(?:\[|\]))/g, '\\');

  try {
    normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);
    normalized = normalized.replace(/\\\(([^]*?)\\\)/g, (_, math) => `$${math}$`);
  } catch {
    // ignore
  }

  return normalized;
};

const isExcelExtension = (value?: string): boolean => {
  if (!value) return false;
  return ['csv', 'xls', 'xlsx'].includes(value.toLowerCase());
};

const FeedbackIconButton = ({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    onClick={onClick}
  >
    {children}
  </button>
);

const ChatMessage = ({
  message,
  onViewPdf,
  onRegenerate,
  onFeedbackSubmit,
  conversationId,
  isRegenerating,
  showRegenerate,
  onFollowUpClick,
}: ChatMessageProps) => {
  const { streamingState } = useStreamingContent();
  const { open } = useSidebar();
  const isStreamingMessage = streamingState.messageId === message.id && streamingState.isActive;

  const displayContent = useMemo(() => {
    const rawContent = isStreamingMessage ? streamingState.content : message.content || '';
    const unescaped = unescapeMarkdown(rawContent);
    const patched = isStreamingMessage ? patchIncompleteMarkdown(unescaped) : unescaped;
    return normalizeMarkdownContent(patched);
  }, [isStreamingMessage, message.content, streamingState.content]);

  const displayCitations = useMemo(() => {
    if (isStreamingMessage) {
      return streamingState.citations || [];
    }
    return message.citations || [];
  }, [isStreamingMessage, message.citations, streamingState.citations]);

  const displayThinking = useMemo(() => {
    if (isStreamingMessage) {
      return streamingState.thinking;
    }
    return message.thinking;
  }, [isStreamingMessage, message.thinking, streamingState.thinking]);

  const displayToolCalls = useMemo(() => {
    if (isStreamingMessage) {
      return streamingState.toolCalls;
    }
    return message.toolCalls;
  }, [isStreamingMessage, message.toolCalls, streamingState.toolCalls]);

  const displayWebSources = useMemo(() => {
    if (isStreamingMessage) {
      return streamingState.webSources;
    }
    return message.webSources;
  }, [isStreamingMessage, message.webSources, streamingState.webSources]);

  const { answer, citationLookup, aggregatedCitations, sourcesById } = useMemo(
    () =>
      buildChatAnswer(message, {
        contentOverride: displayContent,
        citationsOverride: displayCitations,
        thinkingOverride: displayThinking,
        toolCallsOverride: displayToolCalls,
        webSourcesOverride: displayWebSources,
      }),
    [
      message,
      displayContent,
      displayCitations,
      displayThinking,
      displayToolCalls,
      displayWebSources,
    ]
  );

  const citationsById = useMemo(
    () =>
      answer.citations.reduce<Record<string, ChatAnswerCitation>>((acc, citation) => {
        acc[citation.id] = citation;
        return acc;
      }, {}),
    [answer.citations]
  );

  const handleViewDocument = useCallback(
    async (
      citation: CustomCitation,
      relatedCitations: CustomCitation[],
      isExcelFile = false,
      sourceUrl?: string
    ): Promise<void> =>
      new Promise<void>((resolve) => {
        const isHttpUrl = typeof sourceUrl === 'string' && /^https?:\/\//i.test(sourceUrl);

        // For web search sources: open directly in a new tab, no right-hand viewer.
        if (isHttpUrl && sourceUrl) {
          try {
            window.open(sourceUrl, '_blank', 'noopener,noreferrer');
          } catch {
            // noop – if popup blocked, browser will handle it
          }
          resolve();
          return;
        }

        // For knowledge base / uploaded documents: use the existing viewer flow.
        onViewPdf(
          '',
          citation,
          relatedCitations.length ? relatedCitations : [citation],
          isExcelFile
        );
        resolve();
      }),
    [onViewPdf]
  );

  const handleSourceOpen = useCallback(
    (sourceId: string, citationId?: string) => {
      const recordCitations = aggregatedCitations[sourceId] || [];
      const selectedCitation = citationId
        ? citationLookup[citationId]?.citation
        : recordCitations[0];
      if (!selectedCitation) return;
      const source = sourcesById[sourceId];
      const sourceUrl = source?.url;
      const isWebSource =
        source?.type === 'web' ||
        (typeof sourceUrl === 'string' && /^https?:\/\//i.test(sourceUrl));

      handleViewDocument(
        selectedCitation,
        recordCitations,
        isExcelExtension(selectedCitation.metadata?.extension),
        isWebSource ? sourceUrl : undefined
      );
    },
    [aggregatedCitations, citationLookup, handleViewDocument, sourcesById]
  );

  const handleCitationOpen = useCallback(
    (citationId: string) => {
      const entry = citationLookup[citationId];
      if (!entry) return;
      const source = sourcesById[entry.sourceId];
      const sourceUrl = source?.url;
      const isWebSource =
        source?.type === 'web' ||
        (typeof sourceUrl === 'string' && /^https?:\/\//i.test(sourceUrl));

      handleViewDocument(
        entry.citation,
        entry.recordCitations,
        isExcelExtension(entry.citation.metadata?.extension),
        isWebSource ? sourceUrl : undefined
      );
    },
    [citationLookup, handleViewDocument, sourcesById]
  );

  const handleCopyAnswer = useCallback(async () => {
    try {
      const imageRegex = /!\[[^\]]*\]\([^)]*\)/g;
      const processedContent = displayContent.replace(imageRegex, '[Image]').trim();
      await navigator.clipboard.writeText(processedContent);
      toast.success('Copied answer to clipboard');
    } catch (error: any) {
      console.error('Failed to copy answer', error);
      toast.error(error?.message || 'Kopieren fehlgeschlagen');
    }
  }, [displayContent]);

  const feedbackRenderer = useCallback(
    () => (
      <MessageFeedback
        messageId={message.id}
        conversationId={conversationId}
        onFeedbackSubmit={onFeedbackSubmit}
      >
        {({ onPositive, onRequestDetails }) => (
          <div className="flex items-center gap-1.5">
            <FeedbackIconButton label="Gut" onClick={() => onPositive()}>
              <ThumbsUp className="h-4 w-4" />
            </FeedbackIconButton>
            <FeedbackIconButton label="Verbesserung nötig" onClick={onRequestDetails}>
              <ThumbsDown className="h-4 w-4" />
            </FeedbackIconButton>
          </div>
        )}
      </MessageFeedback>
    ),
    [conversationId, message.id, onFeedbackSubmit]
  );

  const handleFollowUp = useCallback(
    (text: string) => {
      if (!text) return;
      onFollowUpClick?.(text);
    },
    [onFollowUpClick]
  );

  return (
    <div
      className={cn(
        'group w-full relative',
        !open ? 'md:px-0 xl:px-16' : 'md:px-2 lg:px-4 xl:px-4',
        message.type === 'user' ? 'bg-gray-50 dark:bg-transparent' : 'bg-transparent'
      )}
    >
      <div
        className={cn(
          'mx-auto flex gap-4 px-4 py-6',
          message.type === 'user' ? 'max-w-3xl' : 'max-w-3xl'
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0',
              message.type === 'user'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-primary/10 dark:bg-primary/20'
            )}
          >
            {message.type === 'user' ? (
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {message.type === 'bot' ? (
            <ChatAnswerCard
              answer={answer}
              citationsById={citationsById}
              sourcesById={sourcesById}
              onCitationOpen={handleCitationOpen}
              onSourceOpen={handleSourceOpen}
              onCopy={handleCopyAnswer}
              onRegenerate={showRegenerate ? () => onRegenerate(message.id) : undefined}
              canRegenerate={showRegenerate}
              followUpAction={handleFollowUp}
              renderFeedback={feedbackRenderer}
            />
          ) : (
            <div className="text-base text-foreground leading-relaxed">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          <AnimatePresence>
            {isRegenerating && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 flex flex-col items-start gap-2"
              >
                <ThinkingAnimation text="Regenerating" />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
