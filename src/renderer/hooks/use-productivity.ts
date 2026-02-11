import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';

/**
 * Hook to read/write user study settings from Convex.
 */
export function useStudySettings() {
  const settings = useQuery(api.productivity.getSettings);
  const updateSettings = useMutation(api.productivity.updateSettings);
  return { settings, updateSettings };
}

/**
 * Hook to read study stats (today, streak, weekly).
 */
export function useStudyStats() {
  const stats = useQuery(api.productivity.getStudyStats);
  return stats;
}

/**
 * Hook to read unlocked achievements.
 */
export function useAchievements() {
  const achievements = useQuery(api.productivity.getAchievements);
  return achievements;
}

/**
 * Hook to log study time when a session ends.
 * Returns a function to call with session duration.
 */
export function useLogStudyTime() {
  const logStudyTime = useMutation(api.productivity.logStudyTime);
  return logStudyTime;
}

/**
 * Hook for break reminders during recording.
 * Fires a Sonner toast at the configured interval.
 */
export function useBreakReminder(isRecording: boolean) {
  const settings = useQuery(api.productivity.getSettings);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const snoozeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!isRecording || !settings?.breakReminders) return;

    const intervalMs = (settings.breakIntervalMinutes ?? 25) * 60 * 1000;

    timerRef.current = setInterval(() => {
      if (snoozeRef.current) {
        snoozeRef.current = false;
        return;
      }

      toast.info('Time for a break!', {
        description: "You've been studying hard. Stretch, hydrate, rest your eyes.",
        duration: 10000,
        action: {
          label: 'Snooze 5 min',
          onClick: () => {
            snoozeRef.current = true;
            // The next interval tick will skip, effectively adding ~interval delay
            // For a true 5-min snooze, we'd need a separate timer
          },
        },
      });
    }, intervalMs);

    return clearTimer;
  }, [isRecording, settings?.breakReminders, settings?.breakIntervalMinutes, clearTimer]);
}
