/**
 * Exam Simulation — Timed, proctored-style practice exams.
 * Generates exam-grade questions across Bloom's taxonomy levels.
 * Tracks attempts with scores for progress monitoring.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { action, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { getExamSimulationPrompt } from './examToolPrompts';
import type { LectureType } from './prompts';
import { awardXpHelper } from './studyQuest';
import { callClaude, extractJson } from './studyTools';

// ─── Queries ─────────────────────────────────────────────────

/** Get the current exam simulation for a room (questions with answers stripped for active attempts). */
export const getExamSimulation = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const result = await ctx.db
      .query('examToolResults')
      .withIndex('by_room_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('toolType', 'exam_sim'),
      )
      .first();

    return result;
  },
});

/** Get the current user's exam simulation attempts for progress tracking. */
export const getExamSimulationAttempts = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Attempts are stored as exam tool results with type 'exam_sim_attempt'
    const attempts = await ctx.db
      .query('examToolResults')
      .withIndex('by_room_user_tool', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', userId).eq('toolType', 'exam_sim_attempt'),
      )
      .collect();

    return attempts.map((a) => {
      const data = JSON.parse(a.result);
      return {
        id: a._id,
        score: data.score as number,
        totalQuestions: data.totalQuestions as number,
        timeUsed: data.timeUsed as number,
        completedAt: a.createdAt,
        topicBreakdown: data.topicBreakdown as Array<{
          topic: string;
          correct: number;
          total: number;
        }>,
      };
    });
  },
});

// ─── Actions ────────────────────────────────────────────────

/** Generate a practice exam simulation. */
export const generateExamSimulation = action({
  args: {
    examRoomId: v.id('examRooms'),
    questionCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    const userId = identity.subject;

    const [brain, sessions] = await Promise.all([
      ctx.runQuery(internal.examBrain.getExamRoomBrain, {
        examRoomId: args.examRoomId,
      }),
      ctx.runQuery(internal.examBrain.getAllSessionContent, {
        examRoomId: args.examRoomId,
      }),
    ]);

    if (sessions.length === 0) {
      throw new ConvexError('No sessions in this exam room.');
    }

    const questionCount = args.questionCount ?? 20;

    // Determine lecture type
    const lectureType: LectureType = (sessions[0]?.lectureType as LectureType) ?? 'general';

    const sessionInput = sessions.map((s) => ({
      title: s.title,
      transcript: s.transcript,
      notes: s.notes,
    }));

    const prompt = getExamSimulationPrompt(
      brain.brainContext,
      sessionInput,
      lectureType,
      questionCount,
    );

    const response = await callClaude(prompt, 8192, 0.4);
    const jsonStr = extractJson(response);

    // Validate
    JSON.parse(jsonStr);

    // Save as exam tool result
    await ctx.runMutation(internal.examTools.saveExamToolResult, {
      examRoomId: args.examRoomId,
      userId,
      toolType: 'exam_sim',
      result: jsonStr,
      sessionIds: sessions.map((s) => s.sessionId),
    });

    return jsonStr;
  },
});

// ─── Mutations ──────────────────────────────────────────────

/** Save an exam simulation attempt with score and breakdown. */
export const saveExamSimulationAttempt = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        selectedAnswer: v.number(),
        correct: v.boolean(),
        topic: v.string(),
      }),
    ),
    score: v.number(),
    totalQuestions: v.number(),
    timeUsed: v.number(), // milliseconds
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    // Calculate topic breakdown
    const topicMap = new Map<string, { correct: number; total: number }>();
    for (const answer of args.answers) {
      const existing = topicMap.get(answer.topic) ?? { correct: 0, total: 0 };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      topicMap.set(answer.topic, existing);
    }

    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
    }));

    const attemptData = {
      score: args.score,
      totalQuestions: args.totalQuestions,
      timeUsed: args.timeUsed,
      answers: args.answers,
      topicBreakdown,
    };

    // Get session IDs for the room
    const sessionLinks = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    await ctx.db.insert('examToolResults', {
      examRoomId: args.examRoomId,
      userId,
      toolType: 'exam_sim_attempt',
      result: JSON.stringify(attemptData),
      sessionIds: sessionLinks.map((l) => l.sessionId),
      createdAt: now,
      updatedAt: now,
    });

    // Award XP
    await awardXpHelper(ctx, userId, 20, 'exam_sim', 'Completed exam simulation');

    // Bonus XP for high score
    const percentage = args.totalQuestions > 0 ? args.score / args.totalQuestions : 0;
    if (percentage >= 0.8) {
      await awardXpHelper(ctx, userId, 10, 'exam_sim', 'Scored 80%+ on exam simulation');
    }

    return { topicBreakdown, percentage };
  },
});
