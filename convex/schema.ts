import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Recording sessions
  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    lectureType: v.optional(v.string()),
    audioStorageId: v.optional(v.string()),
    transcript: v.optional(v.string()),
    quickNotes: v.optional(v.string()),
    transcriptSegments: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timestamp: v.number(),
          isFinal: v.boolean(),
        }),
      ),
    ),
    notes: v.optional(v.string()),
    notesPlainText: v.optional(v.string()),
    duration: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_deleted', ['userId', 'isDeleted'])
    .index('by_deleted_at', ['isDeleted', 'deletedAt'])
    .searchIndex('search_notes', {
      searchField: 'notesPlainText',
      filterFields: ['userId', 'isDeleted'],
    }),

  // User settings
  userSettings: defineTable({
    userId: v.string(),
    theme: v.string(),
    breakReminders: v.boolean(),
    breakIntervalMinutes: v.number(),
    dailyGoalMinutes: v.number(),
    weeklyGoalMinutes: v.number(),
  }).index('by_user', ['userId']),

  // Daily study stats (one row per user per day)
  studyStats: defineTable({
    userId: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    studyMinutes: v.number(),
    sessionsCount: v.number(),
    goalMinutes: v.number(),
    goalMet: v.boolean(),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_user', ['userId']),

  // Unlocked achievements
  achievements: defineTable({
    userId: v.string(),
    achievementId: v.string(),
    unlockedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_achievement', ['userId', 'achievementId']),
});
