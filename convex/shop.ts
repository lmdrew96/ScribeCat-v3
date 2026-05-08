/**
 * StudyQuest shop — buy items with coins earned from battle victories.
 *
 * The catalog of purchasable items lives in `items.ts` (any item with a
 * `price` field is for sale). This file just exposes the listing query
 * and the purchase mutation; granting/coin math reuses the same helpers
 * the inventory and cat systems already use.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import { requireAuth } from './authHelpers';
import { ITEMS, getItem } from './items';
import { adjustCoinsHelper } from './studyQuest';

export const getShopItems = query({
  args: {},
  handler: async () => {
    return Object.values(ITEMS)
      .filter((item) => typeof item.price === 'number')
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  },
});

async function grantItemForPurchase(
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
  const idx = inv.items.findIndex((i) => i.itemId === itemId);
  const newItems =
    idx >= 0
      ? inv.items.map((entry, i) =>
          i === idx ? { ...entry, quantity: entry.quantity + quantity } : entry,
        )
      : [...inv.items, { itemId, quantity }];
  await ctx.db.patch(inv._id, { items: newItems, updatedAt: now });
}

export const purchaseItem = mutation({
  args: { itemId: v.string(), quantity: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const qty = Math.max(1, Math.min(99, Math.floor(args.quantity ?? 1)));
    const item = getItem(args.itemId);
    if (!item) throw new ConvexError(`Unknown item: ${args.itemId}`);
    if (typeof item.price !== 'number') {
      throw new ConvexError(`${item.name} is not for sale`);
    }
    const totalCost = item.price * qty;
    const newBalance = await adjustCoinsHelper(ctx, userId, -totalCost);
    if (newBalance === null) throw new ConvexError('Adopt a cat first');
    await grantItemForPurchase(ctx, userId, args.itemId, qty);
    return { itemId: args.itemId, itemName: item.name, quantity: qty, coins: newBalance };
  },
});
