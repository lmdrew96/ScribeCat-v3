import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExamRoomActions } from '@/hooks/use-exam-room';
import { useSessions } from '@/hooks/use-sessions';
import { Clock, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamSessionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examRoomId: Id<'examRooms'>;
  existingSessionIds: Id<'sessions'>[];
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  return `${mins} min`;
}

export function ExamSessionPicker({
  open,
  onOpenChange,
  examRoomId,
  existingSessionIds,
}: ExamSessionPickerProps) {
  const { sessions } = useSessions();
  const { addSession } = useExamRoomActions();

  const existingSet = new Set(existingSessionIds);
  const availableSessions = sessions.filter((s) => !existingSet.has(s._id));

  const handleAdd = async (sessionId: Id<'sessions'>) => {
    try {
      await addSession({ examRoomId, sessionId });
      toast.success('Session added to exam room');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add session');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle>Add Sessions</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto space-y-2 pt-2" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          {availableSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-foreground">No more sessions to add</p>
              <p className="text-xs text-muted-foreground mt-1">
                All your sessions with content are already in this exam room
              </p>
            </div>
          ) : (
            availableSessions.map((session) => (
              <div
                key={session._id}
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
                    <span>
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => void handleAdd(session._id)}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
