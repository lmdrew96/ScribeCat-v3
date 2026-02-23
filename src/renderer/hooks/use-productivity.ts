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

const WELLNESS_MESSAGES = [
  {
    title: 'Deep Breaths',
    description: 'Inhale for 4 seconds, hold for 4, exhale for 4. Repeat 3 times.',
  },
  {
    title: 'Stretch Your Neck',
    description:
      'Slowly tilt your head to each side, holding for 10 seconds. Roll your shoulders back.',
  },
  {
    title: 'Sit Up Straight',
    description: 'Uncross your legs, feet flat on the floor. Pull your shoulders back and down.',
  },
  {
    title: 'Hydration Check',
    description: 'Take a big sip of water. Your brain needs it to focus.',
  },
  {
    title: 'Rest Your Eyes',
    description: 'Look at something 20 feet away for 20 seconds. Blink a few times.',
  },
  {
    title: 'Wiggle Break',
    description: 'Stand up, shake out your hands, roll your ankles. Get the blood flowing.',
  },
  {
    title: 'Jaw Check',
    description:
      'Unclench your jaw. Let your tongue drop from the roof of your mouth. Relax your face.',
  },
  {
    title: 'Hand Stretch',
    description: 'Spread your fingers wide, hold for 5 seconds. Make fists, hold for 5. Repeat.',
  },
];

/**
 * Hook for break reminders during recording.
 * Fires rotating wellness-focused Sonner toasts at the configured interval.
 */
export function useBreakReminder(isRecording: boolean) {
  const settings = useQuery(api.productivity.getSettings);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const snoozeRef = useRef(false);
  const messageIndexRef = useRef(0);

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

      const message = WELLNESS_MESSAGES[messageIndexRef.current % WELLNESS_MESSAGES.length];
      messageIndexRef.current++;

      toast.info(message.title, {
        description: message.description,
        duration: 10000,
        action: {
          label: 'Snooze 5 min',
          onClick: () => {
            snoozeRef.current = true;
          },
        },
      });
    }, intervalMs);

    return clearTimer;
  }, [isRecording, settings?.breakReminders, settings?.breakIntervalMinutes, clearTimer]);
}
