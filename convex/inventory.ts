/**
 * StudyQuest inventory + equipment — queries and mutations.
 *
 * Bonus math (attack/defense) is computed server-side when fetching
 * equipment so the client doesn't need the item catalog. Battle scene
 * reads the resulting numbers via gameBridge.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireAuth } from './authHelpers';
import { isTier, rollDrop } from './dropTables';
import {
  EQUIPPABLE_SLOTS,
  STARTER_EQUIPMENT,
  STARTER_INVENTORY,
  getItem,
  type ItemSlot,
} from './items';

export const getInventory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const row = await ctx.db
      .query('gameInventory')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    const raw = row?.items ?? [];
    // Enrich with catalog details so the UI doesn't need to ship the catalog.
    // Drop entries whose itemId no longer exists in the catalog (item removed
    // in a code change) — they'd render as broken otherwise.
    return raw.flatMap((entry) => {
      const item = getItem(entry.itemId);
      if (!item) return [];
      return [{ itemId: entry.itemId, quantity: entry.quantity, item }];
    });
  },
});

export const getEquipment = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const row = await ctx.db
      .query('gameEquipment')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const weaponId = row?.weapon ?? null;
    const armorId = row?.armor ?? null;
    const accessoryId = row?.accessory ?? null;

    const weapon = weaponId ? getItem(weaponId) : null;
    const armor = armorId ? getItem(armorId) : null;
    const accessory = accessoryId ? getItem(accessoryId) : null;

    let attackBonus = 0;
    let defenseBonus = 0;
    for (const item of [weapon, armor, accessory]) {
      if (!item) continue;
      attackBonus += item.attackBonus ?? 0;
      defenseBonus += item.defenseBonus ?? 0;
    }
    return { weapon, armor, accessory, attackBonus, defenseBonus };
  },
});

/**
 * Idempotent — gives every user a starter loadout (sword + vest +
 * potions) and auto-equips weapon/armor on first call. Safe to call
 * on every /study-quest mount; does nothing if rows already exist.
 */
export const ensureStarterLoadout = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const inv = await ctx.db
      .query('gameInventory')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!inv) {
      await ctx.db.insert('gameInventory', {
        userId,
        items: STARTER_INVENTORY,
        updatedAt: now,
      });
    }

    const eq = await ctx.db
      .query('gameEquipment')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!eq) {
      await ctx.db.insert('gameEquipment', {
        userId,
        ...STARTER_EQUIPMENT,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const equipItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const item = getItem(args.itemId);
    if (!item) throw new ConvexError(`Unknown item: ${args.itemId}`);
    if (!EQUIPPABLE_SLOTS.has(item.slot)) {
      throw new ConvexError(`Item ${args.itemId} is not equippable`);
    }

    const inv = await ctx.db
      .query('gameInventory')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    const owned = inv?.items.find((i) => i.itemId === args.itemId);
    if (!owned || owned.quantity < 1) {
      throw new ConvexError(`You don't own ${args.itemId}`);
    }

    const now = Date.now();
    const eq = await ctx.db
      .query('gameEquipment')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!eq) {
      await ctx.db.insert('gameEquipment', {
        userId,
        weapon: item.slot === 'weapon' ? args.itemId : null,
        armor: item.slot === 'armor' ? args.itemId : null,
        accessory: item.slot === 'accessory' ? args.itemId : null,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(eq._id, { [item.slot]: args.itemId, updatedAt: now });
    }
    return null;
  },
});

/**
 * Adds `quantity` of `itemId` to the user's inventory, merging with any
 * existing entry. Used by drops, gifts, future shop purchases.
 */
async function grantItem(
  ctx: MutationCtx,
  userId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  const now = Date.now();
  const inv = await ctx.db
    .query('gameInventory')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (!inv) {
    await ctx.db.insert('gameInventory', {
      userId,
      items: [{ itemId, quantity }],
      updatedAt: now,
    });
    return;
  }
  const existingIdx = inv.items.findIndex((i) => i.itemId === itemId);
  const newItems =
    existingIdx >= 0
      ? inv.items.map((entry, i) =>
          i === existingIdx ? { ...entry, quantity: entry.quantity + quantity } : entry,
        )
      : [...inv.items, { itemId, quantity }];
  await ctx.db.patch(inv._id, { items: newItems, updatedAt: now });
}

/**
 * Rolls the drop table for the given enemy tier and grants the result
 * (if any) to the player. Returns the drop info for client-side toast,
 * or null if nothing dropped.
 */
export const rollBattleDrop = mutation({
  args: { tier: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!isTier(args.tier)) throw new ConvexError(`Invalid tier: ${args.tier}`);
    const drop = rollDrop(args.tier);
    if (!drop) return null;
    const item = getItem(drop.itemId);
    if (!item) return null;
    await grantItem(ctx, userId, drop.itemId, drop.quantity);
    return { itemId: drop.itemId, quantity: drop.quantity, itemName: item.name };
  },
});

export const useItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const item = getItem(args.itemId);
    if (!item) throw new ConvexError(`Unknown item: ${args.itemId}`);
    if (item.slot !== 'consumable') {
      throw new ConvexError(`${item.name} is not usable from the bag`);
    }

    const inv = await ctx.db
      .query('gameInventory')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!inv) throw new ConvexError('No inventory found');

    const idx = inv.items.findIndex((i) => i.itemId === args.itemId);
    if (idx === -1 || inv.items[idx].quantity < 1) {
      throw new ConvexError(`You don't have any ${item.name}`);
    }

    // Decrement quantity; drop the entry entirely if it hits zero.
    const newItems = inv.items
      .map((entry, i) => (i === idx ? { ...entry, quantity: entry.quantity - 1 } : entry))
      .filter((entry) => entry.quantity > 0);
    await ctx.db.patch(inv._id, { items: newItems, updatedAt: Date.now() });

    return { healAmount: item.healAmount ?? 0, itemName: item.name };
  },
});

export const unequipSlot = mutation({
  args: { slot: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!EQUIPPABLE_SLOTS.has(args.slot as ItemSlot)) {
      throw new ConvexError(`Invalid slot: ${args.slot}`);
    }
    const eq = await ctx.db
      .query('gameEquipment')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!eq) return null;
    await ctx.db.patch(eq._id, { [args.slot]: null, updatedAt: Date.now() });
    return null;
  },
});
