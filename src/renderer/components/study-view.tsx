import { FileUploadTranscribe } from '@/components/file-upload-transcribe';
import { RecordingsSidebar } from '@/components/recordings-sidebar';
import { StudyContent } from '@/components/study-content';
import { StudyTools } from '@/components/study-tools/index';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/session-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSession, useSessions, useTrash } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { PanelLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type SessionId = Id<'sessions'>;

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface Recording {
  id: string;
  title: string;
  date: string;
  duration: string;
  transcript: string;
  notes: string;
  audioUrl?: string | null;
  audioStorageId?: string;
  transcriptSegments?: TranscriptSegment[];
  lectureType?: string;
  nuggetNotes?: { text: string; recordingTime: number }[];
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function StudyView() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { setActiveSessionId, setNuggetNotes } = useSessionContext();
  const { sessions, deleteSession, restoreSession, permanentDeleteSession } = useSessions();
  const trashedSessions = useTrash();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Read session ID from route params (undefined when on /study)
  const sessionMatch = useMatch({ from: '/study/$sessionId', shouldThrow: false });
  const selectedId = sessionMatch?.params.sessionId ?? null;

  // Sync selected session to context for NuggetChat
  useEffect(() => {
    setActiveSessionId(selectedId as SessionId | null);
    setNuggetNotes([]);
  }, [selectedId, setActiveSessionId, setNuggetNotes]);

  // Clear context on unmount
  useEffect(() => {
    return () => {
      setActiveSessionId(null);
    };
  }, [setActiveSessionId]);

  const handleDelete = useCallback(
    (recordingId: string) => {
      deleteSession({ id: recordingId as SessionId });
      if (selectedId === recordingId) {
        navigate({ to: '/study' });
      }
    },
    [deleteSession, selectedId, navigate],
  );

  const handleRestore = useCallback(
    (recordingId: string) => {
      restoreSession({ id: recordingId as SessionId });
    },
    [restoreSession],
  );

  const handlePermanentDelete = useCallback(
    (recordingId: string) => {
      permanentDeleteSession({ id: recordingId as SessionId });
    },
    [permanentDeleteSession],
  );

  // Navigate to session route instead of local state
  const handleSelect = useCallback(
    (recording: Recording) => {
      navigate({ to: '/study/$sessionId', params: { sessionId: recording.id } });
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile, navigate],
  );

  // Resolve audio URL for the selected recording
  const selectedSession = sessions.find((s) => s._id === selectedId);
  const audioUrl = useQuery(
    api.audioStorage.getAudioUrl,
    selectedSession?.audioStorageId ? { storageId: selectedSession.audioStorageId } : 'skip',
  );

  // Fetch full session data with notes for the selected recording
  // (sessions.get joins notes from the separate sessionNotes table)
  const selectedSessionWithNotes = useSession(selectedId as SessionId | null);

  // Convert Convex sessions to Recording format (notes loaded separately for selected only)
  const recordings: Recording[] = sessions.map((session) => ({
    id: session._id,
    title: session.title,
    date: new Date(session.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    duration: formatDuration(session.duration),
    transcript: session.transcript || '',
    notes: '',
    audioStorageId: session.audioStorageId,
    audioUrl: session._id === selectedId ? audioUrl : undefined,
    transcriptSegments: session.transcriptSegments,
    lectureType: session.lectureType,
    nuggetNotes: session.nuggetNotes,
  }));

  // Build selected recording with notes from joined query
  const baseRecording = recordings.find((r) => r.id === selectedId);
  const selectedRecording = baseRecording
    ? { ...baseRecording, notes: selectedSessionWithNotes?.notes || '' }
    : null;

  const trashedRecordings: Recording[] = trashedSessions.map((session) => ({
    id: session._id,
    title: session.title,
    date: new Date(session.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    duration: formatDuration(session.duration),
    transcript: session.transcript || '',
    notes: '',
    lectureType: session.lectureType,
    nuggetNotes: session.nuggetNotes,
  }));

  return (
    <div className="flex h-full relative gap-3 p-3">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => {}}
          role="presentation"
        />
      )}

      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <div
          className={cn(
            'w-60 rounded-xl glass shrink-0 overflow-hidden',
            isMobile && 'fixed left-0 top-[4.5rem] bottom-0 z-30 glass-heavy rounded-l-none',
          )}
        >
          <RecordingsSidebar
            recordings={recordings}
            trashedRecordings={trashedRecordings}
            selectedId={selectedRecording?.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 rounded-xl glass">
        {/* Collapse toggle when sidebar is hidden */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-5 top-[1.6rem] z-10 h-7 w-7"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {selectedRecording ? (
          <>
            <div className="flex-1 overflow-auto p-5">
              <StudyContent recording={selectedRecording} sidebarCollapsed={!sidebarOpen} />
            </div>
            <div className="border-t border-[var(--glass-border)]">
              <StudyTools sessionId={selectedRecording.id as Id<'sessions'>} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Select a recording</h3>
                <p className="text-xs text-muted-foreground">Choose from the sidebar</p>
              </div>
              <div className="max-w-xs mx-auto">
                <FileUploadTranscribe />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
