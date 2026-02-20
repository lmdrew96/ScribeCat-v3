import { NuggetChat } from '@/components/nugget-chat';
import { StudyQuestWidget } from '@/components/study-quest/study-quest-widget';
import { TopBar } from '@/components/top-bar';
import { useSessionContext } from '@/contexts/session-context';
import { useSession } from '@/hooks/use-sessions';
import { Outlet } from '@tanstack/react-router';

export function AppLayout() {
  const { activeSessionId, nuggetNotes, isRecording, chatOpen, setChatOpen } = useSessionContext();

  const session = useSession(activeSessionId);

  const nuggetNotesText =
    nuggetNotes.length > 0 ? nuggetNotes.map((n) => `- ${n.text}`).join('\n') : undefined;

  return (
    <div className="app-bg-orbs flex h-screen flex-col">
      <TopBar />
      <main className="relative z-10 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <NuggetChat
        transcript={session?.transcript}
        notes={session?.notes}
        sessionId={activeSessionId ?? undefined}
        lectureType={session?.lectureType}
        nuggetNotes={nuggetNotesText}
        isRecording={isRecording}
        isOpen={chatOpen}
        onOpenChange={setChatOpen}
      />
      <StudyQuestWidget />
    </div>
  );
}
