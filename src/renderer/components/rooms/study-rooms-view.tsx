import { RoomList } from '@/components/rooms/room-list';
import { RoomView } from '@/components/rooms/room-view';
import { useStudyRooms } from '@/hooks/use-study-rooms';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { Monitor } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';

export function StudyRoomsView() {
  const navigate = useNavigate();
  const { rooms, isLoading } = useStudyRooms();

  const roomMatch = useMatch({ from: '/rooms/$roomId', shouldThrow: false });
  const selectedId = (roomMatch?.params.roomId ?? null) as Id<'studyRooms'> | null;

  const handleSelect = (roomId: Id<'studyRooms'>) => {
    navigate({ to: '/rooms/$roomId', params: { roomId } });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3 p-3">
      {/* Room list (sidebar) */}
      <div className="w-72 shrink-0 rounded-xl glass overflow-hidden">
        <RoomList rooms={rooms} selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* Active room */}
      <div className="flex-1 rounded-xl glass overflow-hidden min-w-0">
        {selectedId ? (
          <RoomView roomId={selectedId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Monitor className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Select a study room</p>
              <p className="text-xs text-muted-foreground">Or create one to study with friends</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
