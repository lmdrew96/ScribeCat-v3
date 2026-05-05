/**
 * StudyQuest inventory + equipment — queries and mutations.
 *
 * Bonus math (attack/defense) is computed server-side when fetching
 * equipment so the client doesn't need the item catalog. Battle scene
 * reads the resulting numbers via gameBridge.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
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
    return row?.items ?? [];
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

    const weapon = row?.weapon ?? null;
    const armor = row?.armor ?? null;
    const accessory = row?.accessory ?? null;

    let attackBonus = 0;
    let defenseBonus = 0;
    for (const id of [weapon, armor, accessory]) {
      if (!id) continue;
      const item = getItem(id);
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
