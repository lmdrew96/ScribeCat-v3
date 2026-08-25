import { describe, expect, it } from 'vitest';
import { levelFromXp, xpForLevel, xpProgress } from '../convex/xpUtils';

describe('xpForLevel', () => {
  it('computes the quadratic curve 50 * L * (L+1)', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(5)).toBe(1500);
  });

  it('returns 0 at level 0', () => {
    expect(xpForLevel(0)).toBe(0);
  });
});

describe('levelFromXp', () => {
  it('returns level 1 below the level-2 threshold', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it('advances a level exactly at the threshold', () => {
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(2) - 1)).toBe(1);
  });

  it('handles large XP totals', () => {
    expect(levelFromXp(xpForLevel(10))).toBe(10);
  });
});

describe('xpProgress', () => {
  it('reports 0% right at the start of a level', () => {
    const progress = xpProgress(xpForLevel(2));
    expect(progress.level).toBe(2);
    expect(progress.current).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it('reports partial progress within a level', () => {
    const needed = xpForLevel(2) - xpForLevel(1);
    const progress = xpProgress(xpForLevel(1) + Math.floor(needed / 2));
    expect(progress.level).toBe(1);
    expect(progress.needed).toBe(needed);
    expect(progress.percent).toBeCloseTo(50, 0);
  });

  it('stays at the current level until the next threshold is reached', () => {
    const progress = xpProgress(xpForLevel(3) - 1);
    expect(progress.level).toBe(2);
    // 1 XP shy of leveling up rounds up to 100% — the level only advances
    // once totalXp actually reaches xpForLevel(3).
    expect(progress.percent).toBe(100);
  });
});
