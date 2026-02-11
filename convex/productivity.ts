import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ─── Auth helper ─────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  return identity.subject;
}

// ─── Achievement definitions ─────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first-recording', name: 'First Steps', description: 'Complete your first recording' },
  { id: '10-recordings', name: 'Getting Started', description: 'Complete 10 recordings' },
  { id: '50-recordings', name: 'Dedicated Student', description: 'Complete 50 recordings' },
  { id: '1-hour', name: 'Hour of Power', description: 'Study for 1 total hour' },
  { id: '10-hours', name: 'Hitting Stride', description: 'Study for 10 total hours' },
  { id: '50-hours', name: 'Study Machine', description: 'Study for 50 total hours' },
  { id: '100-hours', name: 'Centurion', description: 'Study for 100 total hours' },
  { id: '3-day-streak', name: 'On a Roll', description: 'Maintain a 3-day streak' },
  { id: '7-day-streak', name: 'Week Warrior', description: 'Maintain a 7-day streak' },
  { id: '14-day-streak', name: 'Fortnight Focus', description: 'Maintain a 14-day streak' },
  { id: '30-day-streak', name: 'Unstoppable', description: 'Maintain a 30-day streak' },
  { id: 'first-notes', name: 'Note Taker', description: 'Generate AI notes for the first time' },
  { id: 'night-owl', name: 'Night Owl', description: 'Record a session after 10 PM' },
  { id: 'early-bird', name: 'Early Bird', description: 'Record a session before 8 AM' },
  { id: 'marathon', name: 'Marathon', description: 'Record a session over 1 hour long' },
] as const;

// ─── Settings ────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  theme: 'default',
  breakReminders: true,
  breakIntervalMinutes: 25,
  dailyGoalMinutes: 120,
  weeklyGoalMinutes: 600,
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

// ─── Study Stats ─────────────────────────────────────────────

export const getStudyStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    // Get today's date string
    const today = new Date().toISOString().split('T')[0];

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
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

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
    const today = new Date().toISOString().split('T')[0];

    // Get user settings for goal
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();

    const goalMinutes = settings?.dailyGoalMinutes ?? DEFAULT_SETTINGS.dailyGoalMinutes;

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
