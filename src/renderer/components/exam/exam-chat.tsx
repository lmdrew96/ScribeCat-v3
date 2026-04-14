import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renderMarkdown } from '@/lib/render-markdown';
import { useMutation, useQuery } from 'convex/react';
import { Cat, Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamChatProps {
  examRoomId: Id<'examRooms'>;
  examDate?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function ExamChat({ examRoomId, examDate }: ExamChatProps) {
  const chatHistory = useQuery(api.examChat.getExamChatHistory, { examRoomId });
  const saveChatHistory = useMutation(api.examChat.saveExamChatHistory);

  // Get brain context (topic indexes) for the chat
  const brainData = useQuery(api.examBrain.getBrainContext, { examRoomId });
  const reindexEmptySessions = useMutation(api.examBrain.reindexEmptySessions);
  const hasTriggeredReindexRef = useRef(false);

  // Auto-trigger re-indexing when brain context comes back with empty topic indexes
  useEffect(() => {
    if (brainData && brainData.brainContext.startsWith('SESSION CONTENT') && !hasTriggeredReindexRef.current) {
      hasTriggeredReindexRef.current = true;
      reindexEmptySessions({ examRoomId }).catch(console.error);
    }
  }, [brainData, examRoomId, reindexEmptySessions]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  // Load chat history on mount
  useEffect(() => {
    if (chatHistory?.messages && !hasLoadedRef.current) {
      setMessages(
        chatHistory.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        })),
      );
      hasLoadedRef.current = true;
    }
  }, [chatHistory]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Call the exam chat HTTP action
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      const baseUrl = convexUrl.replace('.cloud', '.site');

      const response = await fetch(`${baseUrl}/examNuggetChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.slice(-20).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          brainContext: brainData?.brainContext ?? '',
          sessionTitles: brainData?.sessionTitles ?? [],
          currentDateTime: new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short',
          }),
          examDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        const allMessages = [...updatedMessages, assistantMessage];
        setMessages(allMessages);

        // Persist chat history
        await saveChatHistory({
          examRoomId,
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        });
      } else {
        throw new Error(data.error ?? 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I had trouble responding. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, examRoomId, brainData, saveChatHistory, examDate]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--glass-border)] px-4 py-3">
        <Cat className="h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-medium text-foreground">Nugget — Exam Mode</p>
          <p className="text-[10px] text-muted-foreground">
            Ask about any session in this exam room
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Cat className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Ask Nugget anything about your exam material!
            </p>
            <p className="text-xs text-muted-foreground/70">
              I can see topics from all your sessions
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.timestamp}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent/20 text-foreground'
                  : 'glass-light border border-[var(--glass-border)] text-foreground'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed space-y-0.5">
                  {renderMarkdown(msg.content)}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="glass-light border border-[var(--glass-border)] rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--glass-border)] p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSend()}
            placeholder="Ask Nugget about your exam material..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
