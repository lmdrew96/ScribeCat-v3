/**
 * Cat evolution tiers — visible milestones for hitting key levels.
 *
 * Pure cosmetic. The aura colors and accessory glyphs render as overlays
 * on top of the existing sprite sheet (see `cat-display.tsx`), so we
 * don't need a new PNG per variant per tier.
 *
 * Tier 1 lands at L5, tier 2 at L10, tier 3 at L20 — same thresholds the
 * spec calls out (scarf / crown / wings). Replace the emoji with proper
 * pixel art accessories when art is ready.
 */

export type EvolutionTier = 0 | 1 | 2 | 3;

export interface EvolutionVisuals {
  tier: EvolutionTier;
  label: string;
  /** Glyph rendered above-right of the cat. Empty string = no accessory. */
  accessory: string;
  /** Aria label describing the accessory for screen readers. */
  accessoryLabel: string;
  /** rgba/hex color used for the radial aura behind the cat. */
  auraColor: string;
}

export function getEvolutionTier(level: number): EvolutionTier {
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

export const EVOLUTION_VISUALS: Record<EvolutionTier, EvolutionVisuals> = {
  0: { tier: 0, label: 'Kit', accessory: '', accessoryLabel: '', auraColor: 'transparent' },
  1: {
    tier: 1,
    label: 'Scholar',
    accessory: '✨',
    accessoryLabel: 'Scholar — Level 5+',
    auraColor: 'rgba(223, 166, 73, 0.45)',
  },
  2: {
    tier: 2,
    label: 'Sage',
    accessory: '👑',
    accessoryLabel: 'Sage — Level 10+',
    auraColor: 'rgba(136, 115, 158, 0.55)',
  },
  3: {
    tier: 3,
    label: 'Legend',
    accessory: '🪽',
    accessoryLabel: 'Legend — Level 20+',
    auraColor: 'rgba(151, 209, 129, 0.65)',
  },
};

export function getEvolutionVisuals(level: number): EvolutionVisuals {
  return EVOLUTION_VISUALS[getEvolutionTier(level)];
}
