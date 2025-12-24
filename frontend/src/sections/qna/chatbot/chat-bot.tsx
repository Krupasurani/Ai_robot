import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import React, { useMemo, useState, useCallback } from 'react';

import { useChatBot } from './utils/useChatBot';
import HtmlViewer from './components/html-highlighter';
import TextViewer from './components/text-highlighter';
import ExcelViewer from './components/excel-highlighter';
import WelcomeMessage from './components/welcome-message';
import { StreamingContext } from './components/chat-message';
import ChatMessagesArea from './components/chat-message-area';
import PdfHighlighterComp from './components/pdf-highlighter';
import ImageHighlighter from './components/image-highlighter';
import MarkdownViewer from './components/markdown-highlighter';
import DocxHighlighterComp from './components/docx-highlighter';
import ChatInput, {
  type Model,
  type ChatMode,
  type ContextRef,
  type ChatInputProps,
} from './components/chat-input';

type SubmitModelType = Parameters<ChatInputProps['onSubmit']>[1];

// TEMPORARILY DISABLED: 'agent' model type removed from available values as requested
const MODEL_TYPE_VALUES: SubmitModelType[] = ['knowledge', 'chat', 'deepResearch', 'image'];
const LEGACY_MODEL_TYPE_MAP: Record<string, SubmitModelType> = {
  science: 'knowledge',
  search: 'deepResearch',
};
const DEFAULT_MODEL_TYPE: SubmitModelType = 'chat';

const isModelType = (value?: string): value is SubmitModelType =>
  Boolean(value && MODEL_TYPE_VALUES.includes(value as SubmitModelType));

const resolveModelType = (model: Model | null): SubmitModelType => {
  const candidate = model?.modelType;
  if (candidate && LEGACY_MODEL_TYPE_MAP[candidate]) {
    return LEGACY_MODEL_TYPE_MAP[candidate];
  }
  return isModelType(candidate) ? candidate : DEFAULT_MODEL_TYPE;
};

