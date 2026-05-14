import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import type { Doc } from './_generated/dataModel';

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
      course: s.course,
      audioStorageId: s.audioStorageId,
      audioStorageIds: s.audioStorageIds,
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
    course: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert('sessions', {
      userId,
      title: args.title,
      lectureType: args.lectureType ?? 'general',
      course: args.course,
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
    course: v.optional(v.string()),
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
    documentText: v.optional(v.string()),
    documentStorageIds: v.optional(v.array(v.string())),
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

// Append an audio chunk storageId to a session's audioStorageIds array.
// Used by the progressive uploader during recording and by the recovery flow.
// Atomic per-mutation — Convex serializes mutations on the same document.
export const appendAudioChunk = mutation({
  args: {
    id: v.id('sessions'),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or unauthorized');
    }
    const existing = session.audioStorageIds ?? [];
    await ctx.db.patch(args.id, {
      audioStorageIds: [...existing, args.storageId],
      updatedAt: Date.now(),
    });
  },
});

// Append a flagged word to the session's flaggedWords array.
export const appendFlaggedWord = mutation({
  args: {
    id: v.id('sessions'),
    text: v.string(),
    timestamp: v.number(),
    segmentIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or unauthorized');
    }
    const existing = session.flaggedWords ?? [];
    await ctx.db.patch(args.id, {
      flaggedWords: [
        ...existing,
        {
          text: args.text,
          timestamp: args.timestamp,
          segmentIndex: args.segmentIndex,
        },
      ],
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
      course: s.course,
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

// Merge multiple session fragments into one.
// primaryId is the session whose _id is kept; secondaryIds are soft-deleted after merge.
// All sessions are sorted chronologically before merging, so transcripts read in order
// regardless of which fragment the user selected as "primary."
// Timestamps in transcriptSegments, nuggetNotes, and flaggedWords are offset by the
// cumulative duration of all prior fragments so the timeline stays coherent.
export const mergeSessions = mutation({
  args: {
    primaryId: v.id('sessions'),
    secondaryIds: v.array(v.id('sessions')),
    newTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.secondaryIds.length === 0) throw new Error('No secondary sessions specified');

    const primary = await ctx.db.get(args.primaryId);
    if (!primary || primary.userId !== userId || primary.isDeleted) {
      throw new Error('Primary session not found');
    }

    const secondaries: Doc<'sessions'>[] = [];
    for (const id of args.secondaryIds) {
      const s = await ctx.db.get(id);
      if (!s || s.userId !== userId || s.isDeleted) {
        throw new Error(`Session not found: ${id}`);
      }
      secondaries.push(s);
    }

    // Sort all fragments chronologically so content reads in order
    const allSessions = [primary, ...secondaries].sort((a, b) => a.createdAt - b.createdAt);

    // Combine fields with cumulative time offsets for timestamps
    let cumulativeDuration = 0;
    const allTranscripts: string[] = [];
    const allSegments: { text: string; timestamp: number; isFinal: boolean }[] = [];
    const allNuggetNotes: { text: string; recordingTime: number }[] = [];
    const allAudioIds: string[] = [];
    const allDocumentTexts: string[] = [];
    const allFlaggedWords: { text: string; timestamp: number; segmentIndex?: number }[] = [];

    for (const session of allSessions) {
      const offset = cumulativeDuration;

      if (session.transcript) allTranscripts.push(session.transcript);

      for (const seg of session.transcriptSegments ?? []) {
        allSegments.push({ ...seg, timestamp: seg.timestamp + offset });
      }

      for (const note of session.nuggetNotes ?? []) {
        allNuggetNotes.push({ ...note, recordingTime: note.recordingTime + offset });
      }

      const audioIds =
        session.audioStorageIds ?? (session.audioStorageId ? [session.audioStorageId] : []);
      allAudioIds.push(...audioIds);

      if (session.documentText) allDocumentTexts.push(session.documentText);

      for (const fw of session.flaggedWords ?? []) {
        allFlaggedWords.push({ ...fw, timestamp: fw.timestamp + offset });
      }

      cumulativeDuration += session.duration;
    }

    // Fetch sessionNotes in chronological order, then merge TipTap JSON content arrays
    const notesDocs: (Doc<'sessionNotes'> | null)[] = [];
    for (const session of allSessions) {
      const notesDoc = await ctx.db
        .query('sessionNotes')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .unique();
      notesDocs.push(notesDoc);
    }

    const hasAnyNotes = notesDocs.some((d) => d?.content || d?.plainText);
    if (hasAnyNotes) {
      const combinedContent: unknown[] = [];
      let combinedPlainText = '';
      let first = true;

      for (const notesDoc of notesDocs) {
        if (!notesDoc?.content && !notesDoc?.plainText) continue;

        if (!first) {
          combinedContent.push({ type: 'horizontalRule' });
          combinedPlainText += '\n\n---\n\n';
        }

        if (notesDoc.content) {
          try {
            const parsed = JSON.parse(notesDoc.content) as { content?: unknown[] };
            combinedContent.push(...(parsed.content ?? []));
          } catch {
            combinedContent.push({
              type: 'paragraph',
              content: [{ type: 'text', text: notesDoc.content }],
            });
          }
        }

        if (notesDoc.plainText) combinedPlainText += notesDoc.plainText;
        first = false;
      }

      const mergedJson = JSON.stringify({ type: 'doc', content: combinedContent });
      const primaryIdx = allSessions.findIndex((s) => s._id === args.primaryId);
      const primaryNotesDoc = primaryIdx >= 0 ? notesDocs[primaryIdx] : null;

      if (primaryNotesDoc) {
        await ctx.db.patch(primaryNotesDoc._id, {
          content: mergedJson,
          plainText: combinedPlainText,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('sessionNotes', {
          sessionId: args.primaryId,
          userId,
          content: mergedJson,
          plainText: combinedPlainText,
          updatedAt: Date.now(),
        });
      }
    }

    // Update the primary session with combined data
    await ctx.db.patch(args.primaryId, {
      title: args.newTitle ?? primary.title,
      transcript: allTranscripts.length > 0 ? allTranscripts.join('\n\n---\n\n') : undefined,
      transcriptSegments: allSegments.length > 0 ? allSegments : undefined,
      nuggetNotes: allNuggetNotes.length > 0 ? allNuggetNotes : undefined,
      audioStorageIds: allAudioIds.length > 0 ? allAudioIds : undefined,
      duration: cumulativeDuration,
      documentText: allDocumentTexts.length > 0 ? allDocumentTexts.join('\n\n---\n\n') : undefined,
      flaggedWords: allFlaggedWords.length > 0 ? allFlaggedWords : undefined,
      updatedAt: Date.now(),
    });

    // Soft-delete secondary sessions
    const now = Date.now();
    for (const secondary of secondaries) {
      await ctx.db.patch(secondary._id, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    return args.primaryId;
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
