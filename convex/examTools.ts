/**
 * Exam Tools — Multi-session AI study tool generation for exam rooms.
 * Uses the Exam Room Brain for intelligent context routing.
 * Reuses callClaude + extractJson from studyTools.ts.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import {
  getExamConceptMapPrompt,
  getExamEli5Prompt,
  getExamFlashcardPrompt,
  getExamKeyConceptsPrompt,
  getExamQuizPrompt,
  getExamSummaryPrompt,
} from './examToolPrompts';
import type { LectureType } from './prompts';
import { awardXpHelper } from './studyQuest';
import { callClaude, extractJson } from './studyTools';

// ─── Queries ─────────────────────────────────────────────────

/** Get cached exam tool result. */
export const getExamToolResult = query({
  args: {
    examRoomId: v.id('examRooms'),
    toolType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    // Check for user-specific result first, then room-wide
    const userResult = await ctx.db
      .query('examToolResults')
      .withIndex('by_room_user_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', userId).eq('toolType', args.toolType),
      )
      .unique();
    if (userResult) return userResult;

    // Fall back to any result for this room + tool
    return await ctx.db
      .query('examToolResults')
      .withIndex('by_room_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('toolType', args.toolType),
      )
      .first();
  },
});

/** Get all exam tool results for a room. */
export const getAllExamToolResults = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('examToolResults')
      .withIndex('by_room_tool', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();
  },
});

// ─── Internal Mutations ─────────────────────────────────────

/** Save exam tool result + award XP on first generation per type. */
export const saveExamToolResult = internalMutation({
  args: {
    examRoomId: v.id('examRooms'),
    userId: v.string(),
    toolType: v.string(),
    result: v.string(),
    sessionIds: v.array(v.id('sessions')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if result already exists for this room + user + tool
    const existing = await ctx.db
      .query('examToolResults')
      .withIndex('by_room_user_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', args.userId).eq('toolType', args.toolType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        result: args.result,
        sessionIds: args.sessionIds,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('examToolResults', {
        examRoomId: args.examRoomId,
        userId: args.userId,
        toolType: args.toolType,
        result: args.result,
        sessionIds: args.sessionIds,
        createdAt: now,
        updatedAt: now,
      });

      // Award XP on first generation per tool type
      await awardXpHelper(ctx, args.userId, 10, 'tool_use', `Exam ${args.toolType}`);
    }
  },
});

// ─── Mutations ──────────────────────────────────────────────

/** Delete a cached exam tool result (to trigger regeneration). */
export const deleteExamToolResult = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    toolType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const existing = await ctx.db
      .query('examToolResults')
      .withIndex('by_room_user_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', userId).eq('toolType', args.toolType),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// ─── Actions (AI Generation) ────────────────────────────────

/** Generate any exam study tool. */
export const generateExamTool = action({
  args: {
    examRoomId: v.id('examRooms'),
    toolType: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    const userId = identity.subject;

    // Get brain context + all session content
    const [brain, sessions] = await Promise.all([
      ctx.runQuery(internal.examBrain.getExamRoomBrain, {
        examRoomId: args.examRoomId,
      }),
      ctx.runQuery(internal.examBrain.getAllSessionContent, {
        examRoomId: args.examRoomId,
      }),
    ]);

    if (sessions.length === 0) {
      throw new ConvexError('No sessions in this exam room. Add sessions first.');
    }

    // Determine dominant lecture type
    const typeCounts = new Map<string, number>();
    for (const s of sessions) {
      const t = s.lectureType || 'general';
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    let lectureType: LectureType = 'general';
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        lectureType = type as LectureType;
        maxCount = count;
      }
    }

    const sessionInput = sessions.map((s) => ({
      title: s.title,
      transcript: s.transcript,
      notes: s.notes,
    }));

    // Build the prompt based on tool type
    let prompt: string;
    let maxTokens = 4096;
    const temperature = 0.4;

    switch (args.toolType) {
      case 'summary':
        prompt = getExamSummaryPrompt(brain.brainContext, sessionInput, lectureType);
        break;
      case 'keyConcepts':
        prompt = getExamKeyConceptsPrompt(brain.brainContext, sessionInput, lectureType);
        break;
      case 'flashcards':
        prompt = getExamFlashcardPrompt(
          brain.brainContext,
          sessionInput,
          lectureType,
          args.count ?? 15,
        );
        maxTokens = 6144;
        break;
      case 'quiz':
        prompt = getExamQuizPrompt(brain.brainContext, sessionInput, lectureType, args.count ?? 15);
        maxTokens = 6144;
        break;
      case 'conceptMap':
        prompt = getExamConceptMapPrompt(brain.brainContext, sessionInput, lectureType);
        break;
      case 'eli5':
        prompt = getExamEli5Prompt(brain.brainContext, sessionInput, lectureType);
        break;
      default:
        throw new ConvexError(`Unknown tool type: ${args.toolType}`);
    }

    const response = await callClaude(prompt, maxTokens, temperature);
    const jsonStr = extractJson(response);

    // Validate it's parseable JSON
    JSON.parse(jsonStr);

    await ctx.runMutation(internal.examTools.saveExamToolResult, {
      examRoomId: args.examRoomId,
      userId,
      toolType: args.toolType,
      result: jsonStr,
      sessionIds: sessions.map((s) => s.sessionId),
    });

    return jsonStr;
  },
});
