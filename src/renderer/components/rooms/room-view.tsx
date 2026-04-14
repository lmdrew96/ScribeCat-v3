import { DocumentUpload } from '@/components/document-upload';
import { GameLauncher } from '@/components/rooms/game-launcher';
import { GameView } from '@/components/rooms/game-view';
import { PinSessionModal } from '@/components/rooms/pin-session-modal';
import { RoomChat } from '@/components/rooms/room-chat';
import { RoomNotesEditor } from '@/components/rooms/room-notes-editor';
import { StudyContent } from '@/components/study-content';
import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { StudyTools } from '@/components/study-tools/index';
import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSessions } from '@/hooks/use-sessions';
import { useActiveGame } from '@/hooks/use-study-games';
import {
  useRoom,
  useRoomActions,
  useRoomHeartbeat,
  useRoomMessages,
  useRoomPinnedSession,
} from '@/hooks/use-study-rooms';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { DoorOpen, FileText, LogOut, Pin, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

interface RoomViewProps {
  roomId: Id<'studyRooms'>;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function RoomView({ roomId }: RoomViewProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const currentUserId = user?.id ?? '';

  const { room, isLoading: roomLoading } = useRoom(roomId);
  const { messages, isLoading: messagesLoading, sendMessage } = useRoomMessages(roomId);
  const { pinnedSession } = useRoomPinnedSession(roomId);
  const { joinRoom, leaveRoom, closeRoom, pinSession } = useRoomActions();
  const { sessions } = useSessions();

  // Active game state
  const { game: activeGame } = useActiveGame(roomId);

  // Presence heartbeat
  useRoomHeartbeat(roomId);

  // Modals
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Left panel tab
  const [activeTab, setActiveTab] = useState<'session' | 'notes'>('session');

  // Audio URL for pinned session
  const audioUrl = useQuery(
    api.audioStorage.getAudioUrl,
    pinnedSession?.audioStorageId ? { storageId: pinnedSession.audioStorageId } : 'skip',
  );

  if (roomLoading || !room) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading room...</p>
      </div>
    );
  }

  const isHost = room.hostUserId === currentUserId;
  const currentMember = room.members.find((m) => m.userId === currentUserId);
  const hasJoined = currentMember?.hasJoined ?? false;
  const onlineCount = room.members.filter((m) => m.isOnline).length;
  const myDisplayName = currentMember?.displayName ?? user?.fullName ?? 'Someone';

  const handleJoin = async () => {
    try {
      await joinRoom({ roomId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room';
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    try {
      if (isHost) {
        await closeRoom({ roomId });
        toast.success('Room closed');
      } else {
        await leaveRoom({ roomId });
        toast.success('Left the room');
      }
      navigate({ to: '/rooms' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave room';
      toast.error(message);
    }
  };

  // Build the recording object for StudyContent
  const recording: Recording | null = pinnedSession
    ? {
        id: pinnedSession._id,
        title: pinnedSession.title,
        date: new Date(pinnedSession.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        duration: formatDuration(pinnedSession.duration),
        transcript: pinnedSession.transcript || '',
        notes: pinnedSession.notes || '',
        audioUrl: audioUrl,
        audioStorageId: pinnedSession.audioStorageId,
        transcriptSegments: pinnedSession.transcriptSegments,
        lectureType: pinnedSession.lectureType,
        nuggetNotes: pinnedSession.nuggetNotes,
        documentText: pinnedSession.documentText,
      }
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Join banner (if invited but not joined) */}
      {!hasJoined && (
        <div className="flex items-center justify-between border-b border-accent/30 bg-accent/10 px-4 py-2">
          <p className="text-xs text-foreground">You&apos;ve been invited to this study room!</p>
          <Button size="sm" className="h-7 text-xs" onClick={() => void handleJoin()}>
            Join Room
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg)] shrink-0">
            <DoorOpen className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{room.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {onlineCount} online &middot; {room.members.length} member
              {room.members.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Member avatars */}
          <div className="flex items-center -space-x-2 ml-2">
            {room.members.slice(0, 5).map((member) => (
              <div
                key={member.userId}
                className="relative"
                title={`${member.displayName}${member.isOnline ? ' (online)' : ''}`}
              >
                {member.catVariant ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full glass-light border-2 border-[var(--glass-bg)] overflow-hidden">
                    <CatDisplay
                      mood="idle"
                      variant={member.catVariant as CatVariant}
                      size="small"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)] border-2 border-[var(--glass-bg)] text-[10px] font-medium text-foreground">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--glass-bg)]',
                    member.isOnline ? 'bg-green-400' : 'bg-muted-foreground/40',
                  )}
                />
              </div>
            ))}
            {room.members.length > 5 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)] border-2 border-[var(--glass-bg)] text-[10px] font-medium text-muted-foreground">
                +{room.members.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isHost && !activeGame && (
            <GameLauncher roomId={roomId} hasPinnedSession={!!pinnedSession} />
          )}
          {isHost && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setPinModalOpen(true)}
              >
                <Pin className="h-3 w-3" />
                <span className="hidden sm:inline">Pin Session</span>
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

      {/* Main content: Session + Chat side by side */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Game view (if active) OR tabbed session/notes */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeGame ? (
            <GameView game={activeGame} currentUserId={currentUserId} />
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex shrink-0 border-b border-[var(--glass-border)] glass-light">
                <button
                  type="button"
                  onClick={() => setActiveTab('session')}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2',
                    activeTab === 'session'
                      ? 'border-accent text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Pin className="h-3 w-3" />
                  Session
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2',
                    activeTab === 'notes'
                      ? 'border-accent text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FileText className="h-3 w-3" />
                  Notes
                </button>
              </div>

              {/* Session tab */}
              {activeTab === 'session' &&
                (recording ? (
                  <>
                    {/* Pinned session banner */}
                    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--glass-border)] bg-accent/5">
                      <Pin className="h-3 w-3 text-accent shrink-0" />
                      <p className="text-[10px] text-muted-foreground truncate">
                        Pinned by{' '}
                        <span className="font-medium text-foreground">
                          @{pinnedSession?.owner.username}
                        </span>
                        : {pinnedSession?.title}
                      </p>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                      <StudyContent recording={recording} />
                    </div>
                    <div className="border-t border-[var(--glass-border)]">
                      <StudyTools sessionId={pinnedSession?._id as Id<'sessions'>} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    <Pin className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">No session pinned</p>
                    <p className="text-xs text-muted-foreground">
                      {isHost
                        ? 'Pin a session for everyone to study together'
                        : 'Waiting for host to pin a session'}
                    </p>
                    {isHost && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2 gap-1 text-xs"
                        onClick={() => setPinModalOpen(true)}
                      >
                        <Pin className="h-3 w-3" />
                        Pin a Session
                      </Button>
                    )}
                  </div>
                ))}

              {/* Notes tab */}
              {activeTab === 'notes' && (
                <RoomNotesEditor
                  roomId={roomId}
                  currentUserId={currentUserId}
                  currentUserName={myDisplayName}
                  members={room.members}
                />
              )}
            </>
          )}
        </div>

        {/* Room chat (right side) */}
        <div className="w-80 shrink-0 border-l border-[var(--glass-border)]">
          <RoomChat
            messages={messages}
            isLoading={messagesLoading}
            currentUserId={currentUserId}
            onSend={sendMessage}
            roomId={roomId}
          />
        </div>
      </div>

      {/* Pin session modal */}
      {isHost && (
        <>
          <PinSessionModal
            open={pinModalOpen}
            onOpenChange={setPinModalOpen}
            roomId={roomId}
            sessions={sessions}
            pinnedSessionId={room.pinnedSessionId ?? null}
          />
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
                    await pinSession({ roomId, sessionId });
                    toast.success('Document uploaded and pinned');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to pin session');
                  }
                  setUploadModalOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
