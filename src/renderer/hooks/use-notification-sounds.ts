import {
  playFriendRequestSound,
  playLevelUpSound,
  playMessageSound,
} from '@/lib/notification-sounds';
import { useStudySettings } from './use-productivity';

type SoundType = 'message' | 'friendRequest' | 'levelup';

/**
 * Returns a `playSound` function that respects the user's soundEnabled setting.
 */
export function useNotificationSounds(): { playSound: (type: SoundType) => void } {
  const { settings } = useStudySettings();
  const soundEnabled = settings?.soundEnabled ?? true;

  const playSound = (type: SoundType) => {
    if (!soundEnabled) return;
    try {
      if (type === 'message') playMessageSound();
      else if (type === 'friendRequest') playFriendRequestSound();
      else if (type === 'levelup') playLevelUpSound();
    } catch {
      // AudioContext may fail in some environments — silently ignore
    }
  };

  return { playSound };
}
