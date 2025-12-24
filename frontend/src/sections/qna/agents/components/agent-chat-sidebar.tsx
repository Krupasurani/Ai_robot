import type { Agent } from 'src/types/agent';
import type { Conversation } from 'src/types/chat-bot';
import type { Connector } from 'src/sections/accountdetails/connectors/types/types';
import type {
  ChatSidebarProps,
  ConversationGroup,
  DeleteDialogState,
  ConversationsResponse,
} from 'src/types/chat-sidebar';

import { useTranslate } from '@/locales/use-locales';
import { getPlaceholderTitle } from '@/utils/conversation-titles';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Menu, Check, X, MessageSquare, MoreVertical, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

import axiosInstance from 'src/utils/axios';

// import ShareConversationDialog from 'src/sections/qna/chatbot/components/dialogs/share-conversation-dialog';
import ArchivedChatsDialog from 'src/sections/qna/chatbot/components/dialogs/archieve-chat-dialog';
import DeleteConversationDialog from 'src/sections/qna/chatbot/components/dialogs/delete-conversation-dialog';

interface AgentChatSidebarProps extends ChatSidebarProps {
  agent: Agent | null;
  activeConnectors: Connector[];
}

const AgentChatSidebar = ({
  onClose,
  onChatSelect,
  onNewChat,
  selectedId,
  shouldRefresh,
  onRefreshComplete,
  agent,
  activeConnectors,
}: AgentChatSidebarProps) => {
  // Use useRef for values that shouldn't trigger re-renders when changed
  const isMounted = useRef(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [editingChat, setEditingChat] = useState<Conversation | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, chat: null });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { currentLang } = useTranslate();
  const sidebarLanguage = currentLang?.value || 'en';
  const [isShareDialogOpen, setIsShareDialogOpen] = useState<boolean>(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState<boolean>(false);

  // Memoize fetch function to prevent recreation on each render
  const fetchConversations = useCallback(
    async (pageNum: number): Promise<void> => {
      if (!isMounted.current || !agent?._key) return;

      setIsLoading(true);
      try {
        const response = await axiosInstance.get<ConversationsResponse>(
          `/api/v1/agents/${agent._key}/conversations`,
          {
            params: {
              page: pageNum,
              limit: 20,
            },
          }
        );

        const {
          conversations: newConversations = [],
          pagination = {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        } = response.data;

        if (!isMounted.current) return;

        if (pageNum === 1) {
          setConversations(newConversations);
        } else {
          setConversations((prev) => [...prev, ...newConversations]);
        }

        setHasMore(pagination.hasNextPage || false);
        setPage(pageNum);
      } catch (error) {
        if (!isMounted.current) return;
        console.error('Failed to fetch conversations:', error);
        setHasMore(false);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setInitialLoading(false);
        }
      }
    },
    [agent?._key]
  );

  // Clean up effect to prevent state updates after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle refresh logic
  useEffect(() => {
    if (shouldRefresh && isMounted.current) {
      fetchConversations(1).then(() => {
        if (isMounted.current && onRefreshComplete) {
          onRefreshComplete();
        }
      });
    }
  }, [shouldRefresh, fetchConversations, onRefreshComplete]);

  // Initial fetch and tab change effect
  useEffect(() => {
    if (isMounted.current) {
      setPage(1);
      setInitialLoading(true);
      fetchConversations(1);
    }
  }, [activeTab, fetchConversations]);

  // Menu handling
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, chat: Conversation): void => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setSelectedChat(chat);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedChat(null);
  }, []);

  // Memoize grouped conversations to prevent unnecessary recalculations
  const groupedConversations = useMemo(() => {
    const groups: ConversationGroup = {
      Today: [],
      Yesterday: [],
      'Previous 7 days': [],
      'Previous 30 days': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    conversations.forEach((chat) => {
      const chatDate = new Date(chat.lastActivityAt || chat.createdAt);

      if (chatDate >= today) {
        groups.Today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.Yesterday.push(chat);
      } else if (chatDate >= weekAgo) {
        groups['Previous 7 days'].push(chat);
      } else if (chatDate >= monthAgo) {
        groups['Previous 30 days'].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    // Return only groups that have conversations
    return Object.fromEntries(Object.entries(groups).filter(([_, chats]) => chats.length > 0));
  }, [conversations]);

  const handleListItemClick = useCallback(
    (chat: Conversation): void => {
      if (onChatSelect) onChatSelect(chat);
    },
    [onChatSelect]
  );

  const handleNewChat = useCallback((): void => {
    handleMenuClose();
    if (onNewChat) onNewChat();
  }, [handleMenuClose, onNewChat]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>): void => {
      if (!hasMore || isLoading) return;

      const target = e.target as HTMLDivElement;
      const bottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 1;

      if (bottom) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchConversations(nextPage);
      }
    },
    [hasMore, isLoading, page, fetchConversations]
  );

  const handleEditStart = useCallback(
    (chat: Conversation): void => {
      setEditingChat(chat);
      setEditTitle(chat.title || '');
      handleMenuClose();
    },
    [handleMenuClose]
  );

  const handleEditCancel = useCallback((): void => {
    setEditingChat(null);
    setEditTitle('');
  }, []);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!editingChat || !editTitle.trim()) return;

      try {
        await axiosInstance.patch(
          `/api/v1/agents/${agent?._key}/conversations/${editingChat._id}/title`,
          {
            title: editTitle.trim(),
          }
        );

        // Optimistically update the UI immediately
        setConversations((prev) =>
          prev.map((chat) =>
            chat._id === editingChat._id ? { ...chat, title: editTitle.trim() } : chat
          )
        );

        toast.success('Conversation renamed successfully');
        handleEditCancel();
      } catch (error) {
        // In case of failure, show an error but don't revert the UI
        // to avoid flickering - when the list refreshes it will get the correct state
        // setSnackbar({
        //   open: true,
        //   message: 'Failed to rename conversation. Please try again.',
        //   severity: 'error',
        // });
      }
    },
    [editingChat, editTitle, handleEditCancel, agent?._key]
  );

  const handleDeleteClick = useCallback(
    (chat: Conversation): void => {
      setDeleteDialog({ open: true, chat });
      handleMenuClose();
    },
    [handleMenuClose]
  );

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteDialog.chat) return;
    setIsDeleting(true);

    try {
      // Immediately update the UI by removing the conversation
      setConversations((prev) => prev.filter((chat) => chat._id !== deleteDialog.chat?._id));

      // Check if the deleted chat is the currently selected one
      const isCurrentChatDeleted = selectedId === deleteDialog.chat._id;

      // Send API request in the background
      await axiosInstance.delete(
        `/api/v1/agents/${agent?._key}/conversations/${deleteDialog.chat._id}`
      );

      // If we deleted the current chat, navigate to a new conversation
      if (isCurrentChatDeleted && onNewChat) {
        onNewChat();
      }

      toast.success('Conversation deleted successfully');
    } catch (error) {
      // If the API request fails, fetch conversations again to restore the correct state
      fetchConversations(1);

      // setSnackbar({
      //   open: true,
      //   message: 'Failed to delete conversation. Please try again.',
      //   severity: 'error',
      // });
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, chat: null });
    }
  }, [deleteDialog.chat, selectedId, onNewChat, fetchConversations, agent?._key]);

  const handleArchive = useCallback(
    async (chat: Conversation): Promise<void> => {
      try {
        // First update UI optimistically
        setConversations((prev) => prev.filter((c) => c._id !== chat._id));

        // Check if the archived chat is the currently selected one
        const isCurrentChatArchived = selectedId === chat._id;

        // Make API call in background
        await axiosInstance.patch(
          `/api/v1/agents/${agent?._key}/conversations/${chat._id}/archive`
        );

        // If we archived the current chat, navigate to a new conversation
        if (isCurrentChatArchived && onNewChat) {
          onNewChat();
        }

        handleMenuClose();

        toast.success('Conversation archived successfully');
      } catch (error) {
        // If API request fails, restore the list
        fetchConversations(1);
      }
    },
    [fetchConversations, handleMenuClose, onNewChat, selectedId, agent?._key]
  );

  const handleUnarchive = useCallback(async (): Promise<void> => {
    // Just refresh the list after unarchiving
    await fetchConversations(1);
  }, [fetchConversations]);

  const handleShareConversation = useCallback(
    (conversationId: string): void => {
      setSelectedConversationId(conversationId);
      setIsShareDialogOpen(true);
      handleMenuClose();
    },
    [handleMenuClose]
  );

  const handleShareDialogClose = useCallback((): void => {
    setIsShareDialogOpen(false);
    setSelectedConversationId(null);
  }, []);

  // Memoize the EmptyState component to prevent unnecessary re-renders
  const EmptyState = useMemo(
    () => () => (
      <div className="flex flex-col items-center justify-center text-center h-full p-6">
        <MessageCircle className="h-[68px] w-[68px] text-muted-foreground/15 mb-4" />
        <h3 className="mb-2 font-medium text-lg text-foreground">
          {activeTab === 'my' ? 'No conversations yet' : 'No shared conversations'}
        </h3>
        <p className="mb-6 max-w-[240px] text-sm text-muted-foreground leading-relaxed">
          {activeTab === 'my'
            ? 'Start a new conversation to begin chatting with Thero Agent'
            : 'When someone shares a conversation with you, it will appear here'}
        </p>
        {activeTab === 'my' && (
          <Button variant="default" onClick={handleNewChat} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Start a conversation
          </Button>
        )}
      </div>
    ),
    // eslint-disable-next-line
    [activeTab, handleNewChat]
  );
  // Memoize the ChatItem component to prevent unnecessary re-renders
  const renderChatItem = useCallback(
    (chat: Conversation) => {
      const conversationLanguage = chat.titleLanguage || sidebarLanguage;
      const displayTitle = chat.title?.trim() || getPlaceholderTitle(conversationLanguage);

      return (
        <div key={chat._id} className="relative flex items-center group">
          {editingChat?._id === chat._id ? (
            <form onSubmit={handleEditSubmit} className="flex items-center gap-2 w-full px-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                className="flex-1 h-8"
                placeholder="Enter conversation title"
              />
              <Button size="icon" variant="ghost" type="submit" disabled={!editTitle.trim()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleEditCancel}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center w-full">
              <button
                onClick={() => handleListItemClick(chat)}
                className={cn(
                  'flex items-center gap-2 w-full rounded-md py-2 px-2 text-left transition-colors',
                  selectedId === chat._id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm" title={displayTitle}>
                  {displayTitle}
                </span>
              </button>
              {editingChat?._id !== chat._id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e as any, chat);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {menuItems.map((item) => (
                      <DropdownMenuItem
                        key={item.label}
                        onClick={item.onClick}
                        className={cn(item.color === 'error' && 'text-destructive')}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      );
    },
    [
      editingChat,
      editTitle,
      handleEditCancel,
      handleEditSubmit,
      handleMenuOpen,
      handleListItemClick,
      selectedId,
      sidebarLanguage,
    ]
  );

  // Memoize menu items to prevent recreating this array on every render
  const menuItems = useMemo(
    () =>
      [
        // {
        //   icon: editIcon,
        //   label: 'Rename',
        //   onClick: () => selectedChat && handleEditStart(selectedChat),
        //   show: activeTab === 'my',
        // },
        // {
        //   icon: archiveIcon,
        //   label: 'Archive',
        //   onClick: () => selectedChat && handleArchive(selectedChat),
        //   show: activeTab === 'my',
        // },
        {
          label: 'Delete',
          onClick: () => selectedChat && handleDeleteClick(selectedChat),
          color: 'error',
          show: activeTab === 'my',
        },
        // {
        //   icon: shareIcon,
        //   label: 'Share',
        //   onClick: () => selectedChat && handleShareConversation(selectedChat._id),
        //   color: 'primary',
        //   show: activeTab === 'my',
        // },
      ].filter((item) => item.show),
    [activeTab, selectedChat, handleDeleteClick]
  );

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2 sticky top-0 z-10 bg-background border-b border-border">
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
          <Menu className="h-4 w-4" />
        </Button>
        <h2 className="flex-1 font-semibold text-sm truncate">{agent?.name}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={handleNewChat} className="h-8 w-8">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New chat</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="px-3 py-2 flex items-center gap-2 bg-background border-b border-border">
        <p className="text-sm text-muted-foreground line-clamp-2">{agent?.description}</p>
      </div>
      {/* Conversations List */}
      <div className="flex-1 px-2 flex flex-col overflow-y-auto" onScroll={handleScroll}>
        {initialLoading ? (
          <div className="flex justify-center items-center min-h-[200px] w-full py-8">
            <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedConversations).length === 0 ? (
          <EmptyState />
        ) : (
          Object.entries(groupedConversations).map(([group, chats]) => (
            <React.Fragment key={group}>
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group}
              </p>
              <div className="space-y-1">{chats.map(renderChatItem)}</div>
            </React.Fragment>
          ))
        )}

        {isLoading && !initialLoading && (
          <div className="flex justify-center p-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Delete Dialog */}
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
        onSelectChat={onChatSelect}
      />
    </div>
  );
};

export default AgentChatSidebar;
