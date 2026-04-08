import { AudioDeletionWarning } from '@/components/audio-deletion-warning';
import { MiniRecordingIndicator } from '@/components/mini-recording-indicator';
import { NuggetChat } from '@/components/nugget-chat';
import { RecordingNavigationGuard } from '@/components/recording-navigation-guard';
import { StudyQuestWidget } from '@/components/study-quest/study-quest-widget';
import { TopBar } from '@/components/top-bar';
import { TosAcceptanceModal } from '@/components/tos-acceptance-modal';
import { RecordingProvider } from '@/contexts/recording-context';
import { useSessionContext } from '@/contexts/session-context';
import { useNotificationWatcher } from '@/hooks/use-notification-watcher';
import { usePresence } from '@/hooks/use-presence';
import { useSessionKeepAlive } from '@/hooks/use-session-keep-alive';
import { useSession } from '@/hooks/use-sessions';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { Outlet } from '@tanstack/react-router';

export function AppLayout() {
  useNotificationWatcher();
  usePresence();
  const { activeSessionId, nuggetNotes, isRecording, chatOpen, setChatOpen } = useSessionContext();
  useWakeLock(isRecording);
  useSessionKeepAlive(isRecording);

  const session = useSession(activeSessionId);

  const nuggetNotesText =
    nuggetNotes.length > 0 ? nuggetNotes.map((n) => `- ${n.text}`).join('\n') : undefined;

  return (
    <RecordingProvider>
      <div className="app-bg-orbs flex h-screen flex-col">
        <TopBar />
        <main className="relative z-10 flex-1 overflow-hidden">
          <AudioDeletionWarning />
          <Outlet />
          <MiniRecordingIndicator />
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
        <RecordingNavigationGuard />
        <TosAcceptanceModal />
      </div>
    </RecordingProvider>
  );
}
