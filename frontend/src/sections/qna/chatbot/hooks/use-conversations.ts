import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Conversation } from 'src/types/chat-bot';
import { fetchAllConversations } from '../services/conversations-api';

interface UseConversationsOptions {
  projectId: string | null;
  searchQuery?: string;
}

/**
 * Custom hook for fetching conversations with infinite scroll pagination
 */
export function useConversations({ projectId, searchQuery = '' }: UseConversationsOptions) {
  const query = useInfiniteQuery<Awaited<ReturnType<typeof fetchAllConversations>>>({
    queryKey: ['conversations', projectId],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchAllConversations({
        page: pageParam as number,
        limit: 20,
        projectId,
      });
    },
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof fetchAllConversations>>) => {
      const hasMore =
        lastPage.myConversations.pagination.hasNextPage ||
        lastPage.sharedConversations.pagination.hasNextPage;
      return hasMore ? lastPage.myConversations.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Flatten all pages into a single array with search filtering
  const allConversations = useMemo(() => {
    if (!query.data?.pages) return [];

    const myConversations: (Conversation & { isShared: boolean })[] = [];
    const sharedConversations: (Conversation & { isShared: boolean })[] = [];

    query.data.pages.forEach((page: Awaited<ReturnType<typeof fetchAllConversations>>) => {
      page.myConversations.conversations.forEach((conv: Conversation) => {
        myConversations.push({ ...conv, isShared: false });
      });
      page.sharedConversations.conversations.forEach((conv: Conversation) => {
        sharedConversations.push({ ...conv, isShared: true });
      });
    });

    const combined = [...myConversations, ...sharedConversations];

    // Filter by search query
    const filtered = searchQuery
      ? combined.filter((c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
      : combined;

    // Sort by last activity
    return filtered.sort(
      (a, b) =>
        new Date(b.lastActivityAt || b.createdAt).getTime() -
        new Date(a.lastActivityAt || a.createdAt).getTime()
    );
  }, [query.data, searchQuery]);

  return {
    ...query,
    allConversations,
    initialLoading: query.isLoading && !query.data,
  };
}

/**
 * Hook to invalidate conversations cache
 */
export function useInvalidateConversations() {
  const queryClient = useQueryClient();

  return (projectId: string | null) => {
    queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
  };
}
