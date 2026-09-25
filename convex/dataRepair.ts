/**
 * One-off data repairs. Internal — run from the CLI, never reachable from the app.
 *
 * Every repair here defaults to a dry run and reports exactly what it WOULD
 * change. Run it that way first, read the output, then run it with
 * `{ "dryRun": false }`.
 */

import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { CHUNK_SIZE, readSegments, replaceSegments, writeTranscript } from './transcriptSegments';

/**
 * Repairs session durations that were never written or were written negative.
 *
 * Two bugs left bad rows behind:
 *  - a clock that subtracted a full epoch timestamp, giving duration ≈ −now
 *    (fixed in v5.22.0)
 *  - the final save at stop failing or never running, leaving duration 0
 *    (made resilient in v5.31.0 — duration now rides along with periodic saves)
 *
 * The true length comes from the last transcript segment's timestamp, which is
 * ms since recording start. That slightly understates the recording (it ends at
 * the last spoken words, not the moment stop was pressed), which is far closer
 * than 0 or a negative number. Sessions with no segments can't be repaired and
 * are reported as skipped.
 */
export const repairDurations = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
    /**
     * Sessions per run. Deliberately small: a session document holds its whole
     * transcript (one is already 871 KB against the 1 MiB cap), and a single
     * function execution may only read 16 MiB. Reading them all at once fails.
     */
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 8 });
    const sessions = page.page;

    const repaired: {
      id: string;
      title: string;
      from: number;
      to: number;
      kind: 'negative' | 'zero';
    }[] = [];
    const skipped: { id: string; title: string; duration: number; reason: string }[] = [];

    for (const session of sessions) {
      if (session.duration > 0) continue;
      const kind = session.duration < 0 ? 'negative' : 'zero';

      const segments = (await readSegments(ctx, session)).filter((s) => s.isFinal);
      const lastMs = segments.length > 0 ? segments[segments.length - 1].timestamp : 0;

      if (lastMs <= 0) {
        skipped.push({
          id: session._id,
          title: session.title,
          duration: session.duration,
          reason: segments.length === 0 ? 'no transcript segments' : 'last segment at 0ms',
        });
        continue;
      }

      repaired.push({
        id: session._id,
        title: session.title,
        from: session.duration,
        to: lastMs,
        kind,
      });

      if (!dryRun) {
        await ctx.db.patch(session._id, { duration: lastMs, updatedAt: Date.now() });
      }
    }

    return {
      dryRun,
      scanned: sessions.length,
      repairedCount: repaired.length,
      skippedCount: skipped.length,
      repaired,
      skipped,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Reports sessions whose duration is still negative, by recording date — used
 * to confirm the v5.22.0 clock fix actually stopped the bleeding before the
 * repair above closes the books on it.
 */
export const findNegativeDurations = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Paginated for the same reason as the repair above — reading every
    // session's transcript in one execution exceeds the 16 MiB read limit.
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 8 });

    return {
      found: page.page
        .filter((s) => s.duration < 0)
        .map((s) => ({
          id: s._id,
          title: s.title,
          createdAt: new Date(s.createdAt).toISOString(),
          duration: s.duration,
        })),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Moves legacy `session.transcriptSegments` arrays into the transcriptChunks
 * table and clears the field, which is what actually shrinks the session row.
 *
 * Safe to re-run: a session with no legacy array left is skipped. Readers
 * fall back to the legacy field until a session is migrated, so the app works
 * correctly at every point during the run.
 */
export const migrateTranscriptSegments = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
    /** Small by design — these are the very documents that are too big to read in bulk. */
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 5 });

    const migrated: { id: string; title: string; segments: number; chunks: number }[] = [];
    let alreadyDone = 0;
    let nothingToMove = 0;

    for (const session of page.page) {
      if (session.transcriptSegments === undefined) {
        alreadyDone++;
        continue;
      }

      const legacy = session.transcriptSegments;
      const finals = legacy.filter((s) => s.isFinal);

      if (legacy.length === 0) {
        // Nothing to move — just drop the empty array so a re-run skips it.
        nothingToMove++;
        if (!dryRun) {
          await ctx.db.patch(session._id, { transcriptSegments: undefined });
        }
        continue;
      }

      migrated.push({
        id: session._id,
        title: session.title,
        segments: finals.length,
        chunks: Math.ceil(finals.length / CHUNK_SIZE),
      });

      if (!dryRun) {
        await replaceSegments(ctx, session, finals);
      }
    }

    return {
      dryRun,
      scanned: page.page.length,
      migratedCount: migrated.length,
      alreadyDone,
      nothingToMove,
      migrated,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Verifies segment storage: for each session, compares the count appendSegments
 * derives from the last chunk against the segments actually readable, and
 * reports any session still holding a legacy array. A mismatch means the
 * "only the last chunk is partial" invariant broke, and appends would skip or
 * duplicate segments.
 */
export const verifyTranscriptMigration = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 5 });

    const mismatches: { id: string; title: string; expected: number; actual: number }[] = [];
    let legacyRemaining = 0;
    let totalSegments = 0;
    let largestChunkCount = 0;

    for (const session of page.page) {
      if (session.transcriptSegments !== undefined) legacyRemaining++;

      const actual = await readSegments(ctx, session);
      totalSegments += actual.length;

      const chunks = await ctx.db
        .query('transcriptChunks')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      largestChunkCount = Math.max(largestChunkCount, chunks.length);

      const last = chunks[chunks.length - 1];
      const derived = last ? last.chunkIndex * CHUNK_SIZE + last.segments.length : 0;
      if (session.transcriptSegments === undefined && derived !== actual.length) {
        mismatches.push({
          id: session._id,
          title: session.title,
          expected: derived,
          actual: actual.length,
        });
      }
    }

    return {
      scanned: page.page.length,
      totalSegments,
      legacyRemaining,
      largestChunkCount,
      mismatches,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Moves the legacy `session.transcript` string into sessionTranscripts and
 * clears it, along with the now-unused `segmentCount`, from the session row.
 *
 * Safe to re-run: a session with neither field left is skipped. Readers fall
 * back to the legacy field until a session is moved, so the app works
 * correctly at every point during the run. If a sessionTranscripts row already
 * exists (the session was saved to since the deploy) it is newer and wins.
 */
export const migrateTranscriptText = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
    /** Small by design — the rows being slimmed are the large ones. */
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 10 });

    const moved: { id: string; title: string; chars: number }[] = [];
    let keptNewerRow = 0;
    let countOnly = 0;
    let alreadyDone = 0;

    for (const session of page.page) {
      if (session.transcript === undefined && session.segmentCount === undefined) {
        alreadyDone++;
        continue;
      }

      if (session.transcript === undefined) {
        countOnly++;
        if (!dryRun) await ctx.db.patch(session._id, { segmentCount: undefined });
        continue;
      }

      const existing = await ctx.db
        .query('sessionTranscripts')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .unique();

      if (existing) {
        keptNewerRow++;
        if (!dryRun) {
          await ctx.db.patch(session._id, { transcript: undefined, segmentCount: undefined });
        }
        continue;
      }

      moved.push({ id: session._id, title: session.title, chars: session.transcript.length });
      if (!dryRun) {
        await writeTranscript(ctx, session, session.transcript);
        if (session.segmentCount !== undefined) {
          await ctx.db.patch(session._id, { segmentCount: undefined });
        }
      }
    }

    return {
      dryRun,
      scanned: page.page.length,
      movedCount: moved.length,
      keptNewerRow,
      countOnly,
      alreadyDone,
      moved,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Verifies migrateTranscriptText: reports any session still carrying the legacy
 * `transcript` or `segmentCount` field, and any sessionTranscripts row that
 * doesn't belong to its session's owner.
 */
export const verifyTranscriptTextMigration = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('sessions')
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize ?? 25 });

    const legacyText: string[] = [];
    const legacyCount: string[] = [];
    const ownerMismatch: string[] = [];
    let withText = 0;

    for (const session of page.page) {
      if (session.transcript !== undefined) legacyText.push(session._id);
      if (session.segmentCount !== undefined) legacyCount.push(session._id);

      const row = await ctx.db
        .query('sessionTranscripts')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .unique();
      if (row) {
        withText++;
        if (row.userId !== session.userId) ownerMismatch.push(session._id);
      }
    }

    return {
      scanned: page.page.length,
      withText,
      legacyText,
      legacyCount,
      ownerMismatch,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});
