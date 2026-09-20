/**
 * Transcript segment storage.
 *
 * Segments used to live in an array on the session document. A session row
 * therefore grew with its transcript, and Convex caps a document at 1 MiB and
 * 8192 array elements — one real session was measured at 871 KB. Past the cap
 * EVERY save of that session fails, which froze transcripts at their last good
 * write and left durations at 0.
 *
 * They now live in their own table, in chunks, the way notes moved to
 * sessionNotes. A session's size no longer depends on how long the lecture ran.
 *
 * Only FINAL segments are stored. The trailing partial is live UI state, and
 * leaving it out makes saves append-only: each one writes just the new
 * segments instead of rewriting the whole transcript.
 */

import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export const segmentValidator = v.object({
  text: v.string(),
  timestamp: v.number(),
  isFinal: v.boolean(),
});

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

/**
 * Segments per chunk row. At ~100 bytes a segment this keeps a row near 40 KB —
 * far below the document cap, while one row per segment would mean thousands of
 * rows for a single lecture.
 */
export const CHUNK_SIZE = 400;

const chunksFor = (ctx: QueryCtx | MutationCtx, sessionId: Id<'sessions'>) =>
  ctx.db.query('transcriptChunks').withIndex('by_session', (q) => q.eq('sessionId', sessionId));

/**
 * Every stored segment for a session, in order.
 *
 * Falls back to the session's legacy array while it is still unmigrated —
 * `segmentCount` is what marks a session as moved.
 */
export async function readSegments(
  ctx: QueryCtx | MutationCtx,
  session: Doc<'sessions'>,
): Promise<TranscriptSegment[]> {
  if (session.segmentCount === undefined) return session.transcriptSegments ?? [];

  const chunks = await chunksFor(ctx, session._id).order('asc').collect();
  return chunks.flatMap((chunk) => chunk.segments);
}

/**
 * Appends the segments that aren't stored yet and returns the new total.
 *
 * `segments` is the full transcript so far (partials are ignored); anything
 * already stored is skipped, so repeated saves during a recording cost only
 * what was said since the last one.
 */
export async function appendSegments(
  ctx: MutationCtx,
  session: Doc<'sessions'>,
  segments: TranscriptSegment[],
): Promise<number> {
  const finals = segments.filter((s) => s.isFinal);

  // An unmigrated session carries its history in the legacy field — fold it in
  // and clear it, so the row shrinks the first time it is written to.
  if (session.segmentCount === undefined) {
    const legacy = session.transcriptSegments ?? [];
    const combined = finals.length >= legacy.length ? finals : [...legacy, ...finals];
    return await replaceSegments(ctx, session, combined);
  }

  const stored = session.segmentCount;
  const incoming = finals.slice(stored);
  if (incoming.length === 0) return stored;

  let remaining = incoming;

  // Top up the last chunk before starting a new one.
  const lastChunk = await chunksFor(ctx, session._id).order('desc').first();
  if (lastChunk && lastChunk.segments.length < CHUNK_SIZE) {
    const room = CHUNK_SIZE - lastChunk.segments.length;
    await ctx.db.patch(lastChunk._id, {
      segments: [...lastChunk.segments, ...remaining.slice(0, room)],
    });
    remaining = remaining.slice(room);
  }

  let nextIndex = (lastChunk?.chunkIndex ?? -1) + 1;
  for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
    await ctx.db.insert('transcriptChunks', {
      sessionId: session._id,
      userId: session.userId,
      chunkIndex: nextIndex,
      segments: remaining.slice(i, i + CHUNK_SIZE),
    });
    nextIndex++;
  }

  const total = stored + incoming.length;
  await ctx.db.patch(session._id, { segmentCount: total });
  return total;
}

/**
 * Replaces a session's segments wholesale. For rewrites rather than growth:
 * speaker labelling, a merge, an uploaded file, or migrating a legacy session.
 */
export async function replaceSegments(
  ctx: MutationCtx,
  session: Doc<'sessions'>,
  segments: TranscriptSegment[],
): Promise<number> {
  await deleteSegments(ctx, session._id);

  const finals = segments.filter((s) => s.isFinal);
  for (let i = 0; i < finals.length; i += CHUNK_SIZE) {
    await ctx.db.insert('transcriptChunks', {
      sessionId: session._id,
      userId: session.userId,
      chunkIndex: i / CHUNK_SIZE,
      segments: finals.slice(i, i + CHUNK_SIZE),
    });
  }

  await ctx.db.patch(session._id, {
    segmentCount: finals.length,
    // The legacy array is dead once chunks exist — dropping it is what
    // actually shrinks the session document.
    transcriptSegments: undefined,
  });
  return finals.length;
}

/** Removes every chunk for a session. Call when the session is deleted for good. */
export async function deleteSegments(ctx: MutationCtx, sessionId: Id<'sessions'>): Promise<void> {
  const chunks = await chunksFor(ctx, sessionId).order('asc').collect();
  for (const chunk of chunks) {
    await ctx.db.delete(chunk._id);
  }
}

/** Copies one session's segments onto another (a shared-session copy). */
export async function copySegments(
  ctx: MutationCtx,
  from: Doc<'sessions'>,
  to: Doc<'sessions'>,
): Promise<void> {
  const segments = await readSegments(ctx, from);
  if (segments.length > 0) await replaceSegments(ctx, to, segments);
}
