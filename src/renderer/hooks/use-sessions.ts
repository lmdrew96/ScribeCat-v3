import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

/**
 * Hook for managing recording sessions.
 * userId is now derived from the JWT token on the backend.
 */
export function useSessions() {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const deleteSession = useMutation(api.sessions.softDelete);
  const restoreSession = useMutation(api.sessions.restore);
  const permanentDeleteSession = useMutation(api.sessions.permanentDelete);

  return {
    sessions: sessions || [],
    createSession,
    updateSession,
    deleteSession,
    restoreSession,
    permanentDeleteSession,
  };
}

/**
 * Hook for getting a single session
 */
export function useSession(sessionId: Id<'sessions'> | null) {
  const session = useQuery(api.sessions.get, sessionId ? { id: sessionId } : 'skip');
  return session;
}

/**
 * Hook for appending transcript segments in real-time
 */
export function useTranscriptAppend() {
  const appendSegment = useMutation(api.sessions.appendTranscriptSegment);
  return appendSegment;
}

/**
 * Hook for trash management.
 * userId is now derived from the JWT token on the backend.
 */
export function useTrash() {
  const deletedSessions = useQuery(api.sessions.listDeleted);
  return deletedSessions || [];
}
