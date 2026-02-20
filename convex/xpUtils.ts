/**
 * XP and Level calculation utilities for StudyQuest.
 * Shared between server (convex/) and client (src/).
 */

/** Total XP required to reach a given level. Quadratic growth: 50 * L * (L+1) */
export function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
}

/** Derive the current level from total XP earned. */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  return level;
}

/** Get XP progress within the current level. */
export function xpProgress(totalXp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const current = totalXp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  return { level, current, needed, percent: Math.round((current / needed) * 100) };
}
