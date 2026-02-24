import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useStudyRooms() {
  const rooms = useQuery(api.studyRooms.listMyRooms);
  return {
    rooms: rooms ?? [],
    isLoading: rooms === undefined,
  };
}

export function useRoom(roomId: Id<'studyRooms'> | null) {
  const room = useQuery(api.studyRooms.getRoom, roomId ? { roomId } : 'skip');
  return {
    room: room ?? null,
    isLoading: room === undefined,
  };
}

export function useRoomMessages(roomId: Id<'studyRooms'> | null) {
  const messages = useQuery(api.studyRooms.getRoomMessages, roomId ? { roomId } : 'skip');
  const sendMessage = useMutation(api.studyRooms.sendRoomMessage);

  return {
    messages: messages ?? [],
    isLoading: messages === undefined,
    sendMessage,
  };
}

export function useRoomPinnedSession(roomId: Id<'studyRooms'> | null) {
  const session = useQuery(api.studyRooms.getRoomPinnedSession, roomId ? { roomId } : 'skip');
  return {
    pinnedSession: session ?? null,
    isLoading: session === undefined,
  };
}

export function usePendingRoomCount() {
  const count = useQuery(api.studyRooms.pendingRoomCount);
  return count ?? 0;
}

export function useRoomActions() {
  const createRoom = useMutation(api.studyRooms.createRoom);
  const joinRoom = useMutation(api.studyRooms.joinRoom);
  const leaveRoom = useMutation(api.studyRooms.leaveRoom);
  const closeRoom = useMutation(api.studyRooms.closeRoom);
  const pinSession = useMutation(api.studyRooms.pinSession);
  const unpinSession = useMutation(api.studyRooms.unpinSession);
  const heartbeatMutation = useMutation(api.studyRooms.heartbeat);
  const inviteToRoom = useMutation(api.studyRooms.inviteToRoom);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    pinSession,
    unpinSession,
    heartbeat: heartbeatMutation,
    inviteToRoom,
  };
}

/** Sends a heartbeat every 30 seconds while the room is active. */
export function useRoomHeartbeat(roomId: Id<'studyRooms'> | null) {
  const heartbeatMutation = useMutation(api.studyRooms.heartbeat);

  useEffect(() => {
    if (!roomId) return;

    // Immediate heartbeat on mount
    void heartbeatMutation({ roomId });

    const interval = setInterval(() => {
      void heartbeatMutation({ roomId });
    }, 30_000);

    return () => clearInterval(interval);
  }, [roomId, heartbeatMutation]);
}
