import { AnimatePresence, m } from 'framer-motion';
import { ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { CustomCitation, FormattedMessage, ExpandedCitationsState } from 'src/types/chat-bot';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextAnimate } from '@/components/ui/text-animate';
import { Button } from '@/components/ui/button';
import ChatMessage, { useStreamingContent } from './chat-message';

type ChatMessagesAreaProps = {
  messages: FormattedMessage[];
  isLoading: boolean;
  expandedCitations: ExpandedCitationsState;
  onToggleCitations: (index: number) => void;
  onRegenerateMessage: (messageId: string) => Promise<void>;
  onFeedbackSubmit: (messageId: string, feedback: any) => Promise<void>;
  conversationId: string | null;
  isLoadingConversation: boolean;
  onFollowUpClick?: (text: string) => void;
  onViewPdf: (
    url: string,
    citation: CustomCitation,
    citations: CustomCitation[],
    isExcelFile?: boolean,
    buffer?: ArrayBuffer
  ) => void;
  currentStatus?: string;
  isStatusVisible?: boolean;
  stausMessage?: string;
  webSources?: {
    id: number | string;
    title: string;
    url?: string;
    snippet?: string;
    domain?: string;
  }[];
};

type ProcessingIndicatorProps = {
  displayText: string;
};

type MessageWithControlsProps = {
  message: FormattedMessage;
  index: number;
  isExpanded: boolean;
  onToggleCitations: (index: number) => void;
  onFollowUpClick?: (text: string) => void;
  onViewPdf: (
    url: string,
    citation: CustomCitation,
    citations: CustomCitation[],
    isExcelFile?: boolean,
    buffer?: ArrayBuffer
  ) => void;
  onFeedbackSubmit: (messageId: string, feedback: any) => Promise<void>;
  conversationId: string | null;
  onRegenerate: (messageId: string) => Promise<void>;
  showRegenerate: boolean;
  isLatestBotMessage?: boolean;
};

const ProcessingIndicator = React.memo(({ displayText }: ProcessingIndicatorProps) => {
  const renderAnimation = () => {
    if (!displayText) return 'thinking';
    if (displayText.includes('🔍') || displayText.toLowerCase().includes('search')) {
      return 'searching';
    }
    return 'processing';
  };

  const getAnimationType = () => {
    if (!displayText) return 'thinking';
    if (displayText.includes('🔍') || displayText.toLowerCase().includes('search')) {
      return 'searching';
    }
    return 'processing';
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            <TextAnimate animation="blurIn" by="character">
              {displayText}
            </TextAnimate>
          </div>
        </div>
      </div>
    </div>
  );
});

