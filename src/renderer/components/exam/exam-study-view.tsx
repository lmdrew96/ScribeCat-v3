import { ExamRoomList } from '@/components/exam/exam-room-list';
import { ExamRoomView } from '@/components/exam/exam-room-view';
import { useExamRooms } from '@/hooks/use-exam-room';
import { useMatch, useNavigate } from '@tanstack/react-router';
import { GraduationCap } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';

export function ExamStudyView() {
  const navigate = useNavigate();
  const { rooms, isLoading } = useExamRooms();

  const examMatch = useMatch({ from: '/exam/$examRoomId', shouldThrow: false });
  const selectedId = (examMatch?.params.examRoomId ?? null) as Id<'examRooms'> | null;

  const handleSelect = (examRoomId: Id<'examRooms'>) => {
    navigate({ to: '/exam/$examRoomId', params: { examRoomId } });
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
      {/* Exam room list (sidebar) */}
      <div className="w-72 shrink-0 rounded-xl glass overflow-hidden">
        <ExamRoomList rooms={rooms} selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* Active exam room */}
      <div className="flex-1 rounded-xl glass overflow-hidden min-w-0">
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
