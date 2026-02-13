/**
 * NuggetChat - Floating AI chat button and drawer
 * Provides Q&A about transcript/notes with persistent chat history.
 * Context-aware: adapts to recording vs study mode.
 */

import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from 'convex/react';
import { Cat, Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface NuggetChatProps {
  transcript?: string;
  notes?: string;
  sessionId?: string;
  convexUrl?: string;
  lectureType?: string;
  nuggetNotes?: string;
  isRecording?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NuggetChat({
  transcript,
  notes,
  sessionId,
  convexUrl,
  lectureType,
  nuggetNotes,
  isRecording,
  isOpen,
  onOpenChange,
}: NuggetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat history persistence
  const chatHistory = useQuery(
    api.studyTools.getChatHistory,
    sessionId ? { sessionId: sessionId as Id<'sessions'> } : 'skip',
  );
  const saveChatHistory = useMutation(api.studyTools.saveChatHistory);

  // Determine chat mode
  const chatMode = useMemo((): 'recording' | 'study' | 'idle' => {
    if (isRecording) return 'recording';
    if (sessionId) return 'study';
    return 'idle';
  }, [isRecording, sessionId]);

  // Load persisted messages when session changes or drawer opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: Load messages when chatHistory or sessionId changes
  useEffect(() => {
    if (chatHistory?.messages) {
      setMessages(
        chatHistory.messages.map(
          (m: { role: string; content: string; timestamp: number }, i: number) => ({
            id: `${m.role}-${m.timestamp}-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp,
          }),
        ),
      );
    } else {
      setMessages([]);
    }
  }, [chatHistory, sessionId]);

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
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Persist messages to Convex
  const persistMessages = useCallback(
    async (updatedMessages: ChatMessage[]) => {
      if (!sessionId) return;
      try {
        await saveChatHistory({
          sessionId: sessionId as Id<'sessions'>,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        });
      } catch {
        // Silently fail — chat still works locally
      }
    },
    [sessionId, saveChatHistory],
  );

  // Send message
  const sendMessage = useCallback(
    async (messageText?: string) => {
      const text = messageText || input.trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
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
            lectureType,
            nuggetNotes: includeNotes ? nuggetNotes : undefined,
          }),
        });

        const responseData = await response.json();

        if (responseData.success && responseData.response) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: responseData.response,
            timestamp: Date.now(),
          };
          const withResponse = [...updatedMessages, assistantMessage];
          setMessages(withResponse);
          await persistMessages(withResponse);
        } else {
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I had trouble responding. Please try again!',
            timestamp: Date.now(),
          };
          const withError = [...updatedMessages, errorMsg];
          setMessages(withError);
        }
      } catch (err) {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Meow! Something went wrong. Please check your connection and try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      messages,
      transcript,
      notes,
      includeTranscript,
      includeNotes,
      lectureType,
      nuggetNotes,
      getApiUrl,
      persistMessages,
    ],
  );

  // Handle input keydown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            onKeyDown={(e) => e.key === 'Enter' && onOpenChange(false)}
            role="button"
            tabIndex={0}
            aria-label="Close chat"
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-heavy border-l border-[var(--glass-border)] shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <Cat className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Chat with Nugget</span>
                {chatMode === 'recording' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--record)]/20 text-[var(--record)]">
                    LIVE
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <WelcomeMessage chatMode={chatMode} onSuggestionClick={sendMessage} />
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && <TypingIndicator />}
                </div>
              )}
            </div>

            {/* Context checkboxes */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--glass-border)] text-xs text-muted-foreground">
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
            <div className="flex items-end gap-2 p-4 border-t border-[var(--glass-border)]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  chatMode === 'recording'
                    ? "Ask about what's being discussed..."
                    : 'Ask Nugget about your lecture...'
                }
                className="flex-1 resize-none rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-light)] backdrop-blur-[var(--glass-blur-light)] px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => sendMessage()}
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

// Typing indicator with animated dots
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 glass-light rounded-2xl rounded-bl-md px-4 py-3">
        <Cat className="h-3.5 w-3.5 text-primary" />
        <div className="flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// Context-aware welcome message
function WelcomeMessage({
  chatMode,
  onSuggestionClick,
}: {
  chatMode: 'recording' | 'study' | 'idle';
  onSuggestionClick: (text: string) => void;
}) {
  const config = {
    recording: {
      greeting: "I'm here while you record!",
      description:
        'Ask me about anything that comes up in your lecture. I can see your transcript and notes in real-time.',
      suggestions: [
        'What was just discussed?',
        'Can you clarify that last point?',
        'How does this connect to earlier topics?',
      ],
    },
    study: {
      greeting: "Let's review together!",
      description:
        'I can help you understand tricky parts, summarize sections, or quiz you on the material.',
      suggestions: [
        'Summarize the main points',
        'What are the key concepts?',
        'Quiz me on this material',
      ],
    },
    idle: {
      greeting: "Hey there! I'm Nugget",
      description:
        "Start a recording or select a session from Study Mode, and I'll help you understand the content!",
      suggestions: ['What can you help me with?', 'How do I get started?'],
    },
  };

  const { greeting, description, suggestions } = config[chatMode];

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <Cat className="h-16 w-16 text-primary mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{greeting}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      <div className="flex flex-col gap-2 mt-6 text-sm">
        <p className="text-muted-foreground">Try asking:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((text) => (
            <SuggestionChip key={text} text={text} onClick={onSuggestionClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Suggestion chip component
function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      className="inline-flex px-2.5 py-1 rounded-full glass-light text-muted-foreground text-xs hover:bg-[var(--glass-bg)] cursor-pointer transition-colors"
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
}

// Relative time formatter
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Lightweight markdown renderer for assistant messages
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let codeBlock = false;
  let codeContent: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="my-1.5 rounded-md bg-black/20 px-3 py-2 text-xs font-mono overflow-x-auto"
          >
            <code>{codeContent.join('\n')}</code>
          </pre>,
        );
        codeContent = [];
        codeBlock = false;
      } else {
        codeBlock = true;
      }
      continue;
    }

    if (codeBlock) {
      codeContent.push(line);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <p key={`h3-${i}`} className="font-semibold text-sm mt-2 mb-1">
          {renderInline(line.slice(4))}
        </p>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <p key={`h2-${i}`} className="font-semibold text-sm mt-2 mb-1">
          {renderInline(line.slice(3))}
        </p>,
      );
      continue;
    }

    // Bullet list items
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-1.5 ml-1">
          <span className="text-muted-foreground shrink-0">&#8226;</span>
          <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>,
      );
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^(\d+)[.)]\s/);
    if (numberedMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex gap-1.5 ml-1">
          <span className="text-muted-foreground shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInline(line.replace(/^\d+[.)]\s/, ''))}</span>
        </div>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
  }

  // Handle unclosed code block
  if (codeBlock && codeContent.length > 0) {
    elements.push(
      <pre
        key={`code-${codeKey}`}
        className="my-1.5 rounded-md bg-black/20 px-3 py-2 text-xs font-mono overflow-x-auto"
      >
        <code>{codeContent.join('\n')}</code>
      </pre>,
    );
  }

  return elements;
}

// Render inline markdown: bold, italic, inline code
function renderInline(text: string): React.ReactNode {
  // Split on inline patterns: **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code (backtick)
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        <code key={`ic-${key++}`} className="px-1 py-0.5 rounded bg-black/15 text-xs font-mono">
          {codeMatch[2]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {boldMatch[2]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={`i-${key++}`}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // No more matches, push rest
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : parts;
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'glass-light text-foreground rounded-bl-md'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <Cat className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Nugget</span>
          </div>
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed space-y-0.5">
            {renderMarkdown(message.content)}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-right">
          {formatRelativeTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default NuggetChat;
