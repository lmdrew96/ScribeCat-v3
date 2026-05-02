import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../../convex/_generated/api';

const HEARTBEAT_INTERVAL = 30_000;

/**
 * Send presence heartbeats every 30s so friends can see us as online.
 * Skips when the tab is hidden — a backgrounded tab isn't meaningfully
 * "active." Sends a fresh heartbeat immediately on becoming visible so
 * presence reflects the user returning.
 */
export function usePresence() {
  const updatePresence = useMutation(api.userProfiles.updatePresence);

  useEffect(() => {
    const beat = () => {
      if (!document.hidden) {
        void updatePresence();
      }
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL);

    const handleVisibility = () => {
      if (!document.hidden) {
        void updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [updatePresence]);
}
