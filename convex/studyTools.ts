/**
 * Study Tools — AI-powered study tool generation + CRUD
 * Each tool generates structured JSON output from session transcript/notes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConvexError, v } from 'convex/values';
import { action, internalMutation, mutation, query } from './_generated/server';
import { AI_MODEL } from './config';
import {
  getConceptMapPrompt,
  getEli5Prompt,
  getFlashcardPrompt,
  getKeyConceptsPrompt,
  getQuizPrompt,
  getSummaryPrompt,
} from './studyToolPrompts';

import { api, internal } from './_generated/api';
import { requireAuth } from './authHelpers';
import type { LectureType } from './prompts';
import { awardXpHelper } from './studyQuest';

// ─── Helpers ─────────────────────────────────────────────────

/** Strip markdown code fences that Claude sometimes wraps JSON in */
export function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text.trim();
}

/** Call Claude with the given prompt and settings */
export async function callClaude(
  prompt: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// ─── Queries ─────────────────────────────────────────────────

/** Get cached study tool result for a session */
export const getToolResult = query({
  args: {
    sessionId: v.id('sessions'),
    toolType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('studyToolResults')
      .withIndex('by_session_tool', (q) =>
        q.eq('sessionId', args.sessionId).eq('toolType', args.toolType),
      )
      .unique();
  },
});

/** Get all study tool results for a session */
export const getAllToolResults = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('studyToolResults')
      .withIndex('by_session_tool', (q) => q.eq('sessionId', args.sessionId))
      .collect();
  },
});

/** Get flashcard progress for a session */
export const getFlashcardProgress = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('flashcardProgress')
      .withIndex('by_user_session', (q) => q.eq('userId', userId).eq('sessionId', args.sessionId))
      .collect();
  },
});

/** Get quiz attempts for a session */
export const getQuizAttempts = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('quizAttempts')
      .withIndex('by_user_session', (q) => q.eq('userId', userId).eq('sessionId', args.sessionId))
      .collect();
  },
});

/** Get chat history for a session */
export const getChatHistory = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('chatHistory')
      .withIndex('by_user_session', (q) => q.eq('userId', userId).eq('sessionId', args.sessionId))
      .unique();
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Internal: save study tool result (called by actions) */
export const saveToolResult = internalMutation({
  args: {
    userId: v.string(),
    sessionId: v.id('sessions'),
    toolType: v.string(),
    result: v.string(),
    lectureType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete existing result for this session+tool
    const existing = await ctx.db
      .query('studyToolResults')
      .withIndex('by_session_tool', (q) =>
        q.eq('sessionId', args.sessionId).eq('toolType', args.toolType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        result: args.result,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    const id = await ctx.db.insert('studyToolResults', {
      userId: args.userId,
      sessionId: args.sessionId,
      toolType: args.toolType,
      result: args.result,
      lectureType: args.lectureType,
      createdAt: now,
      updatedAt: now,
    });

    // Award XP for first-time tool generation (not regeneration)
    await awardXpHelper(ctx, args.userId, 10, 'tool_use', `Generated ${args.toolType}`);

    return id;
  },
});

/** Delete a cached study tool result (for regeneration) */
export const deleteToolResult = mutation({
  args: {
    sessionId: v.id('sessions'),
    toolType: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query('studyToolResults')
      .withIndex('by_session_tool', (q) =>
        q.eq('sessionId', args.sessionId).eq('toolType', args.toolType),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Save flashcard progress */
export const saveFlashcardProgress = mutation({
  args: {
    sessionId: v.id('sessions'),
    cardIndex: v.number(),
    confidence: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('flashcardProgress')
      .withIndex('by_user_session', (q) => q.eq('userId', userId).eq('sessionId', args.sessionId))
      .collect();

    const card = existing.find((c) => c.cardIndex === args.cardIndex);
    const now = Date.now();

    // Simple spaced repetition intervals
    const intervals: Record<string, number> = {
      again: 1 * 60 * 1000, // 1 min
      hard: 10 * 60 * 1000, // 10 min
      good: 24 * 60 * 60 * 1000, // 1 day
      easy: 3 * 24 * 60 * 60 * 1000, // 3 days
    };

    if (card) {
      await ctx.db.patch(card._id, {
        confidence: args.confidence,
        lastReviewed: now,
        reviewCount: card.reviewCount + 1,
        nextReview: now + (intervals[args.confidence] || intervals.good),
      });
    } else {
      await ctx.db.insert('flashcardProgress', {
        userId,
        sessionId: args.sessionId,
        cardIndex: args.cardIndex,
        confidence: args.confidence,
        lastReviewed: now,
        reviewCount: 1,
        nextReview: now + (intervals[args.confidence] || intervals.good),
      });
    }
  },
});

/** Save quiz attempt */
export const saveQuizAttempt = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return await ctx.db.insert('quizAttempts', {
      userId,
      sessionId: args.sessionId,
      answers: args.answers,
      score: args.score,
      totalQuestions: args.totalQuestions,
      completedAt: Date.now(),
    });
  },
});

/** Save chat history */
export const saveChatHistory = mutation({
  args: {
    sessionId: v.id('sessions'),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('chatHistory')
      .withIndex('by_user_session', (q) => q.eq('userId', userId).eq('sessionId', args.sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('chatHistory', {
      userId,
      sessionId: args.sessionId,
      messages: args.messages,
      updatedAt: Date.now(),
    });
  },
});

// ─── Actions (AI Generation) ────────────────────────────────

/** Generate summary from session content */
export const generateSummary = action({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getSummaryPrompt(session.transcript, session.notesPlainText, lectureType);
    const response = await callClaude(prompt, 2048, 0.3);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'summary',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});

/** Generate key concepts from session content */
export const generateKeyConcepts = action({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getKeyConceptsPrompt(session.transcript, session.notesPlainText, lectureType);
    const response = await callClaude(prompt, 2048, 0.2);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'keyConcepts',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});

/** Generate flashcards from session content */
export const generateFlashcards = action({
  args: {
    sessionId: v.id('sessions'),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const count = args.count ?? 10;
    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getFlashcardPrompt(
      session.transcript,
      session.notesPlainText,
      lectureType,
      count,
    );
    const response = await callClaude(prompt, 3072, 0.4);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'flashcards',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});

/** Generate quiz from session content */
export const generateQuiz = action({
  args: {
    sessionId: v.id('sessions'),
    questionCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const questionCount = args.questionCount ?? 10;
    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getQuizPrompt(
      session.transcript,
      session.notesPlainText,
      lectureType,
      questionCount,
    );
    const response = await callClaude(prompt, 4096, 0.4);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'quiz',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});

/** Generate concept map from session content */
export const generateConceptMap = action({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getConceptMapPrompt(session.transcript, session.notesPlainText, lectureType);
    const response = await callClaude(prompt, 2048, 0.2);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'conceptMap',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});

/** Generate ELI5 explanations from session content */
export const generateEli5 = action({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) throw new Error('Session not found');
    if (!session.transcript) throw new Error('No transcript available');

    const lectureType = (session.lectureType || 'general') as LectureType;
    const prompt = getEli5Prompt(session.transcript, session.notesPlainText, lectureType);
    const response = await callClaude(prompt, 2048, 0.5);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyTools.saveToolResult, {
      userId: session.userId,
      sessionId: args.sessionId,
      toolType: 'eli5',
      result: JSON.stringify(parsed),
      lectureType: session.lectureType,
    });

    return parsed;
  },
});
