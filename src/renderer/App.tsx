import { HomeView } from '@/components/home-view';
import { NuggetChat } from '@/components/nugget-chat';
import { StudyView } from '@/components/study-view';
import { TopBar } from '@/components/top-bar';
import type { NuggetNote } from '@/hooks/use-nugget-notes';
import { useSession } from '@/hooks/use-sessions';
import { SignIn } from '@clerk/clerk-react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { useCallback, useState } from 'react';
import { Toaster } from 'sonner';
import type { Id } from '../../convex/_generated/dataModel';

function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState<'home' | 'study'>('home');
  const [activeSessionId, setActiveSessionId] = useState<Id<'sessions'> | null>(null);
  const [nuggetNotes, setNuggetNotes] = useState<NuggetNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Reactively get session data for NuggetChat
  const session = useSession(activeSessionId);

  // Format Nugget Notes as a string summary for the chat context
  const nuggetNotesText =
    nuggetNotes.length > 0 ? nuggetNotes.map((n) => `- ${n.text}`).join('\n') : undefined;

  const handleHomeSessionChange = useCallback((sessionId: Id<'sessions'> | null) => {
    setActiveSessionId(sessionId);
  }, []);

  const handleStudySessionChange = useCallback((sessionId: Id<'sessions'> | null) => {
    setActiveSessionId(sessionId);
    // Clear nugget notes when switching to study view sessions (they're ephemeral)
    setNuggetNotes([]);
  }, []);

  const handleNuggetNotesChange = useCallback((notes: NuggetNote[]) => {
    setNuggetNotes(notes);
  }, []);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  return (
    <div className="app-bg-orbs flex h-screen flex-col">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <main className="relative z-10 flex-1 overflow-hidden">
        {currentView === 'home' ? (
          <HomeView
            onSessionChange={handleHomeSessionChange}
            onNuggetNotesChange={handleNuggetNotesChange}
            onRecordingStateChange={handleRecordingStateChange}
          />
        ) : (
          <StudyView onSessionChange={handleStudySessionChange} />
        )}
      </main>

      {/* Nugget Chat — always available */}
      <NuggetChat
        transcript={session?.transcript}
        notes={session?.notes}
        sessionId={activeSessionId ?? undefined}
        lectureType={session?.lectureType}
        nuggetNotes={nuggetNotesText}
        isRecording={currentView === 'home' && isRecording}
      />
    </div>
  );
}

export function App() {
  return (
    <>
      <AuthLoading>
        <div className="app-bg-orbs flex h-screen items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="app-bg-orbs flex h-screen items-center justify-center">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedApp />
        <Toaster position="top-right" richColors closeButton />
      </Authenticated>
    </>
  );
}
