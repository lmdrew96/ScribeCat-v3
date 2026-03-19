import { Button } from '@/components/ui/button';
import { useMessages } from '@/hooks/use-messaging';
import { useShareSession } from '@/hooks/use-session-sharing';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Copy, FileAudio, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ConversationThreadProps {
  conversationId: Id<'conversations'>;
  currentUserId: string;
  otherUser: {
    displayName: string;
    username: string;
  };
}

export function ConversationThread({
  conversationId,
  currentUserId,
  otherUser,
}: ConversationThreadProps) {
  const { messages, sendMessage, markRead, isLoading } = useMessages(conversationId);
  const { copyToLibrary } = useShareSession();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Mark as read when opening conversation
  useEffect(() => {
    if (conversationId) {
      void markRead({ conversationId });
    }
  }, [conversationId, markRead]);

  // Auto-scroll to bottom and mark read on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      if (conversationId) {
        void markRead({ conversationId });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, conversationId, markRead]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isLoading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage({ conversationId, content: text });
    } catch (error) {
      console.error('Error sending message:', error);
      setInput(text); // Restore on failure
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCopyToLibrary = async (sessionId: string) => {
    try {
      const newId = await copyToLibrary({ sessionId: sessionId as Id<'sessions'> });
      toast.success('Session copied to your library');
      navigate({ to: '/study/$sessionId', params: { sessionId: newId } });
    } catch (error) {
      console.error('Error copying session:', error);
      toast.error('Failed to copy session');
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{otherUser.displayName}</p>
          <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            const isShare = msg.messageType === 'session_share';

            return (
              <div key={msg._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-xl px-3 py-2 text-sm',
                    isMine
                      ? 'bg-accent text-accent-foreground'
                      : 'glass-light border border-[var(--glass-border)]',
                  )}
                >
                  {isShare && msg.sharedSessionId ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <FileAudio className="h-3.5 w-3.5" />
                        {msg.sharedSessionTitle ?? 'Shared session'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() =>
                            navigate(
                              isMine
                                ? {
                                    to: '/study/$sessionId',
                                    params: { sessionId: msg.sharedSessionId as string },
                                  }
                                : {
                                    to: '/shared/$sessionId',
                                    params: { sessionId: msg.sharedSessionId as string },
                                  },
                            )
                          }
                        >
                          <BookOpen className="h-3 w-3" />
                          View
                        </Button>
                        {!isMine && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => void handleCopyToLibrary(msg.sharedSessionId as string)}
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p
                    className={cn(
                      'mt-1 text-[10px]',
                      isMine ? 'text-accent-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--glass-border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message @${otherUser.username}`}
            className="flex-1 resize-none rounded-lg glass-light border border-[var(--glass-border)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent min-h-[38px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="icon"
            className="h-[38px] w-[38px] shrink-0"
            disabled={!input.trim() || sending}
            onClick={() => void handleSend()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
