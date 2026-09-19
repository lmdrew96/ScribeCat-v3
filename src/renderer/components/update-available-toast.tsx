import { useRecordingContext } from '@/contexts/recording-context';
import {
  applyAppUpdate,
  dismissAppUpdate,
  getAppUpdateReady,
  setAppReloadBlocked,
  subscribeToAppUpdate,
} from '@/lib/app-update';
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

const TOAST_ID = 'app-update-available';

/**
 * Offers the new build to a stale tab. Held back entirely while a lecture is
 * recording or its audio is still saving — a refresh then loses the session —
 * and surfaced at the next safe moment instead.
 */
export function UpdateAvailableToast(): null {
  const { isRecording, isSavingAudio } = useRecordingContext();
  const updateReady = useSyncExternalStore(subscribeToAppUpdate, getAppUpdateReady);
  const suppressed = isRecording || isSavingAudio;

  useEffect(() => {
    setAppReloadBlocked(suppressed);
  }, [suppressed]);

  useEffect(() => {
    if (!updateReady || suppressed) {
      // Recording started with the toast up — hide it without counting as a dismissal.
      toast.dismiss(TOAST_ID);
      return;
    }
    toast('A new version of ScribeCat is ready', {
      id: TOAST_ID,
      description: 'Refresh when you’re at a good stopping point.',
      duration: Number.POSITIVE_INFINITY,
      action: { label: 'Refresh', onClick: applyAppUpdate },
      cancel: { label: 'Not now', onClick: dismissAppUpdate },
    });
  }, [updateReady, suppressed]);

  return null;
}
