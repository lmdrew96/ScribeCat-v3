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
    nuggetNotes: v.optional(
      v.array(
        v.object({
          text: v.string(),
          recordingTime: v.number(),
        }),
      ),
    ),
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

  // Session notes (separated from sessions to avoid 1MB document limit)
  sessionNotes: defineTable({
    sessionId: v.id('sessions'),
    userId: v.string(),
    content: v.optional(v.string()),
    plainText: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId']),

  // User settings
  userSettings: defineTable({
    userId: v.string(),
    theme: v.string(),
    breakReminders: v.boolean(),
    breakIntervalMinutes: v.number(),
    dailyGoalMinutes: v.number(),
    weeklyGoalMinutes: v.number(),
    courses: v.optional(v.array(v.string())),
    nuggetNotesEnabled: v.optional(v.boolean()),
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

  // Cat companion (StudyQuest — one row per user)
  catCompanion: defineTable({
    userId: v.string(),
    name: v.string(),
    variant: v.optional(v.string()),
    totalXp: v.number(),
    level: v.number(),
    mood: v.string(),
    lastActivityAt: v.number(),
    lastXpGains: v.array(
      v.object({
        amount: v.number(),
        source: v.string(),
        label: v.string(),
        timestamp: v.number(),
      }),
    ),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // AI study tool cached results (one row per tool per session)
  studyToolResults: defineTable({
    userId: v.string(),
    sessionId: v.id('sessions'),
    toolType: v.string(),
    result: v.string(),
    lectureType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_session_tool', ['sessionId', 'toolType'])
    .index('by_user', ['userId']),

  // Flashcard learning progress (spaced repetition tracking)
  flashcardProgress: defineTable({
    userId: v.string(),
    sessionId: v.id('sessions'),
    cardIndex: v.number(),
    confidence: v.string(),
    lastReviewed: v.number(),
    reviewCount: v.number(),
    nextReview: v.optional(v.number()),
  }).index('by_user_session', ['userId', 'sessionId']),

  // Quiz attempt history
  quizAttempts: defineTable({
    userId: v.string(),
    sessionId: v.id('sessions'),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        selectedAnswer: v.number(),
        correct: v.boolean(),
      }),
    ),
    score: v.number(),
    totalQuestions: v.number(),
    completedAt: v.number(),
  }).index('by_user_session', ['userId', 'sessionId']),

  // Persistent chat history per session
  chatHistory: defineTable({
    userId: v.string(),
    sessionId: v.id('sessions'),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index('by_user_session', ['userId', 'sessionId']),

  // User profiles (public identity for social features)
  userProfiles: defineTable({
    userId: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_username', ['username'])
    .searchIndex('search_username', {
      searchField: 'username',
      filterFields: [],
    }),

  // Friend requests + accepted friendships (one row per relationship)
  friendships: defineTable({
    requesterId: v.string(),
    receiverId: v.string(),
    status: v.string(), // 'pending' | 'accepted' | 'declined' | 'cancelled'
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_requester', ['requesterId', 'status'])
    .index('by_receiver', ['receiverId', 'status'])
    .index('by_pair', ['requesterId', 'receiverId']),

  // Blocked users (asymmetric, separate from friendships)
  blocks: defineTable({
    blockerId: v.string(),
    blockedId: v.string(),
    createdAt: v.number(),
  })
    .index('by_blocker', ['blockerId'])
    .index('by_blocked', ['blockedId'])
    .index('by_pair', ['blockerId', 'blockedId']),
});
