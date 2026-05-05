/**
 * Battle drop tables — what each enemy tier can leave behind.
 *
 * Weights are picked relative to each other plus a `nothingWeight` no-drop
 * slot. Bosses have nothingWeight=0 so they always drop something. Easy
 * mobs are mostly potions so the bag stays stocked.
 *
 * `rollDrop` is pure (takes an RNG) so it can be unit tested with a seeded
 * generator if we ever need to.
 */

export type Tier = 'easy' | 'medium' | 'hard' | 'boss';

export interface DropEntry {
  itemId: string;
  quantity: number;
  weight: number;
}

export interface DropTable {
  entries: DropEntry[];
  nothingWeight: number;
}

export const DROP_TABLES: Record<Tier, DropTable> = {
  easy: {
    entries: [
      { itemId: 'healing-potion', quantity: 1, weight: 40 },
      { itemId: 'cloth-vest', quantity: 1, weight: 5 },
      { itemId: 'wooden-sword', quantity: 1, weight: 5 },
    ],
    nothingWeight: 50,
  },
  medium: {
    entries: [
      { itemId: 'healing-potion', quantity: 1, weight: 50 },
      { itemId: 'lucky-charm', quantity: 1, weight: 10 },
      { itemId: 'leather-vest', quantity: 1, weight: 10 },
      { itemId: 'iron-sword', quantity: 1, weight: 5 },
    ],
    nothingWeight: 25,
  },
  hard: {
    entries: [
      { itemId: 'healing-potion', quantity: 1, weight: 35 },
      { itemId: 'iron-sword', quantity: 1, weight: 20 },
      { itemId: 'leather-vest', quantity: 1, weight: 20 },
      { itemId: 'lucky-charm', quantity: 1, weight: 15 },
    ],
    nothingWeight: 10,
  },
  boss: {
    entries: [
      { itemId: 'iron-sword', quantity: 1, weight: 30 },
      { itemId: 'leather-vest', quantity: 1, weight: 30 },
      { itemId: 'lucky-charm', quantity: 1, weight: 25 },
      { itemId: 'healing-potion', quantity: 2, weight: 15 },
    ],
    nothingWeight: 0,
  },
};

export function rollDrop(
  tier: Tier,
  rng: () => number = Math.random,
): { itemId: string; quantity: number } | null {
  const table = DROP_TABLES[tier];
  const totalWeight =
    table.entries.reduce((sum, e) => sum + e.weight, 0) + table.nothingWeight;
  let r = rng() * totalWeight;
  for (const entry of table.entries) {
    r -= entry.weight;
    if (r < 0) return { itemId: entry.itemId, quantity: entry.quantity };
  }
  return null;
}

export function isTier(value: string): value is Tier {
  return value === 'easy' || value === 'medium' || value === 'hard' || value === 'boss';
}
