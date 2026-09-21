import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

/**
 * Session mutations, with no subscription attached.
 *
 * Split out from the list on purpose: these used to come bundled with a
 * `listMetadata` subscription, so every component that only wanted to WRITE —
 * the recording context, the notes panel, both upload paths — dragged a read of
 * every session document along with it. During a recording that query is
 * invalidated on every transcript save, which made it one of the most expensive
 * things the app did. userId is derived from the JWT on the backend.
 */
export function useSessionMutations() {
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const deleteSession = useMutation(api.sessions.softDelete);
  const restoreSession = useMutation(api.sessions.restore);
  const permanentDeleteSession = useMutation(api.sessions.permanentDelete);
  const mergeSessions = useMutation(api.sessions.mergeSessions);

  return {
    createSession,
    updateSession,
    deleteSession,
    restoreSession,
    permanentDeleteSession,
    mergeSessions,
  };
}

/**
 * The user's sessions, metadata only. Subscribe from components that actually
 * render a list — it re-runs on every write to any of the user's sessions.
 */
export function useSessionList() {
  const sessions = useQuery(api.sessions.listMetadata);
  return sessions ?? [];
}

/**
 * Hook for getting a single session.
 *
 * Does not include transcript segments — use `useTranscriptSegments` for those.
 */
export function useSession(sessionId: Id<'sessions'> | null) {
  const session = useQuery(api.sessions.get, sessionId ? { id: sessionId } : 'skip');
  return session;
}

/**
 * A session's transcript segments, on their own subscription so they aren't
 * re-read by everything watching the session document.
 */
export function useTranscriptSegments(sessionId: Id<'sessions'> | null) {
  return useQuery(api.transcriptSegments.list, sessionId ? { sessionId } : 'skip');
}

/**
 * Hook for trash management.
 * userId is now derived from the JWT token on the backend.
 */
export function useTrash() {
  const deletedSessions = useQuery(api.sessions.listDeletedMetadata);
  return deletedSessions || [];
}
