import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
}

export function useWakeLock(enabled: boolean): UseWakeLockReturn {
  const isSupported = 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!isSupported || document.visibilityState !== 'visible') return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);
      sentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        setIsActive(false);
      });
    } catch {
      // Wake lock request can fail (e.g. low battery mode)
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      await sentinelRef.current.release();
      sentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Acquire/release based on enabled flag
  useEffect(() => {
    if (enabled) {
      acquire();
    } else {
      release();
    }
    return () => {
      release();
    };
  }, [enabled, acquire, release]);

  // Re-acquire when page becomes visible again (browsers release on tab hide)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, acquire]);

  return { isSupported, isActive };
}
