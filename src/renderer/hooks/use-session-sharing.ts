import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useSharedSessions() {
  const shared = useQuery(api.sessionSharing.listSharedWithMe);
  return {
    sharedSessions: shared ?? [],
    isLoading: shared === undefined,
  };
}

export function useShareSession() {
  const shareSession = useMutation(api.sessionSharing.shareSession);
  const unshareSession = useMutation(api.sessionSharing.unshareSession);
  const copyToLibrary = useMutation(api.sessionSharing.copyToLibrary);

  return { shareSession, unshareSession, copyToLibrary };
}

export function useSessionShares(sessionId: Id<'sessions'> | null) {
  const shares = useQuery(
    api.sessionSharing.listSharesForSession,
    sessionId ? { sessionId } : 'skip',
  );
  return shares ?? [];
}
