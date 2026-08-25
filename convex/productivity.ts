import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { awardXpHelper } from './studyQuest';

// ─── Settings ────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  theme: 'default',
  breakReminders: true,
  breakIntervalMinutes: 25,
  dailyGoalMinutes: 120,
  weeklyGoalMinutes: 600,
  courses: [] as string[],
  nuggetNotesEnabled: true,
  soundEnabled: true,
  tosAcceptedAt: undefined as number | undefined,
  tosVersion: undefined as string | undefined,
  onboardingDismissedAt: undefined as number | undefined,
};

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    return settings ?? { ...DEFAULT_SETTINGS, userId };
  },
});

export const updateSettings = mutation({
  args: {
    theme: v.optional(v.string()),
    breakReminders: v.optional(v.boolean()),
    breakIntervalMinutes: v.optional(v.number()),
    dailyGoalMinutes: v.optional(v.number()),
    weeklyGoalMinutes: v.optional(v.number()),
    courses: v.optional(v.array(v.string())),
    nuggetNotesEnabled: v.optional(v.boolean()),
    soundEnabled: v.optional(v.boolean()),
    tosAcceptedAt: v.optional(v.number()),
    tosVersion: v.optional(v.string()),
    audioRetentionMonths: v.optional(v.number()),
    timezone: v.optional(v.string()),
    onboardingDismissedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const updates = Object.fromEntries(
      Object.entries(args).filter(([_, value]) => value !== undefined),
    );

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert('userSettings', {
        userId,
        ...DEFAULT_SETTINGS,
        ...updates,
      });
    }
  },
});

// ─── Timezone Helpers ────────────────────────────────────────

/** Get today's date as YYYY-MM-DD in the user's timezone (falls back to UTC). */
function getLocalDateString(timezone?: string): string {
  if (!timezone) return new Date().toISOString().split('T')[0];
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Get a date N days ago as YYYY-MM-DD in the user's timezone. */
function getLocalDateStringDaysAgo(daysAgo: number, timezone?: string): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  if (!timezone) return d.toISOString().split('T')[0];
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
}

// ─── Study Stats ─────────────────────────────────────────────

export const getStudyStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Read user's timezone from settings
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    const tz = settings?.timezone;

    // Get today's date string in user's timezone
    const today = getLocalDateString(tz);

    // Get today's stats
    const todayStats = await ctx.db
      .query('studyStats')
      .withIndex('by_user_date', (q) => q.eq('userId', userId).eq('date', today))
      .unique();

    // Get all stats for this user to compute streak and weekly total
    const allStats = await ctx.db
      .query('studyStats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    // Compute current streak (consecutive days with goalMet, ending today or yesterday)
    const streak = computeStreak(allStats, today);

    // Compute weekly total (last 7 days)
    const weekStartStr = getLocalDateStringDaysAgo(6, tz);

    const weeklyMinutes = allStats
      .filter((s) => s.date >= weekStartStr && s.date <= today)
      .reduce((sum, s) => sum + s.studyMinutes, 0);

    // Total sessions count (all time)
    const totalSessions = allStats.reduce((sum, s) => sum + s.sessionsCount, 0);

    // Total minutes (all time)
    const totalMinutes = allStats.reduce((sum, s) => sum + s.studyMinutes, 0);

    return {
      today: {
        studyMinutes: todayStats?.studyMinutes ?? 0,
        sessionsCount: todayStats?.sessionsCount ?? 0,
        goalMinutes: todayStats?.goalMinutes ?? 120,
        goalMet: todayStats?.goalMet ?? false,
      },
      streak,
      weeklyMinutes,
      totalSessions,
      totalMinutes,
    };
  },
});

