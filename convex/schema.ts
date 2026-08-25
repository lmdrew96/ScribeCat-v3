import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Recording sessions
  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    lectureType: v.optional(v.string()),
    course: v.optional(v.string()),
    audioStorageId: v.optional(v.string()),
    audioStorageIds: v.optional(v.array(v.string())),
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
    // User-flagged transcript words (for manual post-recording edit)
    flaggedWords: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timestamp: v.number(),
          segmentIndex: v.optional(v.number()),
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
    documentText: v.optional(v.string()),
    documentStorageIds: v.optional(v.array(v.string())),
    audioDeletedAt: v.optional(v.number()),
    audioRetentionExtendedAt: v.optional(v.number()),
    speakerLabelsStatus: v.optional(
      v.union(v.literal('processing'), v.literal('labeled'), v.literal('failed')),
    ),
    speakerLabelsError: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_deleted', ['userId', 'isDeleted'])
    .index('by_user_course', ['userId', 'course'])
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
    soundEnabled: v.optional(v.boolean()),
    tosAcceptedAt: v.optional(v.number()),
    tosVersion: v.optional(v.string()),
    audioRetentionMonths: v.optional(v.number()),
    timezone: v.optional(v.string()),
    onboardingDismissedAt: v.optional(v.number()),
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
    coins: v.optional(v.number()),
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
    lastSeenAt: v.optional(v.number()),
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

  // Direct message conversations (one row per DM pair)
  conversations: defineTable({
    participantIds: v.array(v.string()), // always sorted [lower, higher] for dedup
    lastMessageText: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_participant', ['participantIds'])
    .index('by_last_message', ['lastMessageAt']),

  // Individual messages (one row per message)
  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.string(),
    content: v.string(),
    messageType: v.string(), // 'text' | 'session_share'
    sharedSessionId: v.optional(v.id('sessions')),
    sharedSessionTitle: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_conversation', ['conversationId', 'createdAt']),

  // Per-user read cursors for conversations
  conversationReads: defineTable({
    conversationId: v.id('conversations'),
    userId: v.string(),
    lastReadAt: v.number(),
  })
    .index('by_conversation_user', ['conversationId', 'userId'])
    .index('by_user', ['userId']),

  // Session sharing permissions
  sharedSessions: defineTable({
    sessionId: v.id('sessions'),
    ownerId: v.string(),
    sharedWithUserId: v.string(),
    permission: v.string(), // 'view'
    sharedAt: v.number(),
  })
    .index('by_shared_with', ['sharedWithUserId'])
    .index('by_session', ['sessionId'])
    .index('by_owner_session_user', ['ownerId', 'sessionId', 'sharedWithUserId']),

  // Study rooms (ephemeral group study sessions)
  studyRooms: defineTable({
    name: v.string(),
    hostUserId: v.string(),
    pinnedSessionId: v.optional(v.id('sessions')),
    pinnedSessionOwnerId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index('by_active', ['isActive']),

  // Study room members (one row per participant)
  studyRoomMembers: defineTable({
    roomId: v.id('studyRooms'),
    userId: v.string(),
    role: v.string(), // 'host' | 'member'
    hasJoined: v.boolean(), // false = invited but hasn't opened room yet
    lastSeenAt: v.number(),
    createdAt: v.number(),
    notesCursor: v.optional(v.string()), // JSON: {from: number, to: number} — cursor position in collab notes
  })
    .index('by_room', ['roomId'])
    .index('by_user', ['userId'])
    .index('by_room_user', ['roomId', 'userId']),

  // Study room chat messages
  studyRoomMessages: defineTable({
    roomId: v.id('studyRooms'),
    senderId: v.string(),
    content: v.string(),
    messageType: v.string(), // 'text' | 'system'
    createdAt: v.number(),
  }).index('by_room', ['roomId', 'createdAt']),

  // Study games (Quiz Battle / Jeopardy instances inside rooms or exam rooms)
  studyGames: defineTable({
    roomId: v.optional(v.id('studyRooms')), // set for study room games
    examRoomId: v.optional(v.id('examRooms')), // set for exam room games
    gameType: v.string(), // 'quiz_battle' | 'jeopardy'
    status: v.string(), // 'waiting' | 'generating' | 'active' | 'finished'
    hostUserId: v.string(),
    questions: v.optional(v.string()), // JSON blob (quiz array or jeopardy categories)
    currentRound: v.number(), // 0-indexed question pointer
    roundPhase: v.string(), // 'answering' | 'reveal' | 'selecting' (jeopardy)
    roundStartedAt: v.optional(v.number()),
    settings: v.string(), // JSON: { questionCount, timePerQuestion }
    // Jeopardy-specific
    revealedCells: v.optional(v.string()), // JSON: [[catIdx, valIdx], ...]
    currentTurnUserId: v.optional(v.string()),
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index('by_room', ['roomId'])
    .index('by_room_active', ['roomId', 'status'])
    .index('by_exam_room', ['examRoomId']),

  // Collaborative notes per study room
  roomNotes: defineTable({
    roomId: v.id('studyRooms'),
    content: v.string(), // TipTap JSON stringified
    updatedAt: v.number(),
    updatedBy: v.string(),
    updatedByName: v.string(),
  }).index('by_room', ['roomId']),

  // Study game players (one row per player per game)
  studyGamePlayers: defineTable({
    gameId: v.id('studyGames'),
    userId: v.string(),
    displayName: v.string(),
    catVariant: v.optional(v.string()),
    score: v.number(),
    isReady: v.boolean(),
    hasAnsweredCurrentRound: v.boolean(),
    lastAnswerCorrect: v.optional(v.boolean()),
    lastAnswerIndex: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_game', ['gameId'])
    .index('by_game_user', ['gameId', 'userId']),

  // ─── Exam Study Rooms ──────────────────────────────────────

  // Exam rooms (persistent, multi-session study environments)
  examRooms: defineTable({
    name: v.string(),
    hostUserId: v.string(),
    examDate: v.optional(v.number()),
    status: v.string(), // 'studying' | 'archived'
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_host', ['hostUserId', 'isActive'])
    .index('by_active', ['isActive']),

  // Exam room members (one row per participant)
  examRoomMembers: defineTable({
    examRoomId: v.id('examRooms'),
    userId: v.string(),
    role: v.string(), // 'host' | 'member'
    hasJoined: v.boolean(), // false = invited but hasn't opened room yet
    lastSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_room', ['examRoomId'])
    .index('by_user', ['userId'])
    .index('by_room_user', ['examRoomId', 'userId']),

  // Exam room sessions (junction: multiple sessions per exam room)
  examRoomSessions: defineTable({
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
    addedByUserId: v.string(),
    addedAt: v.number(),
    topicIndex: v.optional(v.string()), // JSON: {topics: [{topic, concepts, sessionTitle}], extractedAt}
  })
    .index('by_room', ['examRoomId'])
    .index('by_room_session', ['examRoomId', 'sessionId']),

  // Exam room chat messages
  examRoomMessages: defineTable({
    examRoomId: v.id('examRooms'),
    senderId: v.string(),
    content: v.string(),
    messageType: v.string(), // 'text' | 'system'
    createdAt: v.number(),
  }).index('by_room', ['examRoomId', 'createdAt']),

  // Exam tool results (multi-session, cached per room + tool type)
  examToolResults: defineTable({
    examRoomId: v.id('examRooms'),
    userId: v.string(),
    toolType: v.string(), // 6 standard + 'exam_sim' + 'targeted_review'
    result: v.string(), // JSON blob
    sessionIds: v.array(v.id('sessions')), // which sessions were used
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_room_tool', ['examRoomId', 'toolType'])
    .index('by_room_user_tool', ['examRoomId', 'userId', 'toolType']),

  // Exam chat history (multi-session Nugget Chat per user per room)
  examChatHistory: defineTable({
    examRoomId: v.id('examRooms'),
    userId: v.string(),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index('by_room_user', ['examRoomId', 'userId']),

  // ─── StudyQuest game state (Phase 4) ─────────────────────────

  // Per-user inventory of game items (weapons, armor, consumables).
  // Items live in `convex/items.ts` as a static catalog — this table
  // just tracks what each user owns and how many.
  gameInventory: defineTable({
    userId: v.string(),
    items: v.array(
      v.object({
        itemId: v.string(),
        quantity: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Per-user equipped gear. Each slot is either an item id or null.
  // Validation that the item exists / is equippable lives in mutations.
  gameEquipment: defineTable({
    userId: v.string(),
    weapon: v.union(v.string(), v.null()),
    armor: v.union(v.string(), v.null()),
    accessory: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // API keys for MCP server and third-party integrations
  apiKeys: defineTable({
    userId: v.string(),
    keyHash: v.string(), // SHA-256 of the plaintext key — never store plaintext
    label: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_hash', ['keyHash']),

  // Weak spots (per-user topic performance tracking in exam rooms)
  weakSpots: defineTable({
    examRoomId: v.id('examRooms'),
    userId: v.string(),
    topics: v.array(
      v.object({
        topic: v.string(),
        correctCount: v.number(),
        totalCount: v.number(),
        accuracy: v.number(), // 0-1
        lastTestedAt: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index('by_room_user', ['examRoomId', 'userId']),
});
