import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface RoomMessage {
  _id: Id<'studyRoomMessages'>;
  roomId: Id<'studyRooms'>;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: number;
  senderName: string;
}

interface RoomChatProps {
  messages: RoomMessage[];
  isLoading: boolean;
  currentUserId: string;
  onSend: (args: { roomId: Id<'studyRooms'>; content: string }) => Promise<unknown>;
  roomId: Id<'studyRooms'>;
}

export function RoomChat({ messages, isLoading, currentUserId, onSend, roomId }: RoomChatProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

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
      await onSend({ roomId, content: text });
    } catch (error) {
      console.error('Error sending message:', error);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, roomId, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="border-b border-[var(--glass-border)] px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">Room Chat</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1">
            <p className="text-xs text-muted-foreground">No messages yet</p>
            <p className="text-[10px] text-muted-foreground">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // System messages
            if (msg.messageType === 'system') {
              return (
                <div key={msg._id} className="flex justify-center py-1">
                  <p className="text-[10px] text-muted-foreground italic">{msg.content}</p>
                </div>
              );
            }

            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-1.5 text-xs',
                    isMine
                      ? 'bg-accent text-accent-foreground'
                      : 'glass-light border border-[var(--glass-border)]',
                  )}
                >
                  {!isMine && (
                    <p className="text-[10px] font-medium text-accent mb-0.5">{msg.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={cn(
                      'mt-0.5 text-[9px]',
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
      <div className="border-t border-[var(--glass-border)] p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg glass-light border border-[var(--glass-border)] px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent min-h-[32px] max-h-[80px]"
            rows={1}
          />
          <Button
            size="icon"
            className="h-[32px] w-[32px] shrink-0"
            disabled={!input.trim() || sending}
            onClick={() => void handleSend()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
