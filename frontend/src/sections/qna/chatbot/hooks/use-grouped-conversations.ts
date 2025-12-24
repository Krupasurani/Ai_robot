import { useMemo } from 'react';
import type { Conversation } from 'src/types/chat-bot';

interface UseGroupedConversationsOptions {
  conversations: (Conversation & { isShared: boolean })[];
  t: (key: string) => string;
}

/**
 * Custom hook to group conversations by date (Today, Yesterday, etc.)
 */
export function useGroupedConversations({
  conversations,
  t,
}: UseGroupedConversationsOptions) {
  return useMemo(() => {
    const todayKey = t('chat.today');
    const yesterdayKey = t('chat.yesterday');
    const previous7DaysKey = t('chat.previous7Days');
    const previous30DaysKey = t('chat.previous30Days');
    const olderKey = t('chat.older');

    const groups: { [key: string]: (Conversation & { isShared: boolean })[] } = {
      [todayKey]: [],
      [yesterdayKey]: [],
      [previous7DaysKey]: [],
      [previous30DaysKey]: [],
      [olderKey]: [],
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
        groups[todayKey].push(chat);
      } else if (chatDate >= yesterday) {
        groups[yesterdayKey].push(chat);
      } else if (chatDate >= weekAgo) {
        groups[previous7DaysKey].push(chat);
      } else if (chatDate >= monthAgo) {
        groups[previous30DaysKey].push(chat);
      } else {
        groups[olderKey].push(chat);
      }
    });

    // Return only groups that have conversations
    return Object.fromEntries(Object.entries(groups).filter(([_, chats]) => chats.length > 0));
  }, [conversations, t]);
}

