import axiosInstance from 'src/utils/axios';
import type { Conversation } from 'src/types/chat-bot';
import { ConversationsResponse } from '@/types/chat-sidebar';

export interface FetchConversationsParams {
  page: number;
  limit?: number;
  shared: boolean;
  projectId?: string | null;
}

export interface ConversationsPageData {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Fetch conversations from the API
 */
export async function fetchConversationsPage(
  params: FetchConversationsParams
): Promise<ConversationsPageData> {
  const { page, limit = 20, shared, projectId } = params;

  const response = await axiosInstance.get<ConversationsResponse>('/api/v1/conversations/', {
    params: {
      page,
      limit,
      shared,
      ...(projectId ? { projectId } : { excludeProject: true }),
    },
  });

  return {
    conversations: response.data.conversations || [],
    pagination: response.data.pagination || {
      page: 1,
      limit: 20,
      totalCount: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

/**
 * Fetch both my conversations and shared conversations
 */
export async function fetchAllConversations(
  params: Omit<FetchConversationsParams, 'shared'>
): Promise<{
  myConversations: ConversationsPageData;
  sharedConversations: ConversationsPageData;
}> {
  const [myResponse, sharedResponse] = await Promise.all([
    fetchConversationsPage({ ...params, shared: false }),
    fetchConversationsPage({ ...params, shared: true }),
  ]);

  return {
    myConversations: myResponse,
    sharedConversations: sharedResponse,
  };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<Conversation> {
  const response = await axiosInstance.patch<{ data: Conversation }>(
    `/api/v1/conversations/${conversationId}/title`,
    { title }
  );
  return response.data.data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/conversations/${conversationId}`);
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string): Promise<Conversation> {
  const response = await axiosInstance.patch<{ data: Conversation }>(
    `/api/v1/conversations/${conversationId}/archive`
  );
  return response.data.data;
}
