import { toast } from 'sonner';
import { Loader, PlusIcon, MessageSquareDashed } from 'lucide-react';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Conversation } from 'src/types/chat-bot';
import type { DeleteDialogState } from 'src/types/chat-sidebar';
import { useDebounce } from '@/hooks/use-debounce';

import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { useSidebar, SidebarMenu, SidebarGroup } from '@/components/ui/sidebar';

import { m, AnimatePresence } from 'framer-motion';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { useChatBot } from '../utils/useChatBot';
import ArchivedChatsDialog from './dialogs/archieve-chat-dialog';
import ShareConversationDialog from './dialogs/share-conversation-dialog';
import DeleteConversationDialog from './dialogs/delete-conversation-dialog';
import ChatSidebarItem from './chat-sidebar-item';
import { useConversations, useInvalidateConversations } from '../hooks/use-conversations';
import { useConversationMutations } from '../hooks/use-conversation-mutations';
import { useGroupedConversations } from '../hooks/use-grouped-conversations';

const ChatSidebar = () => {
  const {
    handleChatSelect: onChatSelect,
    handleNewChat: onNewChat,
    handleSidebarRefreshComplete: onRefreshComplete,
    currentConversationId: selectedId,
    shouldRefreshSidebar: shouldRefresh,
  } = useChatBot();

  const location = useLocation();
  const isMobile = useIsMobile();
  const { open, setOpenMobile } = useSidebar();
  const { t, currentLang } = useTranslate('navbar');
  const sidebarLanguage = currentLang?.value || 'en';

  // UI State (not related to server data)
  const [editingChat, setEditingChat] = useState<Conversation | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, chat: null });
  const [isShareDialogOpen, setIsShareDialogOpen] = useState<boolean>(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState<boolean>(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState<boolean>(false);

  // Debounce search query to optimize filtering performance
  // 300ms delay provides good balance between responsiveness and performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get current user from auth context
  const { user: currentUser } = useAuthContext();
  const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId;

  // Extract project ID from URL
  const projectId = useMemo(() => {
    const match = location.pathname.match(/\/projects\/(\w{24})/);
    return match?.[1] || null;
  }, [location.pathname]);

  // Handlers that need to be defined before mutations
  const handleEditCancel = useCallback((): void => {
    setEditingChat(null);
    setEditTitle('');
  }, []);

  // Custom hooks for data fetching and mutations
  // Use debounced search query to prevent excessive re-renders while typing
  const { allConversations, isFetchingNextPage, hasNextPage, fetchNextPage, initialLoading } =
    useConversations({ projectId, searchQuery: debouncedSearchQuery });

  const groupedConversations = useGroupedConversations({
    conversations: allConversations,
    t,
  });

  const invalidateConversations = useInvalidateConversations();

  const {
    updateTitle,
    deleteConversation: deleteConv,
    archiveConversation: archiveConv,
    isDeleting,
  } = useConversationMutations({
    projectId,
    selectedId,
    onNewChat,
    onEditCancel: handleEditCancel,
    onDeleteComplete: () => setDeleteDialog({ open: false, chat: null }),
  });

  // Handlers
  const handleListItemClick = useCallback(
    (chat: Conversation): void => {
      if (onChatSelect) {
        // Fire and forget - don't await to match signature
        onChatSelect(chat).catch((err) => {
          console.error('Error selecting chat:', err);
        });
      }
      if (isMobile) {
        setOpenMobile(false);
      }
    },
    [onChatSelect, isMobile, setOpenMobile]
  );

  const handleNewChat = useCallback((): void => {
    if (onNewChat) {
      setIsCreatingNewChat(true);
      setSearchQuery('');
      onNewChat();
      setTimeout(() => {
        setIsCreatingNewChat(false);
      }, 400);
    }
  }, [onNewChat]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>): void => {
      if (!hasNextPage || isFetchingNextPage) return;

      const target = e.target as HTMLDivElement;
      const bottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;

      if (bottom) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const handleEditStart = useCallback((chat: Conversation): void => {
    setEditingChat(chat);
    setEditTitle(chat.title || '');
  }, []);

  const handleEditSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (!editingChat || !editTitle.trim()) return;
      updateTitle({
        conversationId: editingChat._id,
        title: editTitle.trim(),
      });
    },
    [editingChat, editTitle, updateTitle]
  );

  const handleDeleteClick = useCallback((chat: Conversation): void => {
    setDeleteDialog({ open: true, chat });
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteDialog.chat) return;
    deleteConv(deleteDialog.chat._id);
  }, [deleteDialog.chat, deleteConv]);

  const handleArchive = useCallback(
    (chat: Conversation): void => {
      archiveConv(chat._id);
    },
    [archiveConv]
  );

  const handleUnarchive = useCallback(() => {
    invalidateConversations(projectId);
  }, [invalidateConversations, projectId]);

  const handleShareConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsShareDialogOpen(true);
  }, []);

  const handleShareDialogClose = useCallback(() => {
    setIsShareDialogOpen(false);
    setSelectedConversationId(null);
  }, []);

  const handleShareSuccess = useCallback(
    (conversationId?: string) => {
      // Invalidate queries to refresh the list
      invalidateConversations(projectId);
      toast.success('Conversation shared successfully');
    },
    [invalidateConversations, projectId]
  );

  // Handle refresh trigger
  useEffect(() => {
    if (shouldRefresh) {
      // Small delay to ensure backend has processed new conversations
      const timeoutId = setTimeout(() => {
        invalidateConversations(projectId);
        onRefreshComplete?.();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [shouldRefresh, projectId, invalidateConversations, onRefreshComplete]);

  return (
    <SidebarGroup className=" h-full p-1">
      <SidebarMenu>
        {/* Search */}
        <AnimatePresence>
          {open && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-2 w-full"
            >
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus-visible:ring-0 mb-1"
              />
            </m.div>
          )}
        </AnimatePresence>

        <Separator />

        {/* Conversations List */}
        <AnimatePresence>
          {open && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
              onScroll={handleScroll}
            >
              {initialLoading ? (
                <div className="flex justify-center items-center min-h-40 w-full">
                  <Loader className="animate-spin" size={20} />
                </div>
              ) : Object.keys(groupedConversations).length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-2">
                  <MessageSquareDashed className="text-muted-foreground" />
                  <h3 className="text-sm text-foreground font-medium">No conversations yet</h3>
                  <h3 className="text-xs text-muted-foreground text-center">
                    Start a new conversation to begin chatting with Thero Agent
                  </h3>
                  <Button
                    onClick={handleNewChat}
                    className="text-xs flex items-center gap-2 w-full mt-2"
                    disabled={isCreatingNewChat}
                  >
                    {isCreatingNewChat ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      <PlusIcon />
                    )}
                    {isCreatingNewChat ? 'Creating...' : 'Start a conversation'}
                  </Button>
                </div>
              ) : (
                Object.entries(groupedConversations).map(([group, chats], groupIndex) => (
                  <m.div
                    key={group}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: groupIndex * 0.05, ease: 'easeOut' }}
                    className="overflow-y-auto"
                  >
                    <h1
                      className={cn(
                        'text-xs py-3 ml-1 font-medium',
                        group === t('chat.today') ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {group}
                    </h1>
                    <div className="p-0">
                      {chats.map((chat, chatIndex) => {
                        const isOwner =
                          chat.userId === currentUserId || chat.initiator === currentUserId;
                        return (
                          <m.div
                            key={chat._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.4,
                              delay: groupIndex * 0.05 + chatIndex * 0.02,
                              ease: 'easeOut',
                            }}
                            className="mb-1"
                          >
                            <ChatSidebarItem
                              chat={chat}
                              selectedId={selectedId}
                              isEditing={editingChat?._id === chat._id}
                              editTitle={editTitle}
                              isOwner={isOwner}
                              sidebarLanguage={sidebarLanguage}
                              onEditStart={handleEditStart}
                              onEditCancel={handleEditCancel}
                              onEditSubmit={handleEditSubmit}
                              onEditTitleChange={setEditTitle}
                              onItemClick={handleListItemClick}
                              onArchive={handleArchive}
                              onDelete={handleDeleteClick}
                              onShare={handleShareConversation}
                            />
                          </m.div>
                        );
                      })}
                    </div>
                  </m.div>
                ))
              )}

              {isFetchingNextPage && !initialLoading && (
                <div className="flex justify-center p-2">
                  <Loader className="animate-spin" size={20} />
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Dialogs */}
        <DeleteConversationDialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, chat: null })}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
        <ArchivedChatsDialog
          open={archiveDialogOpen}
          onClose={() => setArchiveDialogOpen(false)}
          onUnarchive={handleUnarchive}
          onSelectChat={async (chat: Conversation) => {
            if (onChatSelect) {
              await onChatSelect(chat);
            }
          }}
        />
        <ShareConversationDialog
          open={isShareDialogOpen}
          onClose={handleShareDialogClose}
          conversationId={selectedConversationId}
          onShareSuccess={handleShareSuccess}
        />
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default ChatSidebar;
