import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

/**
 * Helper to get the authenticated user's ID from the JWT token.
 * Throws if not authenticated.
 */
async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  return identity.subject;
}

// List all sessions for the authenticated user (excluding deleted)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', userId).eq('isDeleted', false))
      .order('desc')
      .collect();
  },
});

// Get a single session by ID
export const get = query({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new session
export const create = mutation({
  args: {
    title: v.string(),
    lectureType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert('sessions', {
      userId,
      title: args.title,
      lectureType: args.lectureType ?? 'general',
      duration: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  },
});

// Update session fields
export const update = mutation({
  args: {
    id: v.id('sessions'),
    title: v.optional(v.string()),
    audioStorageId: v.optional(v.string()),
    transcript: v.optional(v.string()),
    transcriptSegments: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timestamp: v.number(),
          isFinal: v.boolean(),
        }),
      ),
    ),
    lectureType: v.optional(v.string()),
    notes: v.optional(v.string()),
    notesPlainText: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined),
    );

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Soft delete a session (move to trash)
export const softDelete = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Restore a session from trash
export const restore = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Append transcript segment (for real-time transcription)
export const appendTranscriptSegment = mutation({
  args: {
    id: v.id('sessions'),
    text: v.string(),
    timestamp: v.number(),
    isFinal: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const session = await ctx.db.get(args.id);
    if (!session) throw new Error('Session not found');

    const segments = session.transcriptSegments || [];
    segments.push({
      text: args.text,
      timestamp: args.timestamp,
      isFinal: args.isFinal,
    });

    return await ctx.db.patch(args.id, {
      transcriptSegments: segments,
      updatedAt: Date.now(),
    });
  },
});

// Permanently delete a session
export const permanentDelete = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.delete(args.id);
  },
});

// List deleted sessions (trash) for the authenticated user
export const listDeleted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', userId).eq('isDeleted', true))
      .order('desc')
      .collect();
  },
});

// Clean up old deleted sessions (called by cron job)
export const cleanupOldDeleted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldDeletedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_deleted_at', (q) => q.eq('isDeleted', true))
      .collect();

    let deletedCount = 0;
    for (const session of oldDeletedSessions) {
      if (session.deletedAt && session.deletedAt < thirtyDaysAgo) {
        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }

    console.log(`Cleaned up ${deletedCount} sessions older than 30 days`);
    return { deletedCount };
  },
});