function computeStreak(stats: Array<{ date: string; goalMet: boolean }>, today: string): number {
  // Build a set of dates where goal was met
  const metDates = new Set(stats.filter((s) => s.goalMet).map((s) => s.date));

  let streak = 0;
  const date = new Date(today);

  // Check if today or yesterday is in the set to start counting
  if (!metDates.has(today)) {
    // Check yesterday (streak might still be active if they haven't finished today yet)
    date.setDate(date.getDate() - 1);
  }

  while (metDates.has(date.toISOString().split('T')[0])) {
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

export const logStudyTime = mutation({
  args: {
    durationMinutes: v.number(),
    sessionHour: v.number(), // Hour of day (0-23) when session was recorded
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Get user settings for goal + timezone
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const goalMinutes = settings?.dailyGoalMinutes ?? DEFAULT_SETTINGS.dailyGoalMinutes;
    const today = getLocalDateString(settings?.timezone);

    // Get or create today's stats
    const existing = await ctx.db
      .query('studyStats')
      .withIndex('by_user_date', (q) => q.eq('userId', userId).eq('date', today))
      .unique();

    if (existing) {
      const newMinutes = existing.studyMinutes + args.durationMinutes;
      const newCount = existing.sessionsCount + 1;
      await ctx.db.patch(existing._id, {
        studyMinutes: newMinutes,
        sessionsCount: newCount,
        goalMinutes: goalMinutes,
        goalMet: newMinutes >= goalMinutes,
      });
    } else {
      await ctx.db.insert('studyStats', {
        userId,
        date: today,
        studyMinutes: args.durationMinutes,
        sessionsCount: 1,
        goalMinutes: goalMinutes,
        goalMet: args.durationMinutes >= goalMinutes,
      });
    }

    // ─── Check achievements ──────────────────────────────────
    const allStats = await ctx.db
      .query('studyStats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const totalSessions = allStats.reduce((sum, s) => sum + s.sessionsCount, 0);
    const totalMinutes = allStats.reduce((sum, s) => sum + s.studyMinutes, 0);
    const streak = computeStreak(allStats, today);

    const unlocked = await ctx.db
      .query('achievements')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const unlockedIds = new Set(unlocked.map((a) => a.achievementId));

    const newUnlocks: string[] = [];

    const checks: Array<[string, boolean]> = [
      ['first-recording', totalSessions >= 1],
      ['10-recordings', totalSessions >= 10],
      ['50-recordings', totalSessions >= 50],
      ['1-hour', totalMinutes >= 60],
      ['10-hours', totalMinutes >= 600],
      ['50-hours', totalMinutes >= 3000],
      ['100-hours', totalMinutes >= 6000],
      ['3-day-streak', streak >= 3],
      ['7-day-streak', streak >= 7],
      ['14-day-streak', streak >= 14],
      ['30-day-streak', streak >= 30],
      ['night-owl', args.sessionHour >= 22],
      ['early-bird', args.sessionHour < 8],
      ['marathon', args.durationMinutes >= 60],
    ];

    for (const [id, condition] of checks) {
      if (condition && !unlockedIds.has(id)) {
        await ctx.db.insert('achievements', {
          userId,
          achievementId: id,
          unlockedAt: Date.now(),
        });
        newUnlocks.push(id);
      }
    }

    // ─── Award XP to cat companion ────────────────────────────
    let xpAmount = Math.round(args.durationMinutes * 2) + 25; // 2 XP/min + session bonus
    const newMinutes = existing
      ? existing.studyMinutes + args.durationMinutes
      : args.durationMinutes;
    const goalJustMet =
      newMinutes >= goalMinutes && (existing ? existing.studyMinutes < goalMinutes : false);
    if (goalJustMet) xpAmount += 50;
    xpAmount += newUnlocks.length * 30;

    await awardXpHelper(
      ctx,
      userId,
      xpAmount,
      'study_session',
      `${Math.round(args.durationMinutes)}min session`,
    );

    return { newUnlocks };
  },
});

// ─── Achievements ────────────────────────────────────────────

export const getAchievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('achievements')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

// Unlock the "first-notes" achievement (called from AI note generation)
export const unlockNotesAchievement = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('achievements')
      .withIndex('by_user_achievement', (q) =>
        q.eq('userId', userId).eq('achievementId', 'first-notes'),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert('achievements', {
        userId,
        achievementId: 'first-notes',
        unlockedAt: Date.now(),
      });
      return { unlocked: true };
    }
    return { unlocked: false };
  },
});
