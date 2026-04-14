import { RoomList } from '@/components/rooms/room-list';
import { RoomView } from '@/components/rooms/room-view';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useStudyRooms } from '@/hooks/use-study-rooms';
import { cn } from '@/lib/utils';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { Monitor, PanelLeft } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

export function StudyRoomsView() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { rooms, isLoading } = useStudyRooms();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const roomMatch = useMatch({ from: '/rooms/$roomId', shouldThrow: false });
  const selectedId = (roomMatch?.params.roomId ?? null) as Id<'studyRooms'> | null;

  const handleSelect = (roomId: Id<'studyRooms'>) => {
    navigate({ to: '/rooms/$roomId', params: { roomId } });
    if (isMobile) setSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
            'w-72 shrink-0 rounded-xl glass overflow-hidden',
            isMobile && 'fixed left-0 top-[4.5rem] bottom-0 z-30 glass-heavy rounded-l-none',
          )}
        >
          <RoomList
            rooms={rooms.filter((r): r is NonNullable<typeof r> => r != null)}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Active room */}
      <div className="flex-1 rounded-xl glass overflow-hidden min-w-0">
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
