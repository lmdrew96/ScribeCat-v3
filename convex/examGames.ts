/**
 * Exam Games — Game creation and management for exam rooms.
 * Uses the same studyGames/studyGamePlayers tables but with examRoomId instead of roomId.
 * Gameplay mechanics (submit answer, advance round, etc.) are handled by studyGames.ts.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { postExamSystemMessage, requireExamRoomHost, requireExamRoomMember } from './examRooms';

// ─── Queries ────────────────────────────────────────────────

/** Get the active (non-finished) game for an exam room. */
export const getActiveExamGame = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const games = await ctx.db
      .query('studyGames')
      .withIndex('by_exam_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const game = games.find((g) => g.status !== 'finished');
    if (!game) return null;

    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', game._id))
      .collect();

    // Same privacy filtering as studyGames.getActiveGame
    let currentQuestion = null;
    if (game.questions && game.status === 'active') {
      if (game.gameType === 'quiz_battle') {
        try {
          const parsed = JSON.parse(game.questions);
          const q = parsed.questions?.[game.currentRound];
          if (q) {
            currentQuestion =
              game.roundPhase === 'answering' ? { ...q, correctIndex: -1, explanation: '' } : q;
          }
        } catch {
          // Malformed questions
        }
      } else if (game.gameType === 'jeopardy' && game.roundPhase !== 'selecting') {
        try {
          const parsed = JSON.parse(game.questions);
          const catIdx = Math.floor(game.currentRound / 5);
          const qIdx = game.currentRound % 5;
          const q = parsed.categories?.[catIdx]?.questions?.[qIdx];
          if (q) {
            currentQuestion =
              game.roundPhase === 'answering'
                ? {
                    question: q.question,
                    options: q.options,
                    correctIndex: -1,
                    explanation: '',
                    topic: parsed.categories[catIdx].name,
                  }
                : {
                    question: q.question,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation,
                    topic: parsed.categories[catIdx].name,
                  };
          }
        } catch {
          // Malformed questions
        }
      }
    }

    let categoryNames: string[] | null = null;
    if (game.gameType === 'jeopardy' && game.questions) {
      try {
        const parsed = JSON.parse(game.questions);
        categoryNames = parsed.categories?.map((c: { name: string }) => c.name) ?? null;
      } catch {
        // Malformed
      }
    }

    const sanitizedPlayers = players.map((p) => {
      if (game.roundPhase === 'answering' && p.userId !== userId) {
        return { ...p, lastAnswerCorrect: undefined, lastAnswerIndex: undefined };
      }
      return p;
    });

    return {
      ...game,
      questions: undefined,
      players: sanitizedPlayers,
      currentQuestion,
      categoryNames,
    };
  },
});

/** Get finished game results for exam rooms. */
export const getExamGameResults = query({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game || !game.examRoomId) return null;

    await requireExamRoomMember(ctx, game.examRoomId, userId);

    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect();

    return {
      ...game,
      questions: undefined,
      players: players.sort((a, b) => b.score - a.score),
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────

/** Create a game in an exam room. Requires sessions to be added. */
export const createExamGame = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    gameType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomHost(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room?.isActive) throw new ConvexError('Exam room is not active');

    // Check sessions exist
    const sessionLinks = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();
    if (sessionLinks.length === 0) throw new ConvexError('Add sessions first');

    // Ensure no active game
    const existingGames = await ctx.db
      .query('studyGames')
      .withIndex('by_exam_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();
    const activeGame = existingGames.find((g) => g.status !== 'finished');
    if (activeGame) throw new ConvexError('A game is already in progress');

    if (args.gameType !== 'quiz_battle' && args.gameType !== 'jeopardy') {
      throw new ConvexError('Invalid game type');
    }

    const now = Date.now();
    const gameId = await ctx.db.insert('studyGames', {
      examRoomId: args.examRoomId,
      gameType: args.gameType,
      status: 'waiting',
      hostUserId: userId,
      currentRound: 0,
      roundPhase: 'answering',
      settings: JSON.stringify({
        questionCount: args.gameType === 'quiz_battle' ? 10 : 25,
        timePerQuestion: 15,
      }),
      createdAt: now,
    });

    // Auto-add all joined exam room members as players
    const members = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    for (const member of members) {
      if (!member.hasJoined) continue;

      const profile = await ctx.db
        .query('userProfiles')
        .withIndex('by_user', (q) => q.eq('userId', member.userId))
        .unique();
      const cat = await ctx.db
        .query('catCompanion')
        .withIndex('by_user', (q) => q.eq('userId', member.userId))
        .unique();

      await ctx.db.insert('studyGamePlayers', {
        gameId,
        userId: member.userId,
        displayName: profile?.displayName ?? 'Player',
        catVariant: cat?.variant,
        score: 0,
        isReady: false,
        hasAnsweredCurrentRound: false,
        createdAt: now,
      });
    }

    const gameLabel = args.gameType === 'quiz_battle' ? 'Quiz Battle' : 'Jeopardy';
    await postExamSystemMessage(ctx, args.examRoomId, `${gameLabel} started! Get ready.`);

    return gameId;
  },
});
