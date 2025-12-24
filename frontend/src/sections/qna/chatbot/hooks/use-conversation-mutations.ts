import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Conversation } from 'src/types/chat-bot';
import {
  updateConversationTitle,
  deleteConversation,
  archiveConversation,
} from '../services/conversations-api';

interface UseConversationMutationsOptions {
  projectId: string | null;
  selectedId?: string | null;
  onNewChat?: () => void;
  onEditCancel?: () => void;
  onDeleteComplete?: () => void;
}

/**
 * Custom hook for conversation mutations (update, delete, archive)
 */
export function useConversationMutations({
  projectId,
  selectedId,
  onNewChat,
  onEditCancel,
  onDeleteComplete,
}: UseConversationMutationsOptions) {
  const queryClient = useQueryClient();

  // Mutation: Update conversation title
  const updateTitleMutation = useMutation<
    Conversation,
    Error,
    { conversationId: string; title: string },
    { previousData: unknown }
  >({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      updateConversationTitle(conversationId, title),
    onMutate: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['conversations', projectId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['conversations', projectId]);

      // Optimistically update
      queryClient.setQueryData(['conversations', projectId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            myConversations: {
              ...page.myConversations,
              conversations: page.myConversations.conversations.map((conv: Conversation) =>
                conv._id === conversationId ? { ...conv, title } : conv
              ),
            },
            sharedConversations: {
              ...page.sharedConversations,
              conversations: page.sharedConversations.conversations.map((conv: Conversation) =>
                conv._id === conversationId ? { ...conv, title } : conv
              ),
            },
          })),
        };
      });

      return { previousData };
    },
    onError: (
      _err: Error,
      _variables: { conversationId: string; title: string },
      context: { previousData: unknown } | undefined
    ) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['conversations', projectId], context.previousData);
      }
      toast.error('Failed to rename conversation. Please try again.');
    },
    onSuccess: () => {
      toast.success('Conversation renamed successfully');
      onEditCancel?.();
    },
  });

  // Mutation: Delete conversation
  const deleteMutation = useMutation<void, Error, string, { previousData: unknown }>({
    mutationFn: deleteConversation,
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', projectId] });
      const previousData = queryClient.getQueryData(['conversations', projectId]);

      queryClient.setQueryData(['conversations', projectId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            myConversations: {
              ...page.myConversations,
              conversations: page.myConversations.conversations.filter(
                (conv: Conversation) => conv._id !== conversationId
              ),
            },
            sharedConversations: {
              ...page.sharedConversations,
              conversations: page.sharedConversations.conversations.filter(
                (conv: Conversation) => conv._id !== conversationId
              ),
            },
          })),
        };
      });

      return { previousData };
    },
    onError: (
      _err: Error,
      _conversationId: string,
      context: { previousData: unknown } | undefined
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(['conversations', projectId], context.previousData);
      }
      toast.error('Failed to delete conversation. Please try again.');
    },
    onSuccess: () => {
      toast.success('Conversation deleted successfully');
      if (selectedId && onNewChat) {
        onNewChat();
      }
      onDeleteComplete?.();
    },
  });

  // Mutation: Archive conversation
  const archiveMutation = useMutation<Conversation, Error, string, { previousData: unknown }>({
    mutationFn: archiveConversation,
    onMutate: async (conversationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', projectId] });
      const previousData = queryClient.getQueryData(['conversations', projectId]);

      queryClient.setQueryData(['conversations', projectId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            myConversations: {
              ...page.myConversations,
              conversations: page.myConversations.conversations.filter(
                (conv: Conversation) => conv._id !== conversationId
              ),
            },
            sharedConversations: {
              ...page.sharedConversations,
              conversations: page.sharedConversations.conversations.filter(
                (conv: Conversation) => conv._id !== conversationId
              ),
            },
          })),
        };
      });

      return { previousData };
    },
    onError: (
      _err: Error,
      _conversationId: string,
      context: { previousData: unknown } | undefined
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(['conversations', projectId], context.previousData);
      }
      toast.error('Failed to archive conversation. Please try again.');
    },
    onSuccess: () => {
      toast.success('Conversation archived successfully');
      if (selectedId && onNewChat) {
        onNewChat();
      }
    },
  });

  return {
    updateTitle: updateTitleMutation.mutate,
    deleteConversation: deleteMutation.mutate,
    archiveConversation: archiveMutation.mutate,
    isUpdatingTitle: updateTitleMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}
