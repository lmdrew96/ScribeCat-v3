import { useSession } from '@clerk/clerk-react';
import { useEffect } from 'react';

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

/**
 * Keeps the Clerk session alive during recording by calling session.touch()
 * periodically. Prevents auth expiry from killing active recordings.
 */
export function useSessionKeepAlive(enabled: boolean) {
  const { session } = useSession();

  useEffect(() => {
    if (!enabled || !session) return;

    const interval = setInterval(() => {
      session.touch().catch((err: unknown) => {
        console.warn('Failed to keep session alive:', err);
      });
    }, KEEP_ALIVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, session]);
}
