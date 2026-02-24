import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useConversations() {
  const conversations = useQuery(api.messaging.listConversations);
  return {
    conversations: conversations ?? [],
    isLoading: conversations === undefined,
  };
}

export function useMessages(conversationId: Id<'conversations'> | null) {
  const messages = useQuery(
    api.messaging.getMessages,
    conversationId ? { conversationId } : 'skip',
  );
  const sendMessage = useMutation(api.messaging.sendMessage);
  const markRead = useMutation(api.messaging.markRead);

  return {
    messages: messages ?? [],
    isLoading: messages === undefined,
    sendMessage,
    markRead,
  };
}

export function useUnreadCount() {
  const count = useQuery(api.messaging.unreadCount);
  return count ?? 0;
}

export function useStartConversation() {
  return useMutation(api.messaging.getOrCreateConversation);
}
