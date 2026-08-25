/**
 * Weak Spots — Per-user topic performance tracking in exam rooms.
 * Records correct/incorrect answers from quizzes and flashcards,
 * identifies struggling topics, and generates targeted review material.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { getTargetedReviewPrompt } from './examToolPrompts';
import type { LectureType } from './prompts';
import { awardXpHelper } from './studyQuest';
import { callClaude, extractJson } from './studyTools';

// ─── Pure Helpers ────────────────────────────────────────────

export interface TopicStat {
  topic: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  lastTestedAt: number;
}

/**
 * Fold one quiz/flashcard answer into a topic stats list, matching topics
 * case-insensitively. Returns a new array — does not mutate the input.
 */
export function updateTopicStats(
  topics: TopicStat[],
  topic: string,
  correct: boolean,
  now: number,
): TopicStat[] {
  const idx = topics.findIndex((t) => t.topic.toLowerCase() === topic.toLowerCase());

  if (idx < 0) {
    return [
      ...topics,
      {
        topic,
        correctCount: correct ? 1 : 0,
        totalCount: 1,
        accuracy: correct ? 1 : 0,
        lastTestedAt: now,
      },
    ];
  }

  const existing = topics[idx];
  const correctCount = existing.correctCount + (correct ? 1 : 0);
  const totalCount = existing.totalCount + 1;
  const updated = [...topics];
  updated[idx] = {
    ...existing,
    correctCount,
    totalCount,
    accuracy: totalCount > 0 ? correctCount / totalCount : 0,
    lastTestedAt: now,
  };
  return updated;
}

// ─── Queries ─────────────────────────────────────────────────

/** Get weak spots for the current user in an exam room, sorted by accuracy (worst first). */
export const getWeakSpots = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const doc = await ctx.db
      .query('weakSpots')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();

    if (!doc) return [];

    // Sort by accuracy ascending (worst topics first)
    return [...doc.topics].sort((a, b) => a.accuracy - b.accuracy);
  },
});

// ─── Mutations ──────────────────────────────────────────────

/** Record a quiz/flashcard performance data point. */
export const recordPerformance = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    topic: v.string(),
    correct: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const doc = await ctx.db
      .query('weakSpots')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();

    if (doc) {
      const topics = updateTopicStats(doc.topics, args.topic, args.correct, now);
      await ctx.db.patch(doc._id, { topics, updatedAt: now });
    } else {
      await ctx.db.insert('weakSpots', {
        examRoomId: args.examRoomId,
        userId,
        topics: updateTopicStats([], args.topic, args.correct, now),
        updatedAt: now,
      });
    }
  },
});

/** Reset weak spots data for the current user in an exam room. */
export const resetWeakSpots = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const doc = await ctx.db
      .query('weakSpots')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();

    if (doc) {
      await ctx.db.delete(doc._id);
    }
  },
});

// ─── Actions ────────────────────────────────────────────────

/** Generate targeted review material for weak topics. */
export const generateTargetedReview = action({
  args: {
    examRoomId: v.id('examRooms'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    const userId = identity.subject;

    // Get weak spots
    const weakSpotsDoc = await ctx.runQuery(internal.weakSpots.getWeakSpotsInternal, {
      examRoomId: args.examRoomId,
      userId,
    });

    if (!weakSpotsDoc || weakSpotsDoc.topics.length === 0) {
      throw new ConvexError('No weak spots data yet. Answer some quiz questions first.');
    }

    // Get bottom 5 topics by accuracy
    const sorted = [...weakSpotsDoc.topics].sort((a, b) => a.accuracy - b.accuracy);
    const weakTopics = sorted.slice(0, 5).map((t) => t.topic);

    // Get relevant session content for these topics
    const relevantSessions = await ctx.runQuery(internal.examBrain.getSessionContentForTopics, {
      examRoomId: args.examRoomId,
      topics: weakTopics,
    });

    if (relevantSessions.length === 0) {
      throw new ConvexError(
        'No session content available yet. Sessions may still be indexing — try again in a moment.',
      );
    }

    // Get all sessions to determine lecture type
    const allSessions = await ctx.runQuery(internal.examBrain.getAllSessionContent, {
      examRoomId: args.examRoomId,
    });
    const lectureType: LectureType = (allSessions[0]?.lectureType as LectureType) ?? 'general';

    const prompt = getTargetedReviewPrompt(weakTopics, relevantSessions, lectureType);
    const response = await callClaude(prompt, 4096, 0.4);
    const jsonStr = extractJson(response);

    // Validate
    JSON.parse(jsonStr);

    // Save as exam tool result
    await ctx.runMutation(internal.examTools.saveExamToolResult, {
      examRoomId: args.examRoomId,
      userId,
      toolType: 'targeted_review',
      result: jsonStr,
      sessionIds: allSessions.map((s) => s.sessionId),
    });

    // Award XP
    await ctx.runMutation(internal.weakSpots.awardTargetedReviewXp, { userId });

    return jsonStr;
  },
});

// ─── Internal Queries/Mutations ─────────────────────────────

/** Internal query for weak spots (used by actions). */
export const getWeakSpotsInternal = internalQuery({
  args: {
    examRoomId: v.id('examRooms'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('weakSpots')
      .withIndex('by_room_user', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', args.userId),
      )
      .unique();
  },
});

/** Award XP for completing targeted review (internal mutation). */
export const awardTargetedReviewXp = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await awardXpHelper(ctx, args.userId, 15, 'weak_spots', 'Completed targeted review');
  },
});
