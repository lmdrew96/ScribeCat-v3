/**
 * NuggetChat - Floating AI chat button and drawer
 * Provides Q&A about transcript/notes using Sonnet
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cat, Loader2, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface NuggetChatProps {
  transcript?: string;
  notes?: string;
  convexUrl?: string;
}

export function NuggetChat({ transcript, notes, convexUrl }: NuggetChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the API base URL
  const getApiUrl = useCallback(() => {
    const baseUrl = (convexUrl || import.meta.env.VITE_CONVEX_URL || '').replace(
      '.convex.cloud',
      '.convex.site',
    );
    return `${baseUrl}/nuggetChat`;
  }, [convexUrl]);

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll when messages array changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          transcript: includeTranscript ? transcript : undefined,
          notes: includeNotes ? notes : undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Please try again! 🐱',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Meow! Something went wrong. Please check your connection and try again. 🐱',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, transcript, notes, includeTranscript, includeNotes, getApiUrl]);

  // Handle input keydown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
        onClick={() => setIsOpen(true)}
        title="Chat with Nugget"
      >
        <Cat className="h-6 w-6" />
      </Button>

      {/* Chat Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close chat"
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Cat className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Chat with Nugget</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <WelcomeMessage />
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Nugget is thinking...</span>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Context checkboxes */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTranscript}
                  onChange={(e) => setIncludeTranscript(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Include transcript</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Include notes</span>
              </label>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 p-4 border-t border-border">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nugget about your lecture..."
                className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Welcome message component
function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <Cat className="h-16 w-16 text-primary mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Hey there! I&apos;m Nugget 🐱</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        I&apos;m here to help you understand your lecture content. Ask me anything about your
        transcript or notes!
      </p>
      <div className="flex flex-col gap-2 mt-6 text-sm">
        <p className="text-muted-foreground">Try asking:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <SuggestionChip text="Summarize the main points" />
          <SuggestionChip text="What are the key concepts?" />
          <SuggestionChip text="Explain this in simpler terms" />
        </div>
      </div>
    </div>
  );
}

// Suggestion chip component
function SuggestionChip({ text }: { text: string }) {
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs hover:bg-muted/80 cursor-pointer">
      {text}
    </span>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <Cat className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Nugget</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

export default NuggetChat;
