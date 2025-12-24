import React, { useRef, useCallback, useState } from 'react';
import { useTranslate } from 'src/locales';
import ChatInput, { type ChatInputProps, Model, ChatMode } from './chat-input';
import type { PromptTemplate } from '@/api/prompt-library';
import { WelcomeTopBar } from './welcome-top-bar';
import { useWelcomePrompts } from './hooks/use-welcome-prompts';
import { WelcomeHeaderSection } from './welcome-header-section';
import { WelcomePromptLibrary } from './welcome-prompt-library';

interface WelcomeMessageProps {
  onSubmit: ChatInputProps['onSubmit'];
  isLoading?: boolean;
  selectedModel: Model | null;
  selectedChatMode: ChatMode | null;
  onModelChange: (model: Model) => void;
  onChatModeChange: (mode: ChatMode) => void;
  apps?: Array<{ id: string; name: string; iconPath?: string }>;
  knowledgeBases?: Array<{ id: string; name: string }>;
  initialSelectedApps?: string[];
  initialSelectedKbIds?: string[];
  onFiltersChange?: (filters: { apps: string[]; kb: string[] }) => void;
}

// Main WelcomeMessage component
const WelcomeMessageComponent = ({
  onSubmit,
  isLoading = false,
  selectedModel,
  selectedChatMode,
  onModelChange,
  onChatModeChange,
  apps = [],
  knowledgeBases = [],
  initialSelectedApps = [],
  initialSelectedKbIds = [],
  onFiltersChange,
}: WelcomeMessageProps) => {
  const isSubmittingRef = useRef(false);
  const { t } = useTranslate('navbar');
  const [prefillMessage, setPrefillMessage] = useState<string>('');

  // Use custom hook to manage prompts state and logic
  const {
    activeTab,
    setActiveTab,
    displayedPrompts,
    loadingPrompts,
    hasMorePrompts,
    isExpanded,
    handleLoadMore,
  } = useWelcomePrompts();

  // Direct submission handler
  const handleDirectSubmit = useCallback<ChatInputProps['onSubmit']>(
    async (
      text,
      modelType,
      attachedFiles,
      modelKey,
      modelName,
      chatMode,
      useReasoning,
      useWebSearch,
      contextRefs,
      filters,
      agentId
    ) => {
      if (isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      try {
        await onSubmit(
          text,
          modelType,
          attachedFiles,
          modelKey,
          modelName,
          chatMode,
          useReasoning,
          useWebSearch,
          contextRefs,
          filters,
          agentId
        );
      } catch (error) {
        console.error('Error during message submission:', error);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [onSubmit]
  );

  // Handle prompt selection - populate input field instead of submitting
  const handlePromptSelect = useCallback((prompt: PromptTemplate) => {
    // Set the prefill message to populate the chat input
    // Clear first to ensure the effect triggers even if clicking the same prompt
    setPrefillMessage('');
    // Use requestAnimationFrame to ensure the clear happens before setting new value
    requestAnimationFrame(() => {
      setPrefillMessage(prompt.content || '');
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Top Bar with Settings and Create Prompt buttons */}
      <WelcomeTopBar />

      <div className="flex-1 flex flex-col items-center overflow-y-auto min-h-0">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Dynamic Header Section */}
          <WelcomeHeaderSection />

          {/* Prompt Library Section */}
          <WelcomePromptLibrary
            activeTab={activeTab}
            onTabChange={setActiveTab}
            prompts={displayedPrompts}
            loadingPrompts={loadingPrompts}
            onPromptSelect={handlePromptSelect}
            onLoadMore={handleLoadMore}
            hasMorePrompts={hasMorePrompts}
            isExpanded={isExpanded}
          />
        </div>
      </div>

      {/* ChatInput Component - Sticky at bottom */}
      <div className="sticky bottom-0 w-full bg-gradient-to-t from-background via-background to-background/0 pt-3 z-10 mt-auto">
        <div className="max-w-4xl mx-auto px-0 sm:px-6 pb-4">
          <ChatInput
            onSubmit={handleDirectSubmit}
            isLoading={isLoading || isSubmittingRef.current}
            disabled={isLoading || isSubmittingRef.current}
            placeholder={t('welcome.placeholder')}
            selectedModel={selectedModel}
            selectedChatMode={selectedChatMode}
            onModelChange={onModelChange}
            onChatModeChange={onChatModeChange}
            apps={apps}
            knowledgeBases={knowledgeBases}
            initialSelectedApps={initialSelectedApps}
            initialSelectedKbIds={initialSelectedKbIds}
            onFiltersChange={onFiltersChange}
            prefillMessage={prefillMessage}
          />
        </div>
      </div>
    </div>
  );
};

// Memoize the component
const WelcomeMessage = React.memo(WelcomeMessageComponent);
WelcomeMessage.displayName = 'WelcomeMessage';

export default WelcomeMessage;
