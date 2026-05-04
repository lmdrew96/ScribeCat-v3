/**
 * Enemy registry — stats by enemy id.
 *
 * Phase 3 keeps it simple: a small set of enemy templates indexed by their
 * `enemyId` from the procgen output (`enemy-r3`, `phase2-boss`, etc.). The
 * registry has a default fallback so any unknown id still produces a fight.
 */

export type EnemyTier = 'easy' | 'medium' | 'hard' | 'boss';

export interface EnemyTemplate {
  displayName: string;
  hp: number;
  attack: number;
  /** Hex color for the placeholder rectangle in the battle scene. */
  color: string;
  /** Determines question difficulty in Study Strike. */
  tier: EnemyTier;
  /** XP awarded on victory. */
  xpReward: number;
}

const DEFAULT_ENEMY: EnemyTemplate = {
  displayName: 'Mystery Foe',
  hp: 30,
  attack: 6,
  color: '#c14545',
  tier: 'easy',
  xpReward: 15,
};

const BOSS_TEMPLATE: EnemyTemplate = {
  displayName: 'Floor Boss',
  hp: 80,
  attack: 12,
  color: '#a01818',
  tier: 'boss',
  xpReward: 50,
};

/** Map enemy ids → templates. Anything not in the map uses DEFAULT_ENEMY. */
const REGISTRY: Record<string, EnemyTemplate> = {
  'phase2-boss': BOSS_TEMPLATE,
};

export function getEnemyTemplate(enemyId: string): EnemyTemplate {
  if (enemyId in REGISTRY) return REGISTRY[enemyId];
  // Light variation by id-hash so dungeons feel less samey.
  const hashed = simpleHash(enemyId) % 3;
  if (hashed === 1) {
    return { ...DEFAULT_ENEMY, displayName: 'Brittle Shade', hp: 24, attack: 5, xpReward: 12 };
  }
  if (hashed === 2) {
    return {
      ...DEFAULT_ENEMY,
      displayName: 'Brute Lurker',
      hp: 40,
      attack: 8,
      tier: 'medium',
      xpReward: 18,
    };
  }
  return DEFAULT_ENEMY;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
