import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../../../convex/_generated/api';

const HEARTBEAT_INTERVAL = 30_000;

/** Send presence heartbeats every 30s so friends can see us as online. */
export function usePresence() {
  const updatePresence = useMutation(api.userProfiles.updatePresence);

  useEffect(() => {
    void updatePresence();
    const interval = setInterval(() => {
      void updatePresence();
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [updatePresence]);
}
