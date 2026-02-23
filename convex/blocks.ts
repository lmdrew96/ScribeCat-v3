/**
 * Blocks — Block/unblock users. Blocking removes any existing friendship.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';

// ─── Queries ─────────────────────────────────────────────────

/** List all users I've blocked */
export const listBlocked = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const blocked = await ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect();

    return Promise.all(
      blocked.map(async (b) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', b.blockedId))
          .unique();
        return {
          blockId: b._id,
          userId: b.blockedId,
          username: profile?.username ?? 'unknown',
          displayName: profile?.displayName ?? 'Unknown',
          createdAt: b.createdAt,
        };
      }),
    );
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Block a user (also removes any existing friendship) */
export const blockUser = mutation({
  args: { blockedId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (userId === args.blockedId) throw new ConvexError('Cannot block yourself');

    // Check if already blocked
    const existing = await ctx.db
      .query('blocks')
      .withIndex('by_pair', (q) => q.eq('blockerId', userId).eq('blockedId', args.blockedId))
      .unique();
    if (existing) throw new ConvexError('Already blocked');

    // Remove any existing friendship (both directions)
    const f1 = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', userId).eq('receiverId', args.blockedId))
      .unique();
    const f2 = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', args.blockedId).eq('receiverId', userId))
      .unique();
    if (f1) await ctx.db.delete(f1._id);
    if (f2) await ctx.db.delete(f2._id);

    await ctx.db.insert('blocks', {
      blockerId: userId,
      blockedId: args.blockedId,
      createdAt: Date.now(),
    });
  },
});

/** Unblock a user */
export const unblockUser = mutation({
  args: { blockedId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const block = await ctx.db
      .query('blocks')
      .withIndex('by_pair', (q) => q.eq('blockerId', userId).eq('blockedId', args.blockedId))
      .unique();
    if (!block) throw new ConvexError('User is not blocked');
    await ctx.db.delete(block._id);
  },
});
