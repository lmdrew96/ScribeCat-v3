import { ConversationList } from '@/components/messages/conversation-list';
import { ConversationThread } from '@/components/messages/conversation-thread';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useConversations } from '@/hooks/use-messaging';
import { useUser } from '@clerk/clerk-react';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';

export function MessagesView() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { conversations, isLoading } = useConversations();
  const isMobile = useIsMobile();

  // Read conversationId from route params
  const convoMatch = useMatch({ from: '/messages/$conversationId', shouldThrow: false });
  const selectedId = (convoMatch?.params.conversationId ?? null) as Id<'conversations'> | null;

  // Find the selected conversation for header info
  const validConversations = conversations.filter((c): c is NonNullable<typeof c> => c != null);
  const selectedConvo = validConversations.find((c) => c.conversationId === selectedId);
  const currentUserId = user?.id ?? '';

  const handleSelect = (conversationId: Id<'conversations'>) => {
    navigate({ to: '/messages/$conversationId', params: { conversationId } });
  };

  const handleBack = () => {
    navigate({ to: '/messages' });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Mobile: show either the list OR the thread, not both
  if (isMobile) {
    return (
      <div className="flex h-full flex-col p-3">
        {selectedConvo ? (
          <div className="flex-1 rounded-xl glass overflow-hidden min-w-0">
            <ConversationThread
              conversationId={selectedConvo.conversationId}
              currentUserId={currentUserId}
              otherUser={selectedConvo.otherUser}
              onBack={handleBack}
            />
          </div>
        ) : (
          <div className="flex-1 rounded-xl glass overflow-hidden">
            <div className="border-b border-[var(--glass-border)] px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">Messages</h2>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 49px)' }}>
              <ConversationList
                conversations={validConversations}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-full gap-3 p-3">
      {/* Conversation list (sidebar) */}
      <div className="w-72 shrink-0 rounded-xl glass overflow-hidden">
        <div className="border-b border-[var(--glass-border)] px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Messages</h2>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 49px)' }}>
          <ConversationList
            conversations={validConversations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex-1 rounded-xl glass overflow-hidden min-w-0">
        {selectedConvo ? (
          <ConversationThread
            conversationId={selectedConvo.conversationId}
            currentUserId={currentUserId}
            otherUser={selectedConvo.otherUser}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Select a conversation</p>
              <p className="text-xs text-muted-foreground">Or start one from your Friends list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
