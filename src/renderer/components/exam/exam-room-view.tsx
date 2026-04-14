import { DocumentUpload } from '@/components/document-upload';
import { EditExamRoomModal } from '@/components/exam/edit-exam-room-modal';
import { ExamChat } from '@/components/exam/exam-chat';
import { ExamInviteModal } from '@/components/exam/exam-invite-modal';
import { ExamSessionList } from '@/components/exam/exam-session-list';
import { ExamSessionPicker } from '@/components/exam/exam-session-picker';
import { ExamSimulation } from '@/components/exam/exam-simulation';
import { ExamTools } from '@/components/exam/exam-tools';
import { WeakSpotsPanel } from '@/components/exam/weak-spots-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useExamRoom,
  useExamRoomActions,
  useExamRoomHeartbeat,
  useExamRoomSessions,
} from '@/hooks/use-exam-room';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import {
  Archive,
  BookOpenCheck,
  Brain,
  Cat,
  FileText,
  GraduationCap,
  LogOut,
  Pencil,
  Plus,
  Target,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamRoomViewProps {
  examRoomId: Id<'examRooms'>;
}

type ExamTab = 'sessions' | 'tools' | 'simulation' | 'chat' | 'weakSpots';

function formatCountdown(examDate: number): string {
  const now = Date.now();
  // examDate is stored as midnight (start of day). The exam day itself
  // isn't "passed" until the end of that day (11:59:59 PM).
  const endOfExamDay = examDate + 24 * 60 * 60 * 1000 - 1;
  if (now > endOfExamDay) return 'Exam day has passed';

  // If we're ON the exam day (past midnight but before end of day)
  if (now >= examDate) return 'Exam day is today!';

  const diff = examDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h until exam`;
  if (hours > 0) return `${hours}h ${minutes}m until exam`;
  return `${minutes}m until exam`;
}

export function ExamRoomView({ examRoomId }: ExamRoomViewProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const currentUserId = user?.id ?? '';

  const { room, isLoading: roomLoading } = useExamRoom(examRoomId);
  const { sessions } = useExamRoomSessions(examRoomId);
  const { joinExamRoom, leaveExamRoom, archiveExamRoom, addSession } = useExamRoomActions();

  useExamRoomHeartbeat(examRoomId);

  const [activeTab, setActiveTab] = useState<ExamTab>('sessions');
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  if (roomLoading || !room) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading exam room...</p>
      </div>
    );
  }

  const isHost = room.hostUserId === currentUserId;
  const currentMember = room.members.find((m) => m.userId === currentUserId);
  const hasJoined = currentMember?.hasJoined ?? false;
  const onlineCount = room.members.filter((m) => m.isOnline).length;
  const isArchived = room.status === 'archived';

  const handleJoin = async () => {
    try {
      await joinExamRoom({ examRoomId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveExamRoom({ examRoomId });
      toast.success(isHost ? 'Exam room closed' : 'Left exam room');
      navigate({ to: '/exam' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveExamRoom({ examRoomId });
      toast.success('Exam room archived');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive');
    }
  };

  const tabs: { key: ExamTab; label: string; icon: typeof FileText }[] = [
    { key: 'sessions', label: 'Sessions', icon: FileText },
    { key: 'tools', label: 'Study Tools', icon: Brain },
    { key: 'simulation', label: 'Exam Sim', icon: GraduationCap },
    { key: 'chat', label: 'Nugget', icon: Cat },
    { key: 'weakSpots', label: 'Weak Spots', icon: Target },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Join banner */}
      {!hasJoined && (
        <div className="flex items-center justify-between border-b border-accent/30 bg-accent/10 px-4 py-2">
          <p className="text-xs text-foreground">You&apos;ve been invited to this exam room!</p>
          <Button size="sm" className="h-7 text-xs" onClick={() => void handleJoin()}>
            Join
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg)] shrink-0">
            <BookOpenCheck className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              {' · '}
              {onlineCount} online
              {' · '}
              {room.members.length} member{room.members.length !== 1 ? 's' : ''}
              {room.examDate ? ` · ${formatCountdown(room.examDate)}` : ''}
              {isArchived && <span className="ml-1 text-yellow-500 font-medium">· Archived</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isArchived && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setSessionPickerOpen(true)}
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Add Session</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="h-3 w-3" />
                <span className="hidden sm:inline">Upload Doc</span>
              </Button>
              {isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Pencil className="h-3 w-3" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setInviteModalOpen(true)}
                >
                  <UserPlus className="h-3 w-3" />
                  <span className="hidden sm:inline">Invite</span>
                </Button>
              )}
              {isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => void handleArchive()}
                >
                  <Archive className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={() => void handleLeave()}
          >
            {isHost ? <X className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
            <span className="hidden sm:inline">{isHost ? 'Close' : 'Leave'}</span>
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-[var(--glass-border)] glass-light overflow-x-auto">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap',
              activeTab === tab.key
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0">
        {activeTab === 'sessions' && (
          <ExamSessionList
            examRoomId={examRoomId}
            sessions={sessions}
            isHost={isHost}
            currentUserId={currentUserId}
            isArchived={isArchived}
            onAddSession={() => setSessionPickerOpen(true)}
          />
        )}
        {activeTab === 'tools' && (
          <ExamTools examRoomId={examRoomId} sessionCount={sessions.length} />
        )}
        {activeTab === 'simulation' && (
          <ExamSimulation examRoomId={examRoomId} sessionCount={sessions.length} />
        )}
        {activeTab === 'chat' && <ExamChat examRoomId={examRoomId} examDate={room.examDate} />}
        {activeTab === 'weakSpots' && <WeakSpotsPanel examRoomId={examRoomId} />}
      </div>

      {/* Modals */}
      <ExamSessionPicker
        open={sessionPickerOpen}
        onOpenChange={setSessionPickerOpen}
        examRoomId={examRoomId}
        existingSessionIds={sessions.map((s) => s.sessionId)}
      />
      {isHost && (
        <EditExamRoomModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          examRoomId={examRoomId}
          currentName={room.name}
          currentExamDate={room.examDate}
        />
      )}
      {isHost && (
        <ExamInviteModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          examRoomId={examRoomId}
          existingMemberIds={room.members.map((m) => m.userId)}
        />
      )}

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Upload Document
            </DialogTitle>
          </DialogHeader>
          <DocumentUpload
            newSessionOnly
            onSessionCreated={async (sessionId) => {
              try {
                await addSession({ examRoomId, sessionId });
                toast.success('Document uploaded and added to exam room');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to add session');
              }
              setUploadModalOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
