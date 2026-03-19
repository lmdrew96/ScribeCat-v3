/**
 * Messaging — Direct messages between friends.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { checkNotBlocked, sortParticipantIds, verifyFriendship } from './messagingHelpers';

// ─── Queries ─────────────────────────────────────────────────

/** List all conversations for the current user (inbox). */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Get all read cursors for this user
    const reads = await ctx.db
      .query('conversationReads')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const conversations = await Promise.all(
      reads.map(async (read) => {
        const conversation = await ctx.db.get(read.conversationId);
        if (!conversation) return null;

        // Find the other participant
        const otherUserId = conversation.participantIds.find((id) => id !== userId);
        if (!otherUserId) return null;

        const [profile, cat] = await Promise.all([
          ctx.db
            .query('userProfiles')
            .withIndex('by_user', (q) => q.eq('userId', otherUserId))
            .unique(),
          ctx.db
            .query('catCompanion')
            .withIndex('by_user', (q) => q.eq('userId', otherUserId))
            .unique(),
        ]);
        if (!profile) return null;

        const hasUnread =
          conversation.lastMessageAt !== undefined && conversation.lastMessageAt > read.lastReadAt;

        return {
          conversationId: conversation._id,
          otherUser: {
            userId: otherUserId,
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            catVariant: cat?.variant ?? null,
            catLevel: cat?.level ?? null,
          },
          lastMessageText: conversation.lastMessageText ?? null,
          lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
          hasUnread,
        };
      }),
    );

    // Filter nulls and sort by most recent message
    return conversations
      .filter(Boolean)
      .sort((a, b) => (b?.lastMessageAt ?? 0) - (a?.lastMessageAt ?? 0));
  },
});

/** Get messages for a conversation. */
export const getMessages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify user is a participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError('Conversation not found');
    if (!conversation.participantIds.includes(userId)) {
      throw new ConvexError('Not a participant');
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();

    return messages;
  },
});

/** Total unread conversation count (for TopBar badge). */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const reads = await ctx.db
      .query('conversationReads')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const conversationResults = await Promise.all(reads.map((r) => ctx.db.get(r.conversationId)));
    return conversationResults.filter(
      (conv, i) => conv?.lastMessageAt !== undefined && conv.lastMessageAt > reads[i].lastReadAt,
    ).length;
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Find or create a conversation between the current user and another user. */
export const getOrCreateConversation = mutation({
  args: { otherUserId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (userId === args.otherUserId) throw new ConvexError('Cannot message yourself');

    await verifyFriendship(ctx, userId, args.otherUserId);
    await checkNotBlocked(ctx, userId, args.otherUserId);

    const sorted = sortParticipantIds(userId, args.otherUserId);

    // Look for existing conversation
    const existing = await ctx.db
      .query('conversations')
      .withIndex('by_participant', (q) => q.eq('participantIds', sorted))
      .unique();

    if (existing) return existing._id;

    // Create new conversation + read cursors
    const now = Date.now();
    const conversationId = await ctx.db.insert('conversations', {
      participantIds: sorted,
      createdAt: now,
    });

    await ctx.db.insert('conversationReads', {
      conversationId,
      userId,
      lastReadAt: now,
    });
    await ctx.db.insert('conversationReads', {
      conversationId,
      userId: args.otherUserId,
      lastReadAt: now,
    });

    return conversationId;
  },
});

/** Send a message in a conversation. */
export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
    messageType: v.optional(v.string()),
    sharedSessionId: v.optional(v.id('sessions')),
    sharedSessionTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new ConvexError('Conversation not found');
    if (!conversation.participantIds.includes(userId)) {
      throw new ConvexError('Not a participant');
    }

    const otherUserId = conversation.participantIds.find((id) => id !== userId);
    if (otherUserId) {
      await checkNotBlocked(ctx, userId, otherUserId);
    }

    const now = Date.now();
    const type = args.messageType ?? 'text';

    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: userId,
      content: args.content,
      messageType: type,
      sharedSessionId: args.sharedSessionId,
      sharedSessionTitle: args.sharedSessionTitle,
      createdAt: now,
    });

    // Update conversation preview
    await ctx.db.patch(args.conversationId, {
      lastMessageText: type === 'session_share' ? 'Shared a session' : args.content,
      lastMessageAt: now,
    });

    // Mark as read for sender
    const senderRead = await ctx.db
      .query('conversationReads')
      .withIndex('by_conversation_user', (q) =>
        q.eq('conversationId', args.conversationId).eq('userId', userId),
      )
      .unique();
    if (senderRead) {
      await ctx.db.patch(senderRead._id, { lastReadAt: now });
    }
  },
});

/** Mark a conversation as read. */
export const markRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const read = await ctx.db
      .query('conversationReads')
      .withIndex('by_conversation_user', (q) =>
        q.eq('conversationId', args.conversationId).eq('userId', userId),
      )
      .unique();

    if (read) {
      await ctx.db.patch(read._id, { lastReadAt: Date.now() });
    }
  },
});
