import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useExamRooms() {
  const rooms = useQuery(api.examRooms.listMyExamRooms);
  return {
    rooms: rooms ?? [],
    isLoading: rooms === undefined,
  };
}

export function useExamRoom(examRoomId: Id<'examRooms'> | null) {
  const room = useQuery(api.examRooms.getExamRoom, examRoomId ? { examRoomId } : 'skip');
  return {
    room: room ?? null,
    isLoading: room === undefined,
  };
}

export function useExamRoomMessages(examRoomId: Id<'examRooms'> | null) {
  const messages = useQuery(
    api.examRooms.getExamRoomMessages,
    examRoomId ? { examRoomId } : 'skip',
  );
  const sendMessage = useMutation(api.examRooms.sendExamRoomMessage);

  return {
    messages: messages ?? [],
    isLoading: messages === undefined,
    sendMessage,
  };
}

export function useExamRoomSessions(examRoomId: Id<'examRooms'> | null) {
  const sessions = useQuery(
    api.examRooms.getExamRoomSessions,
    examRoomId ? { examRoomId } : 'skip',
  );
  return {
    sessions: sessions ?? [],
    isLoading: sessions === undefined,
  };
}

export function usePendingExamRoomCount() {
  const count = useQuery(api.examRooms.pendingExamRoomCount);
  return count ?? 0;
}

export function useExamRoomActions() {
  const createExamRoom = useMutation(api.examRooms.createExamRoom);
  const joinExamRoom = useMutation(api.examRooms.joinExamRoom);
  const leaveExamRoom = useMutation(api.examRooms.leaveExamRoom);
  const addSession = useMutation(api.examRooms.addSession);
  const removeSession = useMutation(api.examRooms.removeSession);
  const inviteToExamRoom = useMutation(api.examRooms.inviteToExamRoom);
  const updateExamRoom = useMutation(api.examRooms.updateExamRoom);
  const archiveExamRoom = useMutation(api.examRooms.archiveExamRoom);

  return {
    createExamRoom,
    joinExamRoom,
    leaveExamRoom,
    addSession,
    removeSession,
    inviteToExamRoom,
    updateExamRoom,
    archiveExamRoom,
  };
}

/** Sends a heartbeat every 30 seconds while the exam room is active. */
export function useExamRoomHeartbeat(examRoomId: Id<'examRooms'> | null) {
  const heartbeatMutation = useMutation(api.examRooms.examHeartbeat);

  useEffect(() => {
    if (!examRoomId) return;

    void heartbeatMutation({ examRoomId });

    const interval = setInterval(() => {
      void heartbeatMutation({ examRoomId });
    }, 30_000);

    return () => clearInterval(interval);
  }, [examRoomId, heartbeatMutation]);
}
