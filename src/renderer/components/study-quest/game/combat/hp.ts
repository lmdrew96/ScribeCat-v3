/**
 * HP helpers — pure functions over numeric HP values.
 *
 * Player HP lives in `gameBridge.state.playerHp` (so a Rest room or future
 * HUD can read/write it without scene coupling). Enemy HP is local to a
 * BattleScene instance — no need to persist between fights.
 */

export function clampHp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function applyDamage(current: number, max: number, amount: number): number {
  return clampHp(current - Math.max(0, amount), max);
}

export function applyHeal(current: number, max: number, amount: number): number {
  return clampHp(current + Math.max(0, amount), max);
}

export function isDead(current: number): boolean {
  return current <= 0;
}
