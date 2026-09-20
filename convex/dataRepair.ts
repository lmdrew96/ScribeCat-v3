/**
 * One-off data repairs. Internal — run from the CLI, never reachable from the app.
 *
 * Every repair here defaults to a dry run and reports exactly what it WOULD
 * change. Run it that way first, read the output, then run it with
 * `{ "dryRun": false }`.
 */

import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

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
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const sessions = await ctx.db.query('sessions').collect();

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

      const segments = (session.transcriptSegments ?? []).filter((s) => s.isFinal);
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
    };
  },
});

/**
 * Reports sessions whose duration is still negative, by recording date — used
 * to confirm the v5.22.0 clock fix actually stopped the bleeding before the
 * repair above closes the books on it.
 */
export const findNegativeDurations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query('sessions').collect();
    return sessions
      .filter((s) => s.duration < 0)
      .map((s) => ({
        id: s._id,
        title: s.title,
        createdAt: new Date(s.createdAt).toISOString(),
        duration: s.duration,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});
