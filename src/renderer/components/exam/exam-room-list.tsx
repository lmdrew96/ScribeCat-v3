import { CreateExamRoomModal } from '@/components/exam/create-exam-room-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpenCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamRoomItem {
  examRoomId: Id<'examRooms'>;
  name: string;
  status: string;
  examDate?: number;
  hasJoined: boolean;
  memberCount: number;
  sessionCount: number;
  host: {
    userId: string;
    displayName: string;
    username: string;
  };
  createdAt: number;
}

interface ExamRoomListProps {
  rooms: (ExamRoomItem | null)[];
  selectedId: Id<'examRooms'> | null;
  onSelect: (examRoomId: Id<'examRooms'>) => void;
}

function formatExamDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days}d away`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ExamRoomList({ rooms, selectedId, onSelect }: ExamRoomListProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const validRooms = rooms.filter(Boolean) as ExamRoomItem[];

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Exam Rooms</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreateOpen(true)}
          title="Create exam room"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(100% - 49px)' }}>
        {validRooms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
            <p className="text-sm font-medium text-foreground">No exam rooms</p>
            <p className="text-xs text-muted-foreground text-center">
              Create one to start exam prep!
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {validRooms.map((room) => (
              <button
                type="button"
                key={room.examRoomId}
                onClick={() => onSelect(room.examRoomId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                  selectedId === room.examRoomId
                    ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                    : 'hover:bg-[var(--glass-bg-light)]',
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)] shrink-0">
                  <BookOpenCheck className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
                    {!room.hasJoined && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {room.sessionCount} session{room.sessionCount !== 1 ? 's' : ''}
                    {room.examDate ? ` · ${formatExamDate(room.examDate)}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateExamRoomModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