const ChatInterface = () => {
  const MemoizedChatMessagesArea = React.memo(ChatMessagesArea);
  const MemoizedWelcomeMessage = React.memo(WelcomeMessage);

  const {
    messages,
    isLoadingConversation,
    expandedCitations,
    currentConversationId,
    pdfUrl,
    aggregatedCitations,
    openPdfView,
    isExcel,
    isViewerReady,
    transitioning,
    fileBuffer,
    isDocx,
    isMarkdown,
    isHtml,
    isTextFile,
    isImage,
    isCurrentConversationLoading,
    showWelcome,
    highlightedCitation,
    onViewPdf,
    onClosePdf,
    toggleCitations,
    handleSendMessage: originalHandleSendMessage,
    handleRegenerateMessage,
    handleFeedbackSubmit,
    streamingState,
    updateStreamingContent,
    clearStreaming,
    statusMessage,
    stopStreaming,
    webSources,
  } = useChatBot();
  const [isNavigationBlocked] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedChatMode, setSelectedChatMode] = useState<ChatMode | null>(null);

  const streamingContextValue = useMemo(
    () => ({
      streamingState,
      updateStreamingContent,
      clearStreaming,
    }),
    [streamingState, updateStreamingContent, clearStreaming]
  );

  const isSecondaryPanelVisible = openPdfView;
  const showPdfPanel = openPdfView;

  // Enhanced handleSendMessage to properly handle the promise
  const handleSendMessage = useCallback<ChatInputProps['onSubmit']>(
    async (
      message,
      modelType,
      _attachedFiles,
      _modelKey,
      _modelName,
      _chatMode,
      _useReasoning,
      _useWebSearch,
      contextRefs,
      filters,
      agentId
    ) => {
      // Filter out any 'user' typed contexts before passing to original handler
      const filteredContext = contextRefs?.filter(
        (
          c: ContextRef
        ): c is { type: 'kb' | 'project' | 'record' | 'app'; id: string; label: string } =>
          c.type !== 'user'
      );

      await originalHandleSendMessage(
        message,
        modelType,
        _attachedFiles,
        _modelKey,
        _modelName,
        _chatMode,
        _useReasoning,
        _useWebSearch,
        filteredContext,
        filters,
        agentId
      );
    },
    [originalHandleSendMessage]
  );

  const handleFollowUpClick = useCallback(
    (prompt: string) => {
      if (!prompt) return;
      handleSendMessage(
        prompt,
        resolveModelType(selectedModel),
        undefined,
        selectedModel?.modelKey,
        selectedModel?.modelName,
        selectedChatMode?.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ).catch((error) => {
        console.error('Failed to send follow-up message', error);
      });
    },
    [handleSendMessage, selectedModel, selectedChatMode]
  );

  return (
    <StreamingContext.Provider value={streamingContextValue}>
      <div className="flex w-full md:h-screen h-[calc(100vh-48px)] overflow-hidden font-sans ">
        <div
          className={cn(
            'grid w-full h-full transition-[grid-template-columns] duration-300 gap-0 relative',
            isSecondaryPanelVisible
              ? 'grid-cols-[minmax(420px,1.25fr)_minmax(420px,1fr)] pr-1'
              : '',
            !isSecondaryPanelVisible && 'dark:pr-2 pr-1.5',
            'p-1.5'
          )}
        >
          <div
            className={cn(
              'flex flex-col min-w-0  w-full relative overflow-hidden  transition-all duration-300 ',
              isSecondaryPanelVisible ? 'mr-1' : 'mr-0'
            )}
          >
            {showWelcome ? (
              <MemoizedWelcomeMessage
                key="welcome-screen"
                onSubmit={handleSendMessage}
                isLoading={isCurrentConversationLoading()}
                selectedModel={selectedModel}
                selectedChatMode={selectedChatMode}
                onModelChange={setSelectedModel}
                onChatModeChange={setSelectedChatMode}
              />
            ) : (
              <div className="flex flex-col h-full transition-opacity duration-200 ease-in-out">
                <MemoizedChatMessagesArea
                  messages={messages}
                  isLoading={streamingState.isActive}
                  expandedCitations={expandedCitations}
                  onToggleCitations={toggleCitations}
                  onRegenerateMessage={handleRegenerateMessage}
                  onFeedbackSubmit={handleFeedbackSubmit}
                  conversationId={currentConversationId}
                  isLoadingConversation={isLoadingConversation}
                  onFollowUpClick={handleFollowUpClick}
                  onViewPdf={onViewPdf}
                  stausMessage={statusMessage}
                  webSources={webSources}
                />

                <div className="flex-shrink-0 relative  p-4  pb-2 border-t-0 before:content-[''] before:absolute before:top-0 before:left-[5%] before:right-[5%] before:h-px before:bg-gradient-to-r before:from-transparent before:via-black/10 before:to-transparent dark:before:via-white/10">
                  <ChatInput
                    onSubmit={handleSendMessage}
                    isLoading={isCurrentConversationLoading()}
                    disabled={isCurrentConversationLoading() || isNavigationBlocked}
                    placeholder="Type your message..."
                    selectedModel={selectedModel}
                    selectedChatMode={selectedChatMode}
                    onModelChange={setSelectedModel}
                    onChatModeChange={setSelectedChatMode}
                    prefillMessage=""
                  />
                  {streamingState.isActive && (
                    <div className="absolute -top-8 right-6">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={stopStreaming}
                        aria-label="Stop generating"
                      >
                        Stop
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {showPdfPanel && (
            <div
              className="
                h-full
                overflow-hidden
                relative
                bg-white dark:bg-[#0F0F10]
                rounded-sm
                mr-0.5
                shadow-sm
                dark:shadow-sm
                border border-black/[0.04] dark:border-white/[0.08]
                backdrop-blur-[20px]
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
              "
            >
              {transitioning && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <Loader className="w-5 h-5 animate-spin bg-gray-400" />
                </div>
              )}
              {isViewerReady &&
                (pdfUrl || fileBuffer) &&
                aggregatedCitations &&
                (isExcel ? (
                  <ExcelViewer
                    key="excel-viewer"
                    citations={aggregatedCitations}
                    fileUrl={pdfUrl}
                    excelBuffer={fileBuffer}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ) : isDocx ? (
                  <DocxHighlighterComp
                    key="docx-viewer"
                    url={pdfUrl || undefined}
                    buffer={fileBuffer || undefined}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    renderOptions={{
                      breakPages: true,
                      renderHeaders: true,
                      renderFooters: true,
                    }}
                    onClosePdf={onClosePdf}
                  />
                ) : isMarkdown ? (
                  <MarkdownViewer
                    key="markdown-viewer"
                    url={pdfUrl}
                    buffer={fileBuffer}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ) : isHtml ? (
                  <HtmlViewer
                    key="html-viewer"
                    url={pdfUrl}
                    buffer={fileBuffer}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ) : isTextFile ? (
                  <TextViewer
                    key="text-viewer"
                    url={pdfUrl}
                    buffer={fileBuffer}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ) : isImage ? (
                  <ImageHighlighter
                    key="image-viewer"
                    url={pdfUrl}
                    buffer={fileBuffer}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ) : (
                  <PdfHighlighterComp
                    key="pdf-viewer"
                    pdfUrl={pdfUrl}
                    pdfBuffer={fileBuffer}
                    citations={aggregatedCitations}
                    highlightCitation={highlightedCitation}
                    onClosePdf={onClosePdf}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </StreamingContext.Provider>
  );
};

export default ChatInterface;
