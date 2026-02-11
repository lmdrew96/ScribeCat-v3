import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  // Recording sessions
  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    lectureType: v.optional(v.string()), // "stem" | "humanities" | "discussion" | "lab" | "review" | "general"
    audioStorageId: v.optional(v.string()), // Convex storage ID for audio file
    transcript: v.optional(v.string()),
    quickNotes: v.optional(v.string()), // User's manual notes during recording
    transcriptSegments: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timestamp: v.number(), // Milliseconds from start
          isFinal: v.boolean(),
        }),
      ),
    ),
    notes: v.optional(v.string()),
    notesPlainText: v.optional(v.string()), // Plain text for search
    duration: v.number(), // Duration in milliseconds
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

  // User settings (extended from auth)
  userSettings: defineTable({
    userId: v.string(),
    theme: v.string(),
    breakReminders: v.boolean(),
    breakInterval: v.number(), // Minutes
    dailyGoalMinutes: v.number(),
    weeklyGoalMinutes: v.number(),
  }).index('by_user', ['userId']),
});
