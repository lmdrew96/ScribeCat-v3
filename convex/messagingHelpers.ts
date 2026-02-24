/**
 * Shared helpers for messaging and session sharing.
 */

import { ConvexError } from 'convex/values';
import type { QueryCtx } from './_generated/server';

/** Sort two participant IDs alphabetically for canonical conversation dedup. */
export function sortParticipantIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Verify that two users are accepted friends. Throws if not. */
export async function verifyFriendship(ctx: QueryCtx, userId: string, otherUserId: string) {
  const f1 = await ctx.db
    .query('friendships')
    .withIndex('by_pair', (q) => q.eq('requesterId', userId).eq('receiverId', otherUserId))
    .unique();
  const f2 = await ctx.db
    .query('friendships')
    .withIndex('by_pair', (q) => q.eq('requesterId', otherUserId).eq('receiverId', userId))
    .unique();

  const friendship = f1 ?? f2;
  if (!friendship || friendship.status !== 'accepted') {
    throw new ConvexError('Must be friends to perform this action');
  }
}

/** Check that neither user has blocked the other. Throws if blocked. */
export async function checkNotBlocked(ctx: QueryCtx, userId: string, otherUserId: string) {
  const theyBlockedMe = await ctx.db
    .query('blocks')
    .withIndex('by_pair', (q) => q.eq('blockerId', otherUserId).eq('blockedId', userId))
    .unique();
  if (theyBlockedMe) throw new ConvexError('Cannot message this user');

  const iBlockedThem = await ctx.db
    .query('blocks')
    .withIndex('by_pair', (q) => q.eq('blockerId', userId).eq('blockedId', otherUserId))
    .unique();
  if (iBlockedThem) throw new ConvexError('You have blocked this user');
}
