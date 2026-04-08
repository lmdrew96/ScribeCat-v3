import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRoomActions } from '@/hooks/use-study-rooms';
import { cn } from '@/lib/utils';
import { Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface SessionItem {
  _id: Id<'sessions'>;
  title: string;
  createdAt: number;
  duration: number;
  lectureType?: string;
}

interface PinSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: Id<'studyRooms'>;
  sessions: SessionItem[];
  pinnedSessionId: Id<'sessions'> | null;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PinSessionModal({
  open,
  onOpenChange,
  roomId,
  sessions,
  pinnedSessionId,
}: PinSessionModalProps) {
  const { pinSession, unpinSession } = useRoomActions();

  const handlePin = async (sessionId: Id<'sessions'>) => {
    try {
      await pinSession({ roomId, sessionId });
      toast.success('Session pinned');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pin session';
      toast.error(message);
    }
  };

  const handleUnpin = async () => {
    try {
      await unpinSession({ roomId });
      toast.success('Session unpinned');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unpin session';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pin className="h-4 w-4" />
            Pin a Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {pinnedSessionId && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-xs h-auto py-2"
              onClick={() => void handleUnpin()}
            >
              <PinOff className="h-3.5 w-3.5 shrink-0" />
              Unpin current session
            </Button>
          )}

          <div className="max-h-[400px] overflow-y-auto space-y-1.5">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions to pin. Record a session first!
              </p>
            ) : (
              sessions.map((session) => {
                const isPinned = session._id === pinnedSessionId;
                return (
                  <button
                    type="button"
                    key={session._id}
                    onClick={() => !isPinned && void handlePin(session._id)}
                    disabled={isPinned}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      isPinned
                        ? 'border-accent bg-accent/10 cursor-default'
                        : 'border-[var(--glass-border)] glass-light hover:bg-[var(--glass-bg)] cursor-pointer',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' \u00b7 '}
                        {formatDuration(session.duration)}
                        {session.lectureType && ` \u00b7 ${session.lectureType}`}
                      </p>
                    </div>
                    {isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
