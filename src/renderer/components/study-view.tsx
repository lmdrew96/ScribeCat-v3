import { FileUploadTranscribe } from '@/components/file-upload-transcribe';
import { ShareSessionModal } from '@/components/messages/share-session-modal';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type SessionId = Id<'sessions'>;

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface SessionSummary {
  id: string;
  title: string;
  date: string;
  duration: string;
  lectureType?: string;
  course?: string;
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
  course?: string;
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
  const [shareSessionId, setShareSessionId] = useState<string | null>(null);

  // Read session ID from route params (undefined when on /study)
  const sessionMatch = useMatch({ from: '/study/$sessionId', shouldThrow: false });
  const selectedId = sessionMatch?.params.sessionId ?? null;

  const { isRecording } = useSessionContext();
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Sync selected session to context for NuggetChat — but only when not recording,
  // since recording context owns activeSessionId during a recording
  useEffect(() => {
    if (isRecording) return;
    setActiveSessionId(selectedId as SessionId | null);
    setNuggetNotes([]);
  }, [selectedId, setActiveSessionId, setNuggetNotes, isRecording]);

  // Clear context on unmount — but only if not recording
  useEffect(() => {
    return () => {
      if (!isRecordingRef.current) {
        setActiveSessionId(null);
      }
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
    (recording: SessionSummary) => {
      navigate({ to: '/study/$sessionId', params: { sessionId: recording.id } });
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile, navigate],
  );

  // Fetch full session data for the selected recording only
  // (sessions.get joins notes from the separate sessionNotes table)
  const fullSession = useSession(selectedId as SessionId | null);
  const audioUrl = useQuery(
    api.audioStorage.getAudioUrl,
    fullSession?.audioStorageId ? { storageId: fullSession.audioStorageId } : 'skip',
  );

  // Sidebar gets lightweight metadata only — no transcript/notes/segments
  const sidebarRecordings: SessionSummary[] = sessions.map((session) => ({
    id: session._id,
    title: session.title,
    date: new Date(session.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    duration: formatDuration(session.duration),
    lectureType: session.lectureType,
    course: session.course,
  }));

  const trashedRecordings: SessionSummary[] = trashedSessions.map((session) => ({
    id: session._id,
    title: session.title,
    date: new Date(session.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    duration: formatDuration(session.duration),
    lectureType: session.lectureType,
    course: session.course,
  }));

  // Build full Recording for StudyContent from sessions.get result
  const selectedRecording: Recording | null = fullSession
    ? {
        id: fullSession._id,
        title: fullSession.title,
        date: new Date(fullSession.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        duration: formatDuration(fullSession.duration),
        transcript: fullSession.transcript || '',
        notes: fullSession.notes || '',
        audioUrl: audioUrl,
        audioStorageId: fullSession.audioStorageId,
        transcriptSegments: fullSession.transcriptSegments,
        lectureType: fullSession.lectureType,
        course: fullSession.course,
        nuggetNotes: fullSession.nuggetNotes,
      }
    : null;

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
            recordings={sidebarRecordings}
            trashedRecordings={trashedRecordings}
            selectedId={selectedRecording?.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onShare={(id) => setShareSessionId(id)}
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

      <ShareSessionModal
        open={!!shareSessionId}
        onOpenChange={(open) => !open && setShareSessionId(null)}
        sessionId={shareSessionId as Id<'sessions'> | null}
      />
    </div>
  );
}
