import { CreateRoomModal } from '@/components/rooms/create-room-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface RoomItem {
  roomId: Id<'studyRooms'>;
  name: string;
  hasJoined: boolean;
  memberCount: number;
  host: {
    userId: string;
    displayName: string;
    username: string;
    catVariant: string | null;
  };
  createdAt: number;
}

interface RoomListProps {
  rooms: RoomItem[];
  selectedId: Id<'studyRooms'> | null;
  onSelect: (roomId: Id<'studyRooms'>) => void;
}

export function RoomList({ rooms, selectedId, onSelect }: RoomListProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Study Rooms</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreateOpen(true)}
          title="Create room"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-y-auto" style={{ height: 'calc(100% - 49px)' }}>
        {rooms.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
            <p className="text-sm font-medium text-foreground">No active rooms</p>
            <p className="text-xs text-muted-foreground text-center">
              Create one to study with friends!
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {rooms.map((room) => (
              <button
                type="button"
                key={room.roomId}
                onClick={() => onSelect(room.roomId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
                  selectedId === room.roomId
                    ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                    : 'hover:bg-[var(--glass-bg-light)]',
                )}
              >
                {/* Room icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)] shrink-0">
                  <Users className="h-4 w-4 text-foreground" />
                </div>

                {/* Room info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
                    {!room.hasJoined && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {room.host.displayName} &middot; {room.memberCount} member
                    {room.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateRoomModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
