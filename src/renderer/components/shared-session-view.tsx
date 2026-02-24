import { StudyContent } from '@/components/study-content';
import { StudyTools } from '@/components/study-tools/index';
import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { useShareSession } from '@/hooks/use-session-sharing';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function SharedSessionView() {
  const navigate = useNavigate();
  const match = useMatch({ from: '/shared/$sessionId', shouldThrow: false });
  const sessionId = match?.params.sessionId as Id<'sessions'> | undefined;

  const session = useQuery(api.sessionSharing.getSharedSession, sessionId ? { sessionId } : 'skip');
  const audioUrl = useQuery(
    api.audioStorage.getAudioUrl,
    session?.audioStorageId ? { storageId: session.audioStorageId } : 'skip',
  );
  const { copyToLibrary } = useShareSession();

  const handleCopy = async () => {
    if (!sessionId) return;
    try {
      const newId = await copyToLibrary({ sessionId });
      toast.success('Session copied to your library');
      navigate({ to: '/study/$sessionId', params: { sessionId: newId } });
    } catch (error) {
      console.error('Error copying session:', error);
      toast.error('Failed to copy session');
    }
  };

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Session not found</p>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Session not found or no longer shared</p>
      </div>
    );
  }

  const recording: Recording = {
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
    audioUrl: audioUrl,
    audioStorageId: session.audioStorageId,
    transcriptSegments: session.transcriptSegments,
    lectureType: session.lectureType,
    nuggetNotes: session.nuggetNotes,
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Shared banner */}
      <div className="flex items-center justify-between rounded-xl glass p-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate({ to: '/messages' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <Share2 className="h-4 w-4 text-accent" />
            <span className="text-muted-foreground">
              Shared by{' '}
              <span className="font-medium text-foreground">@{session.owner.username}</span>
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => void handleCopy()}
        >
          <Copy className="h-3 w-3" />
          Copy to Library
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden rounded-xl glass flex flex-col min-h-0">
        <div className="flex-1 overflow-auto p-5">
          <StudyContent recording={recording} />
        </div>
        <div className="border-t border-[var(--glass-border)]">
          <StudyTools sessionId={session._id} />
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
