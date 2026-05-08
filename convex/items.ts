/**
 * StudyQuest item catalog — static source of truth for all game items.
 *
 * Items live in code, not in the database. The database only tracks
 * which items each user owns (gameInventory) and which they have
 * equipped (gameEquipment). When a player equips a sword, we don't
 * copy stats into the row — we look them up here at read time. This
 * means buffing or rebalancing an item is a code change, not a
 * migration.
 */

export type ItemSlot = 'weapon' | 'armor' | 'accessory' | 'consumable';

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  description: string;
  /** Added to base attack damage when equipped. */
  attackBonus?: number;
  /** Subtracted from incoming damage when equipped (min 1 dmg taken). */
  defenseBonus?: number;
  /** HP restored when this consumable is used. */
  healAmount?: number;
  /** If set, item appears in the shop at this coin price. */
  price?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  'wooden-sword': {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    slot: 'weapon',
    description: 'A practice blade. Better than nothing.',
    attackBonus: 3,
  },
  'iron-sword': {
    id: 'iron-sword',
    name: 'Iron Sword',
    slot: 'weapon',
    description: 'Solid steel — bites harder.',
    attackBonus: 6,
  },
  'cloth-vest': {
    id: 'cloth-vest',
    name: 'Cloth Vest',
    slot: 'armor',
    description: 'Light padding. Takes the edge off.',
    defenseBonus: 2,
  },
  'leather-vest': {
    id: 'leather-vest',
    name: 'Leather Vest',
    slot: 'armor',
    description: 'Toughened hide. Real protection.',
    defenseBonus: 5,
  },
  'lucky-charm': {
    id: 'lucky-charm',
    name: 'Lucky Charm',
    slot: 'accessory',
    description: 'A trinket that just feels right.',
    attackBonus: 1,
    defenseBonus: 1,
  },
  'healing-potion': {
    id: 'healing-potion',
    name: 'Healing Potion',
    slot: 'consumable',
    description: 'Restores 30 HP when used.',
    healAmount: 30,
    price: 15,
  },
  'greater-potion': {
    id: 'greater-potion',
    name: 'Greater Potion',
    slot: 'consumable',
    description: 'Restores 70 HP when used.',
    healAmount: 70,
    price: 40,
  },
  'steel-sword': {
    id: 'steel-sword',
    name: 'Steel Sword',
    slot: 'weapon',
    description: 'Forged blade — sharp and dependable.',
    attackBonus: 9,
    price: 120,
  },
  'plate-vest': {
    id: 'plate-vest',
    name: 'Plate Vest',
    slot: 'armor',
    description: 'Banded plates. Heavy but solid.',
    defenseBonus: 8,
    price: 120,
  },
  'focus-ring': {
    id: 'focus-ring',
    name: 'Focus Ring',
    slot: 'accessory',
    description: 'Quiets the mind. Sharper strikes.',
    attackBonus: 3,
    defenseBonus: 1,
    price: 90,
  },
  'guardian-charm': {
    id: 'guardian-charm',
    name: 'Guardian Charm',
    slot: 'accessory',
    description: 'A warm hum. Softens every blow.',
    attackBonus: 1,
    defenseBonus: 3,
    price: 90,
  },
};

export function getItem(id: string): ItemDef | null {
  return ITEMS[id] ?? null;
}

/** Items every new player starts with on first /study-quest visit. */
export const STARTER_INVENTORY: { itemId: string; quantity: number }[] = [
  { itemId: 'wooden-sword', quantity: 1 },
  { itemId: 'cloth-vest', quantity: 1 },
  { itemId: 'healing-potion', quantity: 2 },
];

/** Auto-equipped on first visit so battle bonuses kick in immediately. */
export const STARTER_EQUIPMENT = {
  weapon: 'wooden-sword' as string | null,
  armor: 'cloth-vest' as string | null,
  accessory: null as string | null,
};

export const EQUIPPABLE_SLOTS = new Set<ItemSlot>(['weapon', 'armor', 'accessory']);
