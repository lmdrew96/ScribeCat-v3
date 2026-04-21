import { useEffect, useState } from 'react';

export const NYAN_UNLOCK_KEY = 'scribecat-nyan-unlocked';
export const NYAN_UNLOCK_EVENT = 'scribecat:nyan-unlocked';

function read(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(NYAN_UNLOCK_KEY) === 'true';
}

/**
 * Reactive read of the Nyan Cat unlock flag. Fires a custom event on same-tab
 * updates so listeners re-render immediately (the native `storage` event only
 * fires in other tabs).
 */
export function useNyanUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(read);

  useEffect(() => {
    function refresh() {
      setUnlocked(read());
    }
    window.addEventListener(NYAN_UNLOCK_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(NYAN_UNLOCK_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return unlocked;
}

/**
 * Marks Nyan Cat themes as unlocked. Returns true if this call was the first
 * unlock (so the caller can show a bonus celebratory message).
 */
export function unlockNyanThemes(): boolean {
  if (typeof window === 'undefined') return false;
  const wasUnlocked = read();
  if (!wasUnlocked) {
    window.localStorage.setItem(NYAN_UNLOCK_KEY, 'true');
    window.dispatchEvent(new Event(NYAN_UNLOCK_EVENT));
  }
  return !wasUnlocked;
}
