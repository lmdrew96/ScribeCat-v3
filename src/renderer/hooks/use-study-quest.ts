import { useSessionContext } from '@/contexts/session-context';
import { useMutation, useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '../../../convex/_generated/api';
import { xpProgress as calcXpProgress } from '../../shared/xp-utils';

export type CatMood = 'idle' | 'happy' | 'studying' | 'sleepy' | 'excited';

function resolveMood(params: {
  isRecording: boolean;
  lastActivityAt: number;
  storedMood: string;
}): CatMood {
  // Server-set moods (excited/happy) take priority for 30 seconds
  const timeSinceActivity = Date.now() - params.lastActivityAt;
  if (
    (params.storedMood === 'excited' || params.storedMood === 'happy') &&
    timeSinceActivity < 30_000
  ) {
    return params.storedMood as CatMood;
  }

  if (params.isRecording) return 'studying';

  const hour = new Date().getHours();
  const inactiveMinutes = timeSinceActivity / 60_000;
  if (inactiveMinutes > 30 || hour >= 22 || hour < 6) return 'sleepy';

  return 'idle';
}

export function useStudyQuest() {
  const catState = useQuery(api.studyQuest.getCatState);
  const adoptCat = useMutation(api.studyQuest.adoptCat);
  const renameCat = useMutation(api.studyQuest.renameCat);
  const { isRecording } = useSessionContext();

  const mood = useMemo((): CatMood => {
    if (!catState) return 'idle';
    return resolveMood({
      isRecording,
      lastActivityAt: catState.lastActivityAt,
      storedMood: catState.mood,
    });
  }, [catState, isRecording]);

  const xp = useMemo(() => {
    if (!catState) return { level: 1, current: 0, needed: 100, percent: 0 };
    return calcXpProgress(catState.totalXp);
  }, [catState]);

  return {
    isAdopted: catState !== null && catState !== undefined,
    isLoading: catState === undefined,
    name: catState?.name ?? 'Nugget',
    totalXp: catState?.totalXp ?? 0,
    level: xp.level,
    xpProgress: xp,
    mood,
    recentGains: catState?.lastXpGains ?? [],
    adoptCat,
    renameCat,
  };
}
