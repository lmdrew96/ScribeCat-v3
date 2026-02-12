import { FileUploadTranscribe } from '@/components/file-upload-transcribe';
import { NuggetChat } from '@/components/nugget-chat';
import { RecordingsSidebar } from '@/components/recordings-sidebar';
import { StudyContent } from '@/components/study-content';
import { StudyTools } from '@/components/study-tools/index';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSessions } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';
import { useQuery } from 'convex/react';
import { PanelLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

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
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function StudyView() {
  const isMobile = useIsMobile();
  const { sessions } = useSessions();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Auto-close sidebar on mobile when selecting a recording
  const handleSelect = useCallback(
    (recording: Recording) => {
      setSelectedRecording(recording);
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile],
  );

  // Resolve audio URL for the selected recording
  const selectedSession = sessions.find((s) => s._id === selectedRecording?.id);
  const audioUrl = useQuery(
    api.audioStorage.getAudioUrl,
    selectedSession?.audioStorageId ? { storageId: selectedSession.audioStorageId } : 'skip',
  );

  // Convert Convex sessions to Recording format
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
    notes: session.notes || '',
    audioStorageId: session.audioStorageId,
    audioUrl: session._id === selectedRecording?.id ? audioUrl : undefined,
    transcriptSegments: session.transcriptSegments,
    lectureType: session.lectureType,
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
            selectedId={selectedRecording?.id}
            onSelect={handleSelect}
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
            className="absolute left-2 top-14 z-10 h-7 w-7"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {selectedRecording ? (
          <>
            <div className="flex-1 overflow-auto p-5">
              <StudyContent recording={selectedRecording} />
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

      {/* Nugget Chat - floating button + drawer */}
      <NuggetChat
        transcript={selectedRecording?.transcript}
        notes={selectedRecording?.notes}
        sessionId={selectedRecording?.id}
      />
    </div>
  );
}
