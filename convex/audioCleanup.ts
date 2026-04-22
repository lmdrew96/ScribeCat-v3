import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';

const DEFAULT_RETENTION_MONTHS = 6;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Daily cron job: delete audio files from sessions that have exceeded
 * the user's retention period. Only audio is removed — transcripts,
 * notes, and summaries are preserved.
 */
export const cleanupExpiredAudio = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all sessions that still have audio and are not deleted
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_deleted_at', (q) => q.eq('isDeleted', false))
      .collect();

    const sessionsWithAudio = sessions.filter(
      (s) => s.audioStorageId || (s.audioStorageIds && s.audioStorageIds.length > 0),
    );
    if (sessionsWithAudio.length === 0) return { deletedCount: 0 };

    // Group by user to look up retention settings
    const userIds = [...new Set(sessionsWithAudio.map((s) => s.userId))];
    const settingsMap = new Map<string, number>();

    for (const userId of userIds) {
      const settings = await ctx.db
        .query('userSettings')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      const months = settings?.audioRetentionMonths ?? DEFAULT_RETENTION_MONTHS;
      settingsMap.set(userId, months);
    }

    let deletedCount = 0;
    for (const session of sessionsWithAudio) {
      const retentionMonths = settingsMap.get(session.userId) ?? DEFAULT_RETENTION_MONTHS;

      // 0 = never delete
      if (retentionMonths === 0) continue;

      const retentionMs = retentionMonths * 30 * 24 * 60 * 60 * 1000;
      const baseTime = session.audioRetentionExtendedAt ?? session.createdAt;
      const cutoff = baseTime + retentionMs;

      if (now >= cutoff) {
        // Delete both legacy single-file and multi-part chunk storage
        if (session.audioStorageId) {
          await ctx.storage.delete(session.audioStorageId as string);
        }
        if (session.audioStorageIds) {
          for (const id of session.audioStorageIds) {
            await ctx.storage.delete(id as string);
          }
        }
        await ctx.db.patch(session._id, {
          audioStorageId: undefined,
          audioStorageIds: undefined,
          audioDeletedAt: now,
        });
        deletedCount++;
      }
    }

    console.log(`Audio cleanup: deleted ${deletedCount} expired audio files`);
    return { deletedCount };
  },
});

/**
 * Query sessions approaching their audio deletion date (within 7 days).
 * Used by the client to show a warning banner.
 */
export const getSessionsApproachingDeletion = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const now = Date.now();

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const retentionMonths = settings?.audioRetentionMonths ?? DEFAULT_RETENTION_MONTHS;

    // If retention is disabled, nothing is approaching deletion
    if (retentionMonths === 0) return [];

    const retentionMs = retentionMonths * 30 * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', userId).eq('isDeleted', false))
      .collect();

    return sessions
      .filter((s) => {
        const hasAudio = s.audioStorageId || (s.audioStorageIds && s.audioStorageIds.length > 0);
        if (!hasAudio) return false;
        const baseTime = s.audioRetentionExtendedAt ?? s.createdAt;
        const cutoff = baseTime + retentionMs;
        const daysUntilDeletion = cutoff - now;
        return daysUntilDeletion > 0 && daysUntilDeletion <= SEVEN_DAYS_MS;
      })
      .map((s) => ({
        _id: s._id,
        title: s.title,
        createdAt: s.createdAt,
        daysRemaining: Math.ceil(
          ((s.audioRetentionExtendedAt ?? s.createdAt) + retentionMs - now) / (24 * 60 * 60 * 1000),
        ),
      }));
  },
});

/**
 * Extend audio retention for specific sessions by resetting the clock.
 */
export const extendRetention = mutation({
  args: { sessionIds: v.array(v.id('sessions')) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    for (const id of args.sessionIds) {
      const session = await ctx.db.get(id);
      const hasAudio =
        session &&
        (session.audioStorageId || (session.audioStorageIds && session.audioStorageIds.length > 0));
      if (session && session.userId === userId && hasAudio) {
        await ctx.db.patch(id, { audioRetentionExtendedAt: now });
      }
    }
  },
});
