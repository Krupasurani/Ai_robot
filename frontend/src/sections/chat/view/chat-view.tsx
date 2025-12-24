import type { IChatParticipant } from 'src/types/chat';

import { useState, useEffect, useCallback } from 'react';
import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard-content';
import { useGetContacts, useGetConversation, useGetConversations } from 'src/actions/chat';
import { EmptyContent } from 'src/components/custom/empty-content';
import { useAuthContext } from 'src/auth/hooks';

import { ChatNav } from '../chat-nav';
import { ChatRoom } from '../chat-room';
import { ChatMessageList } from '../chat-message-list';
import { ChatMessageInput } from '../chat-message-input';
import { ChatHeaderDetail } from '../chat-header-detail';
import { ChatHeaderCompose } from '../chat-header-compose';
import { useCollapseNav } from '../hooks/use-collapse-nav';

export function ChatView() {
  const router = useRouter();

  const { user } = useAuthContext();

  const { contacts } = useGetContacts();

  const searchParams = useSearchParams();

  const selectedConversationId = searchParams.get('id') || '';

  const [recipients, setRecipients] = useState<IChatParticipant[]>([]);

  const { conversations, conversationsLoading } = useGetConversations();

  const { conversation, conversationError, conversationLoading } = useGetConversation(
    `${selectedConversationId}`
  );

  const roomNav = useCollapseNav();

  const conversationsNav = useCollapseNav();

  const participants: IChatParticipant[] = conversation
    ? conversation.participants.filter(
        (participant: IChatParticipant) => participant.id !== `${user?.id}`
      )
    : [];

  useEffect(() => {
    if (conversationError || !selectedConversationId) {
      router.push(paths.dashboard.chat);
    }
  }, [conversationError, router, selectedConversationId]);

  const handleAddRecipients = useCallback((selected: IChatParticipant[]) => {
    setRecipients(selected);
  }, []);

  return (
    <DashboardContent maxWidth={false} className="flex flex-1 flex-col">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-10 text-foreground">Chat</h1>

      <div className="flex flex-row min-h-0 flex-1 rounded-lg relative bg-background shadow-sm">
        {/* Nav */}
        <div className="flex flex-col">
          <ChatNav
            contacts={contacts}
            conversations={conversations}
            loading={conversationsLoading}
            selectedConversationId={selectedConversationId}
            collapseNav={conversationsNav}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex flex-row items-center py-1 pr-1 pl-2.5 h-[72px] flex-shrink-0 border-b border-border">
            {selectedConversationId ? (
              <ChatHeaderDetail
                collapseNav={roomNav}
                participants={participants}
                loading={conversationLoading}
              />
            ) : (
              <ChatHeaderCompose contacts={contacts} onAddRecipients={handleAddRecipients} />
            )}
          </div>

          {/* Main and Details */}
          <div className="flex-1 min-h-0 flex flex-row">
            {/* Main */}
            <div className="flex-1 min-w-0">
              {selectedConversationId ? (
                <ChatMessageList
                  messages={conversation?.messages ?? []}
                  participants={participants}
                  loading={conversationLoading}
                />
              ) : (
                <EmptyContent
                  imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-chat-active.svg`}
                  title="Good morning!"
                  description="Write something awesome..."
                />
              )}

              <ChatMessageInput
                recipients={recipients}
                onAddRecipients={handleAddRecipients}
                selectedConversationId={selectedConversationId}
                disabled={!recipients.length && !selectedConversationId}
              />
            </div>

            {/* Details */}
            {selectedConversationId && (
              <div className="min-h-0">
                <ChatRoom
                  collapseNav={roomNav}
                  participants={participants}
                  loading={conversationLoading}
                  messages={conversation?.messages ?? []}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardContent>
  );
}
