import { useSessionContext } from '@/contexts/session-context';
import { useBlocker } from '@tanstack/react-router';

/**
 * Prevents accidental tab close/refresh during recording via beforeunload.
 * In-app navigation is safe since recording persists in RecordingContext.
 */
export function RecordingNavigationGuard() {
  const { isRecording } = useSessionContext();

  useBlocker({
    shouldBlockFn: () => false, // Don't block in-app navigation
    enableBeforeUnload: () => isRecording, // Block tab close/refresh
    disabled: !isRecording,
  });

  return null;
}
