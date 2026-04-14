import { ExamRoomList } from '@/components/exam/exam-room-list';
import { ExamRoomView } from '@/components/exam/exam-room-view';
import { Button } from '@/components/ui/button';
import { useExamRooms } from '@/hooks/use-exam-room';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { GraduationCap, PanelLeft } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

export function ExamStudyView() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { rooms, isLoading } = useExamRooms();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const examMatch = useMatch({ from: '/exam/$examRoomId', shouldThrow: false });
  const selectedId = (examMatch?.params.examRoomId ?? null) as Id<'examRooms'> | null;

  const handleSelect = (examRoomId: Id<'examRooms'>) => {
    navigate({ to: '/exam/$examRoomId', params: { examRoomId } });
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
          <ExamRoomList rooms={rooms} selectedId={selectedId} onSelect={handleSelect} />
        </div>
      )}

      {/* Active exam room */}
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
          <ExamRoomView examRoomId={selectedId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Select an exam room</p>
              <p className="text-xs text-muted-foreground">
                Or create one to start studying for an exam
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
