import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Recording sessions
  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    audioUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
    notes: v.optional(v.string()),
    duration: v.number(), // Duration in milliseconds
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_deleted', ['userId', 'isDeleted']),

  // Users (for future authentication)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    settings: v.optional(
      v.object({
        theme: v.string(),
        breakReminders: v.boolean(),
        breakInterval: v.number(),
        dailyGoalMinutes: v.number(),
        weeklyGoalMinutes: v.number(),
      }),
    ),
  }).index('by_email', ['email']),
});
