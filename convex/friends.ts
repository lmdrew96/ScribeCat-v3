/**
 * Friends — Friend requests, friend list, and relationship management.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './auth-helpers';

// ─── Queries ─────────────────────────────────────────────────

/** List all accepted friends with profile + cat info */
export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Friendships where I'm the requester
    const asRequester = await ctx.db
      .query('friendships')
      .withIndex('by_requester', (q) => q.eq('requesterId', userId).eq('status', 'accepted'))
      .collect();

    // Friendships where I'm the receiver
    const asReceiver = await ctx.db
      .query('friendships')
      .withIndex('by_receiver', (q) => q.eq('receiverId', userId).eq('status', 'accepted'))
      .collect();

    // Get friend userIds
    const friendIds = [
      ...asRequester.map((f) => f.receiverId),
      ...asReceiver.map((f) => f.requesterId),
    ];

    // Batch-fetch profiles + cat companions
    const friends = await Promise.all(
      friendIds.map(async (friendId) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', friendId))
          .unique();
        const cat = await ctx.db
          .query('catCompanion')
          .withIndex('by_user', (q) => q.eq('userId', friendId))
          .unique();
        return profile
          ? {
              userId: friendId,
              username: profile.username,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              catVariant: cat?.variant ?? null,
              catName: cat?.name ?? null,
              catLevel: cat?.level ?? null,
            }
          : null;
      }),
    );

    return friends.filter(Boolean);
  },
});

/** List pending friend requests (incoming + outgoing) */
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const incoming = await ctx.db
      .query('friendships')
      .withIndex('by_receiver', (q) => q.eq('receiverId', userId).eq('status', 'pending'))
      .collect();

    const outgoing = await ctx.db
      .query('friendships')
      .withIndex('by_requester', (q) => q.eq('requesterId', userId).eq('status', 'pending'))
      .collect();

    const enrichRequests = async (
      requests: typeof incoming,
      direction: 'incoming' | 'outgoing',
    ) => {
      return Promise.all(
        requests.map(async (req) => {
          const otherUserId = direction === 'incoming' ? req.requesterId : req.receiverId;
          const profile = await ctx.db
            .query('userProfiles')
            .withIndex('by_user', (q) => q.eq('userId', otherUserId))
            .unique();
          return {
            _id: req._id,
            direction,
            otherUserId,
            username: profile?.username ?? 'unknown',
            displayName: profile?.displayName ?? 'Unknown',
            avatarUrl: profile?.avatarUrl,
            createdAt: req.createdAt,
          };
        }),
      );
    };

    return {
      incoming: await enrichRequests(incoming, 'incoming'),
      outgoing: await enrichRequests(outgoing, 'outgoing'),
    };
  },
});

/** Lightweight count of pending incoming requests (for TopBar badge) */
export const pendingRequestCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const incoming = await ctx.db
      .query('friendships')
      .withIndex('by_receiver', (q) => q.eq('receiverId', userId).eq('status', 'pending'))
      .collect();
    return incoming.length;
  },
});

/** Check friendship status between current user and another user */
export const getFriendshipStatus = query({
  args: { otherUserId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const asRequester = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', userId).eq('receiverId', args.otherUserId))
      .unique();

    const asReceiver = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', args.otherUserId).eq('receiverId', userId))
      .unique();

    const friendship = asRequester ?? asReceiver;
    if (!friendship) return { status: 'none' as const };

    return {
      status: friendship.status as 'pending' | 'accepted' | 'declined' | 'cancelled',
      direction: friendship.requesterId === userId ? ('outgoing' as const) : ('incoming' as const),
      friendshipId: friendship._id,
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Send a friend request */
export const sendRequest = mutation({
  args: { receiverId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (userId === args.receiverId) {
      throw new ConvexError('Cannot send friend request to yourself');
    }

    // Check if blocked (either direction)
    const theyBlockedMe = await ctx.db
      .query('blocks')
      .withIndex('by_pair', (q) => q.eq('blockerId', args.receiverId).eq('blockedId', userId))
      .unique();
    if (theyBlockedMe) throw new ConvexError('Cannot send request to this user');

    const iBlockedThem = await ctx.db
      .query('blocks')
      .withIndex('by_pair', (q) => q.eq('blockerId', userId).eq('blockedId', args.receiverId))
      .unique();
    if (iBlockedThem) throw new ConvexError('You have blocked this user. Unblock first.');

    // Check for existing relationship (either direction)
    const existing1 = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', userId).eq('receiverId', args.receiverId))
      .unique();
    const existing2 = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', args.receiverId).eq('receiverId', userId))
      .unique();

    const existing = existing1 ?? existing2;
    if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
      throw new ConvexError(
        existing.status === 'accepted' ? 'Already friends' : 'Request already pending',
      );
    }

    // Clean up old declined/cancelled request
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const now = Date.now();
    return await ctx.db.insert('friendships', {
      requesterId: userId,
      receiverId: args.receiverId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Accept an incoming friend request */
export const acceptRequest = mutation({
  args: { friendshipId: v.id('friendships') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) throw new ConvexError('Request not found');
    if (friendship.receiverId !== userId) throw new ConvexError('Not your request to accept');
    if (friendship.status !== 'pending') throw new ConvexError('Request is no longer pending');

    await ctx.db.patch(args.friendshipId, {
      status: 'accepted',
      updatedAt: Date.now(),
    });
  },
});

/** Decline an incoming friend request */
export const declineRequest = mutation({
  args: { friendshipId: v.id('friendships') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) throw new ConvexError('Request not found');
    if (friendship.receiverId !== userId) throw new ConvexError('Not your request to decline');
    if (friendship.status !== 'pending') throw new ConvexError('Request is no longer pending');

    await ctx.db.patch(args.friendshipId, {
      status: 'declined',
      updatedAt: Date.now(),
    });
  },
});

/** Cancel an outgoing friend request */
export const cancelRequest = mutation({
  args: { friendshipId: v.id('friendships') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) throw new ConvexError('Request not found');
    if (friendship.requesterId !== userId) throw new ConvexError('Not your request to cancel');
    if (friendship.status !== 'pending') throw new ConvexError('Request is no longer pending');

    await ctx.db.patch(args.friendshipId, {
      status: 'cancelled',
      updatedAt: Date.now(),
    });
  },
});

/** Remove a friend (unfriend) */
export const removeFriend = mutation({
  args: { friendUserId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Find the friendship row (either direction)
    const asRequester = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', userId).eq('receiverId', args.friendUserId))
      .unique();
    const asReceiver = await ctx.db
      .query('friendships')
      .withIndex('by_pair', (q) => q.eq('requesterId', args.friendUserId).eq('receiverId', userId))
      .unique();

    const friendship = asRequester ?? asReceiver;
    if (!friendship) throw new ConvexError('Friendship not found');
    if (friendship.status !== 'accepted') throw new ConvexError('Not currently friends');

    await ctx.db.delete(friendship._id);
  },
});
