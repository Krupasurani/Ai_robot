// RecordSalesAgent.js
import type {
  Message,
  Citation,
  Metadata,
  CustomCitation,
  FormattedMessage,
  ExpandedCitationsState,
} from 'src/types/chat-bot';
import { useState, useCallback } from 'react';
import { MessageSquare, FileText, X, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

import axiosInstance from 'src/utils/axios';
import RecordSidebar from './ask-me-anything-sidebar';
import ChatInput from '../qna/chatbot/components/chat-input';
import PdfHighlighterComp from '../qna/chatbot/components/pdf-highlighter';

import type { Model, ChatMode } from '../qna/chatbot/components/chat-input';
import type {
  Record,
  RecordHeaderProps,
  ConversationRecord,
  RecordSalesAgentProps,
} from './types/records-ask-me-anything';

const DRAWER_WIDTH = 300;

const formatDate = (dateString: string) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  if (date >= yesterday) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RecordHeader = ({
  record,
  isConversation,
  isDrawerOpen,
  onDrawerToggle,
}: RecordHeaderProps) => {
  return (
    <div className="p-4 flex items-center gap-4 border-b border-border bg-background min-h-16">
      {!isDrawerOpen && (
        <Button variant="ghost" size="icon" onClick={onDrawerToggle} className="size-8 mr-2">
          <Menu className="size-4" />
        </Button>
      )}
      <div className="flex items-center gap-2 flex-1">
        {isConversation ? (
          <MessageSquare className="size-6 text-primary" />
        ) : (
          <FileText className="size-6 text-primary" />
        )}
        <h3 className="text-lg font-semibold">
          {isConversation
            ? record?.title || 'Untitled Conversation'
            : record?.name || 'Select a Record'}
        </h3>
      </div>
    </div>
  );
};

const RecordSalesAgent = ({ initialContext, recordId }: RecordSalesAgentProps) => {
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedCitations, setExpandedCitations] = useState<ExpandedCitationsState>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [aggregatedCitations, setAggregatedCitations] = useState<CustomCitation[]>([]);
  const [openPdfView, setOpenPdfView] = useState<boolean>(false);
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [shouldRefreshSidebar, setShouldRefreshSidebar] = useState<boolean>(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(false);

  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedChatMode, setSelectedChatMode] = useState<ChatMode | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<Record | null>(
    initialContext?.recordId
      ? {
          _id: initialContext.recordId,
          name: initialContext.recordName,
          departments: initialContext.departments,
          recordType: initialContext.recordType,
        }
      : null
  );
  const formatMessage = useCallback((apiMessage: Message): FormattedMessage | null => {
    if (!apiMessage) return null;

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

    if (apiMessage.messageType === 'user_query') {
      return {
        ...baseMessage,
        type: 'user',
        feedback: apiMessage.feedback || [],
      };
    }

    if (apiMessage.messageType === 'bot_response') {
      return {
        ...baseMessage,
        type: 'bot',
        confidence: apiMessage.confidence || '',
        citations: (apiMessage.citations || []).map((citation: Citation) => ({
          id: citation.citationId,
          _id: citation.citationData?._id || citation.citationId,
          citationId: citation.citationId,
          content: citation.citationData.content || '',
          metadata: citation.citationData.metadata || [],
          orgId: citation.orgId,
          citationType: citation.citationType,
          createdAt: citation.citationData?.createdAt || new Date().toISOString(),
          updatedAt: citation.citationData?.updatedAt || new Date().toISOString(),
          chunkIndex: citation.citationData.chunkIndex || 1,
        })),
      };
    }

    return null;
  }, []);

  // const loadConversation = async (conversationId) => {
  //   try {
  //     setIsLoading(true);
  //     const response = await axiosInstance.get(`/api/v1/conversations/${conversationId}`);

  //     if (!response?.data?.conversation) {
  //       throw new Error('Invalid response format');
  //     }

  //     const { conversation } = response.data;
  //     setCurrentConversationId(conversation._id);

  //     const formattedMessages = conversation.messages.map(formatMessage).filter(Boolean);

  //     setMessages(formattedMessages);

  //     const newExpandedCitations = {};
  //     formattedMessages.forEach((msg, index) => {
  //       if (msg.citations?.length > 0) {
  //         newExpandedCitations[index] = false;
  //       }
  //     });
  //     setExpandedCitations(newExpandedCitations);
  //   } catch (error) {
  //     console.error('Error loading conversation:', error);
  //     setMessages([
  //       {
  //         type: 'bot',
  //         content: 'Sorry, I encountered an error loading this conversation.',
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //         id: `error-${Date.now()}`,
  //         contentFormat: 'MARKDOWN',
  //         followUpQuestions: [],
  //         citations: [],
  //         confidence: '',
  //         messageType: 'bot_response',
  //       },
  //     ]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Add this to your RecordSalesAgent component

  const handleRecordSelect = useCallback(
    async (record: ConversationRecord) => {
      try {
        if (!record?._id) return;

        setIsLoadingConversation(true);
        setMessages([]);
        setExpandedCitations({});

        const response = await axiosInstance.get(`/api/v1/conversations/${record._id}`);
        const { conversation } = response.data;

        if (!conversation || !Array.isArray(conversation.messages)) {
          throw new Error('Invalid conversation data');
        }

        // Set the current conversation ID
        setCurrentConversationId(record._id);

        // Format messages and set them
        const formattedMessages = conversation.messages.map(formatMessage).filter(Boolean);

        // Initialize citation states for all bot messages with citations
        const citationStates: ExpandedCitationsState = {};
        formattedMessages.forEach((msg: FormattedMessage, idx: number) => {
          if (msg.type === 'bot' && msg.citations && msg.citations.length > 0) {
            citationStates[idx] = false;
          }
        });

        setMessages(formattedMessages);
        setExpandedCitations(citationStates);

        // Update selected record with conversation data
        setSelectedRecord({
          ...selectedRecord,
          title: conversation.title,
          _id: conversation._id,
          conversationSource: 'records',
          lastActivityAt: conversation.lastActivityAt,
        });
      } catch (error) {
        setMessages([
          {
            type: 'bot',
            content: 'Sorry, I encountered an error loading this conversation.',
            createdAt: new Date(),
            updatedAt: new Date(),
            id: `error-${Date.now()}`,
            contentFormat: 'MARKDOWN',
            followUpQuestions: [],
            citations: [],
            confidence: '',
            messageType: 'bot_response',
            timestamp: new Date(),
          },
        ]);
        setCurrentConversationId(null);
        setExpandedCitations({});
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [formatMessage, selectedRecord]
  );

  const handleNewChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setExpandedCitations({});
    setInputValue('');

    // Reset selected record to initial record state
    setSelectedRecord({
      ...initialContext,
      _id: initialContext.recordId,
      name: initialContext.recordName,
      departments: initialContext.departments,
      recordType: initialContext.recordType,
      conversationSource: 'records',
    });
  }, [initialContext]);

  // Update handleSendMessage to include recordIds and sourceRecordId
  const handleSendMessage = useCallback(
    async (
      message?: string,
      _modelType?: any,
      _files?: any[],
      _modelKey?: string,
      _modelName?: string,
      _chatMode?: string,
      useReasoning?: boolean
    ) => {
      const trimmedInput = (message ?? inputValue).trim();
      if (!trimmedInput || isLoading || !selectedRecord) return;

      const tempUserMessage = {
        id: `temp-${Date.now()}`,
        timestamp: new Date(),
        content: trimmedInput,
        type: 'user',
        contentFormat: 'MARKDOWN',
        followUpQuestions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        feedback: [],
        citations: [],
        messageType: 'user_query',
      };

      try {
        setIsLoading(true);
        setInputValue('');

        let response;
        if (!currentConversationId) {
          // Create new conversation
          response = await axiosInstance.post('/api/v1/conversations/create', {
            query: trimmedInput,
            conversationSource: 'records',
            recordIds: [selectedRecord._id],
            conversationSourceRecordId: selectedRecord._id,
            useReasoning: !!useReasoning,
          });

          if (!response?.data?.conversation) {
            throw new Error('Invalid response format');
          }

          const { conversation } = response.data;
          setCurrentConversationId(conversation._id);
          const formattedMessages = conversation.messages.map(formatMessage).filter(Boolean);
          setMessages(formattedMessages);

          // Trigger sidebar refresh after creating new conversation
          setShouldRefreshSidebar(true);
        } else {
          // Continue existing conversation
          setMessages((prev) => [...prev, tempUserMessage]);

          response = await axiosInstance.post(
            `/api/v1/conversations/${currentConversationId}/messages`,
            {
              query: trimmedInput,
              recordIds: [recordId],
              conversationSourceRecordId: recordId,
              useReasoning: !!useReasoning,
            }
          );

          if (!response?.data?.conversation?.messages) {
            throw new Error('Invalid response format');
          }

          const botMessage = response.data.conversation.messages
            .filter((msg: any) => msg.messageType === 'bot_response')
            .map(formatMessage)
            .pop();

          if (botMessage) {
            setMessages((prev) => [...prev, botMessage]);
          }
        }

        const lastMessage =
          response.data.conversation.messages[response.data.conversation.messages.length - 1];
        if (lastMessage?.citations?.length > 0) {
          setExpandedCitations((prev) => ({
            ...prev,
            [messages.length]: false,
          }));
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            content: 'Sorry, I encountered an error processing your request.',
            createdAt: new Date(),
            updatedAt: new Date(),
            id: `error-${Date.now()}`,
            contentFormat: 'MARKDOWN',
            followUpQuestions: [],
            citations: [],
            confidence: '',
            messageType: 'bot_response',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputValue,
      isLoading,
      currentConversationId,
      selectedRecord,
      messages,
      formatMessage,
      recordId,
    ]
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      if (!currentConversationId || !messageId || !selectedRecord) return;

      try {
        setIsLoading(true);
        const response = await axiosInstance.post(
          `/api/v1/conversations/${currentConversationId}/message/${messageId}/regenerate`,
          {
            instruction: 'Improve writing style and clarity',
            context: {
              recordId: selectedRecord._id,
              recordName: selectedRecord.name || selectedRecord.title,
              recordType: selectedRecord.recordType,
              departments: selectedRecord.departments?.map((d) => d),
              source: 'record_details',
            },
          }
        );

        if (!response?.data?.conversation?.messages) {
          throw new Error('Invalid response format');
        }

        const allMessages = response.data.conversation.messages.map(formatMessage).filter(Boolean);
        const regeneratedMessage = allMessages.filter((msg: any) => msg.type === 'bot').pop();

        if (!regeneratedMessage) {
          throw new Error('No regenerated message found in response');
        }

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...regeneratedMessage, createdAt: msg.createdAt } : msg
          )
        );

        setExpandedCitations((prevStates) => {
          const newStates = { ...prevStates };
          const messageIndex = messages.findIndex((msg) => msg.id === messageId);
          if (messageIndex !== -1) {
            newStates[messageIndex] =
              regeneratedMessage.citations?.length > 0 ? prevStates[messageIndex] || false : false;
          }
          return newStates;
        });
      } catch (error) {
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
    [currentConversationId, formatMessage, messages, selectedRecord]
  );

  const handleFeedbackSubmit = useCallback(
    async (messageId: string, feedback: any) => {
      if (!currentConversationId || !messageId) return;

      try {
        await axiosInstance.post(
          `/api/v1/conversations/${currentConversationId}/message/${messageId}/feedback`,
          feedback
        );
      } catch (error) {
        console.error('Feedback submission error:', error);
        throw error;
      }
    },
    [currentConversationId]
  );
  const handleInputChange = useCallback((e: any) => {
    setInputValue(e.target.value);
  }, []);

  const onViewPdf = useCallback(
    (url: string, citationMeta: Metadata, citations: CustomCitation[]) => {
      setAggregatedCitations(citations);
      setPdfUrl(url);
      setOpenPdfView(true);
      setDrawerOpen(false);
    },
    []
  );

  const onClosePdf = useCallback(() => {
    setOpenPdfView(false);
  }, []);

  const toggleCitations = useCallback((index: number) => {
    setExpandedCitations((prev) => {
      const newState = { ...prev };
      newState[index] = !prev[index];
      return newState;
    });
  }, []);

  return (
    <div className="flex w-full h-full bg-background">
      {isDrawerOpen && (
        <RecordSidebar
          onClose={() => setDrawerOpen(false)}
          onRecordSelect={handleRecordSelect}
          selectedRecordId={currentConversationId}
          initialRecord={selectedRecord}
          recordType={initialContext?.recordType}
          shouldRefresh={shouldRefreshSidebar}
          onRefreshComplete={() => setShouldRefreshSidebar(false)}
          onNewChat={handleNewChat}
          recordId={recordId}
        />
      )}

      <div
        className={cn(
          'grid w-full h-full gap-4 transition-all duration-300',
          openPdfView ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1'
        )}
      >
        <div
          className={cn(
            'flex flex-col min-w-0 h-full overflow-auto bg-background',
            openPdfView && 'border-r border-border'
          )}
        >
          <RecordHeader
            record={selectedRecord}
            isConversation={Boolean(currentConversationId)}
            isDrawerOpen={isDrawerOpen}
            onDrawerToggle={() => setDrawerOpen(true)}
          />

          {/* <ChatMessagesArea
            messages={messages}
            isLoading={isLoading}
            expandedCitations={expandedCitations}
            onToggleCitations={toggleCitations}
            onRegenerateMessage={handleRegenerateMessage}
            onFeedbackSubmit={handleFeedbackSubmit}
            conversationId={currentConversationId}
            onViewPdf={onViewPdf}
            isLoadingConversation={isLoadingConversation}
          /> */}

          <div className="p-4 border-t border-border bg-background mt-auto">
            <ChatInput
              // value={inputValue}
              // onChange={handleInputChange}
              onSubmit={handleSendMessage}
              isLoading={isLoading}
              disabled={!selectedRecord}
              placeholder={
                !selectedRecord
                  ? 'Select a record to start chatting'
                  : currentConversationId
                    ? 'Continue the conversation...'
                    : 'Start a new conversation...'
              }
              selectedModel={selectedModel}
              selectedChatMode={selectedChatMode}
              onModelChange={setSelectedModel}
              onChatModeChange={setSelectedChatMode}
              apps={[]}
              knowledgeBases={[]}
              initialSelectedApps={[]}
              initialSelectedKbIds={[]}
            />
          </div>
        </div>

        {openPdfView && (
          <div className="h-full overflow-hidden relative bg-background border-l border-border">
            <PdfHighlighterComp
              pdfUrl={pdfUrl}
              citations={aggregatedCitations}
              onClosePdf={onClosePdf}
            />
            <Button
              onClick={onClosePdf}
              className="fixed top-[60px] right-8 z-[9999] bg-primary text-primary-foreground hover:bg-primary/90 shadow-md rounded-md h-8 px-3 text-sm font-semibold gap-2"
            >
              <X className="h-4 w-4" />
              Close Document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordSalesAgent;
