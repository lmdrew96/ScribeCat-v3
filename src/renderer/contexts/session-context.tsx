import type { NuggetNote } from '@/hooks/use-nugget-notes';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

interface SessionContextValue {
  /** The currently active session ID (from either recording or study) */
  activeSessionId: Id<'sessions'> | null;
  setActiveSessionId: (id: Id<'sessions'> | null) => void;

  /** Nugget notes generated during recording (ephemeral) */
  nuggetNotes: NuggetNote[];
  setNuggetNotes: (notes: NuggetNote[]) => void;

  /** Whether a recording is in progress */
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;

  /** Chat drawer open/close state */
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<Id<'sessions'> | null>(null);
  const [nuggetNotes, setNuggetNotes] = useState<NuggetNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const stableSetActiveSessionId = useCallback(
    (id: Id<'sessions'> | null) => setActiveSessionId(id),
    [],
  );
  const stableSetNuggetNotes = useCallback((notes: NuggetNote[]) => setNuggetNotes(notes), []);
  const stableSetIsRecording = useCallback((recording: boolean) => setIsRecording(recording), []);
  const stableSetChatOpen = useCallback((open: boolean) => setChatOpen(open), []);

  const value = useMemo(
    () => ({
      activeSessionId,
      setActiveSessionId: stableSetActiveSessionId,
      nuggetNotes,
      setNuggetNotes: stableSetNuggetNotes,
      isRecording,
      setIsRecording: stableSetIsRecording,
      chatOpen,
      setChatOpen: stableSetChatOpen,
    }),
    [
      activeSessionId,
      stableSetActiveSessionId,
      nuggetNotes,
      stableSetNuggetNotes,
      isRecording,
      stableSetIsRecording,
      chatOpen,
      stableSetChatOpen,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return ctx;
}
