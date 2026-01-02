import { RecordingsSidebar } from '@/components/recordings-sidebar';
import { StudyContent } from '@/components/study-content';
import { StudyTools } from '@/components/study-tools';
import { Button } from '@/components/ui/button';
import { useSessions } from '@/hooks/use-sessions';
import { PanelLeft } from 'lucide-react';
import { useState } from 'react';

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
  audioFilePath?: string;
  transcriptSegments?: TranscriptSegment[];
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function StudyView() {
  const userId = 'anonymous-user'; // TODO: Get from authenticated user
  const { sessions } = useSessions(userId);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    audioFilePath: session.audioFilePath,
    transcriptSegments: session.transcriptSegments,
  }));

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full">
      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <div className="w-56 border-r border-border shrink-0">
          <RecordingsSidebar
            recordings={recordings}
            selectedId={selectedRecording?.id}
            onSelect={setSelectedRecording}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
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
            <div className="flex-1 overflow-auto p-3">
              <StudyContent recording={selectedRecording} />
            </div>
            <div className="border-t border-border">
              <StudyTools recording={selectedRecording} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h3 className="mb-1 text-sm font-medium text-foreground">Select a recording</h3>
              <p className="text-xs text-muted-foreground">Choose from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
