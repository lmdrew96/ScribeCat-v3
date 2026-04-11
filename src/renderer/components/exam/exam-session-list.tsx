import { Button } from '@/components/ui/button';
import { useExamRoomActions } from '@/hooks/use-exam-room';
import { CheckCircle, Clock, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamSession {
  linkId: Id<'examRoomSessions'>;
  sessionId: Id<'sessions'>;
  title: string;
  course?: string;
  duration: number;
  lectureType?: string;
  addedBy: string;
  addedByUserId: string;
  addedAt: number;
  hasTopicIndex: boolean;
}

interface ExamSessionListProps {
  examRoomId: Id<'examRooms'>;
  sessions: ExamSession[];
  isHost: boolean;
  currentUserId: string;
  isArchived: boolean;
  onAddSession: () => void;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  return `${mins} min`;
}

export function ExamSessionList({
  examRoomId,
  sessions,
  isHost,
  currentUserId,
  isArchived,
  onAddSession,
}: ExamSessionListProps) {
  const { removeSession } = useExamRoomActions();

  const handleRemove = async (sessionId: Id<'sessions'>) => {
    try {
      await removeSession({ examRoomId, sessionId });
      toast.success('Session removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Sessions</h3>
          <p className="text-xs text-muted-foreground">
            Lectures loaded into this exam room for review
          </p>
        </div>
        {!isArchived && (
          <Button variant="secondary" size="sm" className="gap-1 text-xs" onClick={onAddSession}>
            <Plus className="h-3 w-3" />
            Add Session
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <FileText className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No sessions added yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your lecture recordings to start studying
            </p>
          </div>
          {!isArchived && (
            <Button variant="secondary" size="sm" className="gap-1" onClick={onAddSession}>
              <Plus className="h-3 w-3" />
              Add Your First Session
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.linkId}
              className="flex items-center gap-3 rounded-lg p-3 glass-light border border-[var(--glass-border)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--glass-bg)] shrink-0">
                <FileText className="h-4 w-4 text-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {session.course && <span>{session.course}</span>}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDuration(session.duration)}
                  </span>
                  <span>Added by {session.addedBy}</span>
                </div>
              </div>

              {/* Brain index status */}
              <div className="shrink-0" title={session.hasTopicIndex ? 'Indexed' : 'Indexing...'}>
                {session.hasTopicIndex ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>

              {/* Remove button */}
              {!isArchived && (isHost || session.addedByUserId === currentUserId) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleRemove(session.sessionId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
