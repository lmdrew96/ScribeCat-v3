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
 *
 * The transcript *string* lives here too, in sessionTranscripts. It is not
 * derivable from the segments — the recorder saves Nugget's scrubbed text plus
 * the raw tail — and keeping it off the session row means a save during a
 * recording never touches a document the session lists read.
 */

import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { type MutationCtx, type QueryCtx, query } from './_generated/server';
import { requireAuth } from './authHelpers';

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
 * Falls back to the session's legacy array while one is still on the row.
 */
export async function readSegments(
  ctx: QueryCtx | MutationCtx,
  session: Doc<'sessions'>,
): Promise<TranscriptSegment[]> {
  if (session.transcriptSegments !== undefined) return session.transcriptSegments;

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
  if (session.transcriptSegments !== undefined) {
    const legacy = session.transcriptSegments;
    const combined = finals.length >= legacy.length ? finals : [...legacy, ...finals];
    return await replaceSegments(ctx, session, combined);
  }

  // The count is read off the chunks rather than kept on the session row, so
  // an append never writes the session document. Only the last chunk can be
  // partial — appends top it up before starting another, replaces fill in order.
  const lastChunk = await chunksFor(ctx, session._id).order('desc').first();
  const stored = lastChunk ? lastChunk.chunkIndex * CHUNK_SIZE + lastChunk.segments.length : 0;
  const incoming = finals.slice(stored);
  if (incoming.length === 0) return stored;

  let remaining = incoming;

  // Top up the last chunk before starting a new one.
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

  return stored + incoming.length;
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

  // The legacy array is dead once chunks exist — dropping it is what actually
  // shrinks the session document. Skipped when there's nothing to drop, so a
  // replace doesn't invalidate every query reading the session row.
  if (session.transcriptSegments !== undefined || session.segmentCount !== undefined) {
    await ctx.db.patch(session._id, { transcriptSegments: undefined, segmentCount: undefined });
  }
  return finals.length;
}

/** Removes every chunk for a session. Call when the session is deleted for good. */
export async function deleteSegments(ctx: MutationCtx, sessionId: Id<'sessions'>): Promise<void> {
  const chunks = await chunksFor(ctx, sessionId).order('asc').collect();
  for (const chunk of chunks) {
    await ctx.db.delete(chunk._id);
  }
}

/** Copies one session's segments and transcript onto another (a shared-session copy). */
export async function copySegments(
  ctx: MutationCtx,
  from: Doc<'sessions'>,
  to: Doc<'sessions'>,
): Promise<void> {
  const segments = await readSegments(ctx, from);
  if (segments.length > 0) await replaceSegments(ctx, to, segments);
  const text = await readTranscript(ctx, from);
  if (text !== undefined) await writeTranscript(ctx, to, text);
}

const transcriptRowFor = (ctx: QueryCtx | MutationCtx, sessionId: Id<'sessions'>) =>
  ctx.db
    .query('sessionTranscripts')
    .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
    .unique();

/**
 * A session's transcript text, or undefined if it has none.
 *
 * Falls back to the legacy `transcript` field on the session row until
 * dataRepair.migrateTranscriptText has moved it.
 */
export async function readTranscript(
  ctx: QueryCtx | MutationCtx,
  session: Doc<'sessions'>,
): Promise<string | undefined> {
  const row = await transcriptRowFor(ctx, session._id);
  return row?.text ?? session.transcript;
}

/**
 * Sets a session's transcript text. Clears the legacy field on the session row
 * the first time, which is the only write this makes to the session document.
 */
export async function writeTranscript(
  ctx: MutationCtx,
  session: Doc<'sessions'>,
  text: string,
): Promise<void> {
  const row = await transcriptRowFor(ctx, session._id);
  if (row) {
    if (row.text !== text) await ctx.db.patch(row._id, { text, updatedAt: Date.now() });
  } else {
    await ctx.db.insert('sessionTranscripts', {
      sessionId: session._id,
      userId: session.userId,
      text,
      updatedAt: Date.now(),
    });
  }
  if (session.transcript !== undefined) {
    await ctx.db.patch(session._id, { transcript: undefined });
  }
}

/** Removes a session's transcript text. Call when the session is deleted for good. */
export async function deleteTranscript(ctx: MutationCtx, sessionId: Id<'sessions'>): Promise<void> {
  const row = await transcriptRowFor(ctx, sessionId);
  if (row) await ctx.db.delete(row._id);
}

/**
 * A session's segments, on their own subscription.
 *
 * Kept out of `sessions.get` deliberately. Every transcript save patches the
 * session row, so anything joined onto `get` is re-read on every save of a live
 * recording — and `get` is subscribed app-wide for a couple of small string
 * fields. Only the views that actually render a transcript subscribe here.
 */
export const list = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId || session.isDeleted) return [];
    return await readSegments(ctx, session);
  },
});

/**
 * A session's transcript text, on its own subscription for the same reason as
 * `list`: it changes on every save during a recording, so only views that show
 * or send the transcript should be watching it.
 */
export const getText = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject || session.isDeleted) return null;
    return (await readTranscript(ctx, session)) ?? null;
  },
});
