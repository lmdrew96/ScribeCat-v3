/**
 * Session Sharing — Share sessions with friends for read-only viewing or copying.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { checkNotBlocked, sortParticipantIds, verifyFriendship } from './messagingHelpers';

// ─── Queries ─────────────────────────────────────────────────

/** List all sessions shared with the current user. */
export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const shares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_shared_with', (q) => q.eq('sharedWithUserId', userId))
      .collect();

    const results = await Promise.all(
      shares.map(async (share) => {
        const session = await ctx.db.get(share.sessionId);
        if (!session || session.isDeleted) return null;

        const ownerProfile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', share.ownerId))
          .unique();

        return {
          shareId: share._id,
          sessionId: share.sessionId,
          title: session.title,
          lectureType: session.lectureType,
          duration: session.duration,
          createdAt: session.createdAt,
          owner: {
            userId: share.ownerId,
            displayName: ownerProfile?.displayName ?? 'Unknown',
            username: ownerProfile?.username ?? 'unknown',
            avatarUrl: ownerProfile?.avatarUrl,
          },
          sharedAt: share.sharedAt,
          permission: share.permission,
        };
      }),
    );

    return results.filter(Boolean);
  },
});

/** Get full session data for a shared session (read-only view). */
export const getSharedSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify user has a share record
    const shares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
    const share = shares.find((s) => s.sharedWithUserId === userId);
    if (!share) throw new ConvexError('Session not shared with you');

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.isDeleted) throw new ConvexError('Session not found');

    // Join notes from sessionNotes table
    const notesDoc = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .unique();

    let notes = notesDoc?.content ?? session.notes;
    const notesPlainText = notesDoc?.plainText ?? session.notesPlainText;

    if (!notes && notesPlainText) {
      const paragraphs = notesPlainText.split('\n').filter(Boolean);
      const tiptapDoc = {
        type: 'doc',
        content: paragraphs.map((text: string) => ({
          type: 'paragraph',
          content: [{ type: 'text', text }],
        })),
      };
      notes = JSON.stringify(tiptapDoc);
    }

    // Get owner profile
    const ownerProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', session.userId))
      .unique();

    return {
      ...session,
      notes,
      notesPlainText,
      owner: {
        userId: session.userId,
        displayName: ownerProfile?.displayName ?? 'Unknown',
        username: ownerProfile?.username ?? 'unknown',
      },
    };
  },
});

/** List who a session has been shared with (for share modal). Owner only. */
export const listSharesForSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new ConvexError('Not your session');
    }

    const shares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    return Promise.all(
      shares.map(async (share) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', share.sharedWithUserId))
          .unique();
        return {
          shareId: share._id,
          userId: share.sharedWithUserId,
          username: profile?.username ?? 'unknown',
          displayName: profile?.displayName ?? 'Unknown',
          avatarUrl: profile?.avatarUrl,
          sharedAt: share.sharedAt,
        };
      }),
    );
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Share a session with a friend. Auto-sends a DM notification. */
export const shareSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    friendUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new ConvexError('Not your session');
    }

    await verifyFriendship(ctx, userId, args.friendUserId);
    await checkNotBlocked(ctx, userId, args.friendUserId);

    // Check for duplicate share
    const existingShares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_owner_session_user', (q) =>
        q
          .eq('ownerId', userId)
          .eq('sessionId', args.sessionId)
          .eq('sharedWithUserId', args.friendUserId),
      )
      .collect();
    if (existingShares.length > 0) {
      throw new ConvexError('Session already shared with this user');
    }

    const now = Date.now();

    // Create share record
    await ctx.db.insert('sharedSessions', {
      sessionId: args.sessionId,
      ownerId: userId,
      sharedWithUserId: args.friendUserId,
      permission: 'view',
      sharedAt: now,
    });

    // Auto-send a DM about the share
    const sorted = sortParticipantIds(userId, args.friendUserId);
    let conversation = await ctx.db
      .query('conversations')
      .withIndex('by_participant', (q) => q.eq('participantIds', sorted))
      .unique();

    if (!conversation) {
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
        userId: args.friendUserId,
        lastReadAt: now,
      });
      conversation = await ctx.db.get(conversationId);
    }

    if (conversation) {
      await ctx.db.insert('messages', {
        conversationId: conversation._id,
        senderId: userId,
        content: `Shared a session: ${session.title}`,
        messageType: 'session_share',
        sharedSessionId: args.sessionId,
        sharedSessionTitle: session.title,
        createdAt: now,
      });
      await ctx.db.patch(conversation._id, {
        lastMessageText: 'Shared a session',
        lastMessageAt: now,
      });

      // Mark as read for sender
      const senderRead = await ctx.db
        .query('conversationReads')
        .withIndex('by_conversation_user', (q) =>
          q.eq('conversationId', conversation._id).eq('userId', userId),
        )
        .unique();
      if (senderRead) {
        await ctx.db.patch(senderRead._id, { lastReadAt: now });
      }
    }
  },
});

/** Revoke a session share. */
export const unshareSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    friendUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new ConvexError('Not your session');
    }

    const shares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_owner_session_user', (q) =>
        q
          .eq('ownerId', userId)
          .eq('sessionId', args.sessionId)
          .eq('sharedWithUserId', args.friendUserId),
      )
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }
  },
});

/** Copy a shared session to the current user's library. */
export const copyToLibrary = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify share permission
    const shares = await ctx.db
      .query('sharedSessions')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
    const share = shares.find((s) => s.sharedWithUserId === userId);
    if (!share) throw new ConvexError('Session not shared with you');

    const original = await ctx.db.get(args.sessionId);
    if (!original || original.isDeleted) throw new ConvexError('Session not found');

    const now = Date.now();

    // Deep-copy the session
    const newSessionId = await ctx.db.insert('sessions', {
      userId,
      title: `${original.title} (copy)`,
      lectureType: original.lectureType,
      audioStorageId: original.audioStorageId, // Reference same audio file
      transcript: original.transcript,
      transcriptSegments: original.transcriptSegments,
      nuggetNotes: original.nuggetNotes,
      duration: original.duration,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    // Copy sessionNotes if they exist
    const notesDoc = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .unique();

    if (notesDoc) {
      await ctx.db.insert('sessionNotes', {
        sessionId: newSessionId,
        userId,
        content: notesDoc.content,
        plainText: notesDoc.plainText,
        updatedAt: now,
      });
    }

    return newSessionId;
  },
});