const ChatMessagesArea = ({
  messages,
  isLoading,
  expandedCitations,
  onToggleCitations,
  onRegenerateMessage,
  onFeedbackSubmit,
  conversationId,
  isLoadingConversation,
  onFollowUpClick,
  onViewPdf,
  currentStatus,
  isStatusVisible,
  stausMessage,
  webSources = [],
}: ChatMessagesAreaProps) => {
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessagesLength = React.useRef(messages.length);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // const [webSourcesExpanded, setWebSourcesExpanded] = useState(false);

  // NEW: Scroll button states
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Remove sorting and use messages directly to maintain order
  const displayMessages = useMemo(() => messages, [messages]);
  // console.log(displayMessages , "🤣")

  // Find the last bot message for regeneration
  const hasStreamingContent = useMemo(() => {
    if (displayMessages.length === 0) return false;
    const lastMessage = displayMessages[displayMessages.length - 1];
    return lastMessage?.type === 'bot' && lastMessage?.id?.startsWith('streaming-');
  }, [displayMessages]);

  const canRegenerateMessage = useCallback(
    (message: FormattedMessage) => {
      const botMessages = messages.filter((msg) => msg.type === 'bot');
      const lastBotMessage = botMessages[botMessages.length - 1];
      return (
        message.type === 'bot' &&
        message.messageType !== 'error' &&
        message.id === lastBotMessage?.id &&
        !message.id.startsWith('error-') &&
        !message.id.startsWith('streaming-')
      );
    },
    [messages]
  );

  const scrollToBottomSmooth = useCallback(() => {
    if (!messagesEndRef.current || !shouldAutoScroll) return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [shouldAutoScroll]);

  const scrollToBottomImmediate = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, []);

  // NEW: Scroll to top function
  const scrollToTop = useCallback(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // NEW: Scroll to bottom function (manual)
  const scrollToBottom = useCallback(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    const isNearTop = scrollTop < 150;

    setShouldAutoScroll(isNearBottom);

    // NEW: Show/hide scroll buttons based on position
    setShowScrollToTop(scrollTop > 200);
    setShowScrollToBottom(!isNearBottom && scrollHeight > clientHeight + 400);
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage?.type === 'user' && shouldAutoScroll) {
        setTimeout(scrollToBottomImmediate, 50);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, shouldAutoScroll, scrollToBottomImmediate]);

  const { streamingState } = useStreamingContent();

  useEffect(() => {
    // Scroll to bottom immediately as streaming content updates
    if (streamingState.isActive && streamingState.content && shouldAutoScroll) {
      scrollToBottomImmediate();
    }
  }, [streamingState.content, streamingState.isActive, shouldAutoScroll, scrollToBottomImmediate]);

  // Handle conversation changes
  useEffect(() => {
    if (conversationId) {
      setShouldAutoScroll(true);
      if (displayMessages.length > 0) setTimeout(scrollToBottomImmediate, 100);
    }
  }, [conversationId, displayMessages.length, scrollToBottomImmediate]);

  const shouldShowLoadingIndicator = useMemo(() => {
    if (hasStreamingContent) return false;
    if (isLoadingConversation && messages.length === 0) return true;
    if (isStatusVisible && currentStatus) return true;

    // NEW: Check if last message is from user (waiting for bot response)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === 'user' && !hasStreamingContent) {
        return true;
      }
    }
    return false;
  }, [isLoadingConversation, currentStatus, isStatusVisible, hasStreamingContent, messages]);

  const indicatorText = useMemo(() => {
    if (isLoadingConversation && messages.length === 0) return 'Loading conversation...';
    if (currentStatus) return currentStatus;

    // NEW: Show processing message when last message is from user
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.type === 'user' && !isLoadingConversation) {
        return 'Thinking ...';
      }
    }
    return '';
  }, [isLoadingConversation, currentStatus, messages]);

  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    },
    []
  );

  return (
    <div className="relative flex-1 flex w-full flex-col min-h-0  bg-transparent">
      <ScrollArea
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex flex-col flex-grow min-h-0 h-full"
      >
        <div className="flex flex-col flex-grow h-full relative">
          <div className="min-h-1" />
          {displayMessages.map((message, index) => (
            <MessageWithControls
              key={`msg-${message.id}`}
              message={message}
              index={index}
              isExpanded={expandedCitations[index]}
              onToggleCitations={() => onToggleCitations(index)}
              onRegenerate={onRegenerateMessage}
              onFeedbackSubmit={onFeedbackSubmit}
              conversationId={conversationId}
              showRegenerate={canRegenerateMessage(message)}
              onFollowUpClick={onFollowUpClick}
              onViewPdf={onViewPdf}
            />
          ))}
          {/* FIX: Render the indicator in the flow with the correct text */}
          {shouldShowLoadingIndicator && (
            <div className="mt-2 mb-8">
              <ProcessingIndicator displayText={indicatorText} />
            </div>
          )}

          {/* Web Sources - Now inside ScrollArea */}
          {/* {webSources.length > 0 && (
            <div className="mx-3 mb-4 mt-4 rounded-2xl border border-muted-foreground/20 bg-background/60 p-3 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setWebSourcesExpanded((prev) => !prev)}
                aria-expanded={webSourcesExpanded}
                aria-controls="web-sources-panel"
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Web Sources</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">
                    ({webSources.length})
                  </span>
                </span>
                <ArrowDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-150',
                    webSourcesExpanded ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </button>

              {webSourcesExpanded && (
                <div
                  id="web-sources-panel"
                  className="mt-3 grid gap-2"
                >
                  {webSources.map((source, idx) => (
                    <a
                      key={`${source.id}-${source.url ?? ''}`}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl border border-border/60 bg-background/80 px-4 py-3 transition-all hover:border-border hover:bg-background hover:shadow-md"
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="flex-1 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary">
                          {source.title || source.url || 'Unbenannte Quelle'}
                        </div>
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                          {idx + 1}
                        </span>
                      </div>
                      {source.snippet && (
                        <p className="mb-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {source.snippet}
                        </p>
                      )}
                      {source.url && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                          <Link className="h-3 w-3" />
                          <span className="truncate group-hover:text-primary">
                            {source.url.replace(/^https?:\/\//, '')}
                          </span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )} */}

          <div
            ref={messagesEndRef}
            style={{
              float: 'left',
              clear: 'both',
              height: 1,
              width: '100%',
            }}
          />
        </div>
      </ScrollArea>

      {/* NEW: Scroll to Top Button */}
      <AnimatePresence>
        {showScrollToTop && (
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-5 right-5 z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollToTop}
              className="h-10 w-10 rounded-full bg-background/80 hover:bg-background/90 border border-border shadow-md"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </m.div>
        )}
      </AnimatePresence>

      {/* NEW: Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-5 right-5 z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollToBottom}
              className="h-10 w-10 rounded-full bg-background/80 hover:bg-background/90 border border-border shadow-md"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MessageWithControls = React.memo(
  ({
    message,
    index,
    isExpanded,
    onToggleCitations,
    onRegenerate,
    onFeedbackSubmit,
    conversationId,
    showRegenerate,
    onFollowUpClick,
    onViewPdf,
    isLatestBotMessage,
  }: MessageWithControlsProps & { isLatestBotMessage?: boolean }) => {
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerate = async (messageId: string): Promise<void> => {
      setIsRegenerating(true);
      try {
        await onRegenerate(messageId);
      } finally {
        setIsRegenerating(false);
      }
    };

    return (
      <div className="mb-1">
        <ChatMessage
          message={message}
          index={index}
          isExpanded={isExpanded}
          onToggleCitations={onToggleCitations}
          onRegenerate={handleRegenerate}
          onFeedbackSubmit={onFeedbackSubmit}
          conversationId={conversationId}
          isRegenerating={isRegenerating}
          showRegenerate={showRegenerate}
          onViewPdf={onViewPdf}
          isLatestBotMessage={isLatestBotMessage}
          onFollowUpClick={onFollowUpClick}
        />
      </div>
    );
  }
);

export default ChatMessagesArea;
