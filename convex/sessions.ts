import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { requireAuth } from './auth-helpers';

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

// Lightweight list — metadata only (strips transcript, segments, notes, nuggetNotes)
export const listMetadata = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', userId).eq('isDeleted', false))
      .order('desc')
      .collect();
    return sessions.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      title: s.title,
      createdAt: s.createdAt,
      duration: s.duration,
      lectureType: s.lectureType,
      audioStorageId: s.audioStorageId,
    }));
  },
});

// Get a single session by ID (joins notes from sessionNotes table)
export const get = query({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // Join notes from separate table (fallback to legacy fields during migration)
    const notesDoc = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.id))
      .unique();

    // Resolve notes: prefer content (TipTap JSON), fall back to wrapping plainText
    let notes = notesDoc?.content ?? session.notes;
    const notesPlainText = notesDoc?.plainText ?? session.notesPlainText;

    if (!notes && notesPlainText) {
      // Content was lost but plainText survived — wrap it as minimal TipTap JSON
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

    return {
      ...session,
      notes,
      notesPlainText,
    };
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

// Update session fields (notes are routed to sessionNotes table)
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
    nuggetNotes: v.optional(
      v.array(
        v.object({
          text: v.string(),
          recordingTime: v.number(),
        }),
      ),
    ),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const { id, notes, notesPlainText, ...otherUpdates } = args;

    // Route notes to separate sessionNotes table
    if (notes !== undefined || notesPlainText !== undefined) {
      const existing = await ctx.db
        .query('sessionNotes')
        .withIndex('by_session', (q) => q.eq('sessionId', id))
        .unique();

      if (existing) {
        const notesPatch: Record<string, string | number> = { updatedAt: Date.now() };
        if (notes !== undefined) notesPatch.content = notes;
        if (notesPlainText !== undefined) notesPatch.plainText = notesPlainText;
        await ctx.db.patch(existing._id, notesPatch);
      } else {
        await ctx.db.insert('sessionNotes', {
          sessionId: id,
          userId,
          content: notes,
          plainText: notesPlainText,
          updatedAt: Date.now(),
        });
      }
    }

    // Patch session with non-notes fields only
    const filteredUpdates = Object.fromEntries(
      Object.entries(otherUpdates).filter(([_, value]) => value !== undefined),
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

// Permanently delete a session (cascades to sessionNotes)
export const permanentDelete = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Cascade-delete associated sessionNotes
    const notesDoc = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.id))
      .unique();
    if (notesDoc) {
      await ctx.db.delete(notesDoc._id);
    }

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

// Lightweight trash list — metadata only
export const listDeletedMetadata = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', userId).eq('isDeleted', true))
      .order('desc')
      .collect();
    return sessions.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      title: s.title,
      createdAt: s.createdAt,
      duration: s.duration,
      lectureType: s.lectureType,
    }));
  },
});

// Clean up old deleted sessions (called by cron job, cascades to sessionNotes)
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
        // Cascade-delete associated sessionNotes
        const notesDoc = await ctx.db
          .query('sessionNotes')
          .withIndex('by_session', (q) => q.eq('sessionId', session._id))
          .unique();
        if (notesDoc) {
          await ctx.db.delete(notesDoc._id);
        }

        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }

    console.log(`Cleaned up ${deletedCount} sessions older than 30 days`);
    return { deletedCount };
  },
});

// One-time migration: move notes from sessions to sessionNotes table.
// Run from Convex dashboard after deploying the schema change.
export const migrateNotesToSeparateTable = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.batchSize ?? 50;
    const allSessions = await ctx.db.query('sessions').collect();

    let migratedCount = 0;
    for (const session of allSessions) {
      if (migratedCount >= limit) break;
      if (!session.notes && !session.notesPlainText) continue;

      // Skip if already migrated
      const existing = await ctx.db
        .query('sessionNotes')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .unique();
      if (existing) continue;

      await ctx.db.insert('sessionNotes', {
        sessionId: session._id,
        userId: session.userId,
        content: session.notes,
        plainText: session.notesPlainText,
        updatedAt: session.updatedAt,
      });

      // Clear notes from session document to reclaim space
      await ctx.db.patch(session._id, {
        notes: undefined,
        notesPlainText: undefined,
      });

      migratedCount++;
    }

    console.log(`Migrated ${migratedCount} sessions (batch limit: ${limit})`);
    return { migratedCount, done: migratedCount < limit };
  },
});

// Repair sessionNotes rows where content is missing but plainText exists.
// Wraps plainText as minimal TipTap JSON so notes render in the editor.
export const repairSessionNotes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allNotes = await ctx.db.query('sessionNotes').collect();

    let repairedCount = 0;
    for (const doc of allNotes) {
      if (doc.content || !doc.plainText) continue;

      const paragraphs = doc.plainText.split('\n').filter(Boolean);
      const tiptapDoc = {
        type: 'doc',
        content: paragraphs.map((text: string) => ({
          type: 'paragraph',
          content: [{ type: 'text', text }],
        })),
      };

      await ctx.db.patch(doc._id, { content: JSON.stringify(tiptapDoc) });
      repairedCount++;
    }

    console.log(`Repaired ${repairedCount} sessionNotes rows`);
    return { repairedCount };
  },
});
