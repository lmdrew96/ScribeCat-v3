/**
 * Study Games — Quiz Battle & Jeopardy multiplayer games inside study rooms or exam rooms.
 * Games require a pinned session (study rooms) or multi-session brain (exam rooms).
 * Questions are AI-generated from session content.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { requireAuth } from './authHelpers';
import { buildExamInput } from './examToolPrompts';
import type { LectureType } from './prompts';
import { awardXpHelper } from './studyQuest';
import { postSystemMessage, requireRoomHost, requireRoomMember } from './studyRooms';
import { getJeopardyPrompt, getQuizPrompt } from './studyToolPrompts';
import { callClaude, extractJson } from './studyTools';

// ─── Types ──────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

interface JeopardyCategory {
  name: string;
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    value: number;
  }[];
}

// ─── Parse Helpers ──────────────────────────────────────────

function parseQuizQuestions(raw: string): { questions: QuizQuestion[] } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'questions' in parsed &&
      Array.isArray((parsed as { questions: unknown }).questions)
    ) {
      return parsed as { questions: QuizQuestion[] };
    }
    return null;
  } catch {
    return null;
  }
}

function parseJeopardyCategories(raw: string): { categories: JeopardyCategory[] } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'categories' in parsed &&
      Array.isArray((parsed as { categories: unknown }).categories)
    ) {
      return parsed as { categories: JeopardyCategory[] };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Queries ────────────────────────────────────────────────

/** Get the active (non-finished) game for a room, with answer-privacy filtering. */
export const getActiveGame = query({
  args: { roomId: v.id('studyRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireRoomMember(ctx, args.roomId, userId);

    // Find a non-finished game for this room
    const games = await ctx.db
      .query('studyGames')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .collect();

    const game = games.find((g) => g.status !== 'finished');
    if (!game) return null;

    // Get players
    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', game._id))
      .collect();

    // Extract current question for client (don't expose full questions blob)
    let currentQuestion: QuizQuestion | null = null;
    if (game.questions && game.status === 'active') {
      if (game.gameType === 'quiz_battle') {
        const parsed = parseQuizQuestions(game.questions);
        const q = parsed?.questions[game.currentRound];
        if (q) {
          // Strip correctIndex during answering phase
          currentQuestion =
            game.roundPhase === 'answering' ? { ...q, correctIndex: -1, explanation: '' } : q;
        }
      } else if (game.gameType === 'jeopardy') {
        const parsed = parseJeopardyCategories(game.questions);
        // During answering/reveal, currentRound = flat index (catIdx * 5 + qIdx)
        if (parsed && game.roundPhase !== 'selecting') {
          const catIdx = Math.floor(game.currentRound / 5);
          const qIdx = game.currentRound % 5;
          const q = parsed.categories[catIdx]?.questions[qIdx];
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
        }
      }
    }

    // Extract jeopardy category names for the board
    let categoryNames: string[] | null = null;
    if (game.gameType === 'jeopardy' && game.questions) {
      const parsed = parseJeopardyCategories(game.questions);
      categoryNames = parsed?.categories.map((c) => c.name) ?? null;
    }

    // Privacy filter: hide other players' answer details during answering phase
    const sanitizedPlayers = players.map((p) => {
      if (game.roundPhase === 'answering' && p.userId !== userId) {
        return {
          ...p,
          lastAnswerCorrect: undefined,
          lastAnswerIndex: undefined,
        };
      }
      return p;
    });

    return {
      ...game,
      questions: undefined, // Never expose raw questions blob
      players: sanitizedPlayers,
      currentQuestion,
      categoryNames,
    };
  },
});

/** Get full results for a finished game. */
export const getGameResults = query({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    if (game.roomId) {
      await requireRoomMember(ctx, game.roomId, userId);
    }

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

/** Create a new game in a room. Host only, requires pinned session. */
export const createGame = mutation({
  args: {
    roomId: v.id('studyRooms'),
    gameType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireRoomHost(ctx, args.roomId, userId);

    const room = await ctx.db.get(args.roomId);
    if (!room?.isActive) throw new ConvexError('Room is not active');
    if (!room.pinnedSessionId) throw new ConvexError('Pin a session first');

    // Ensure no active game
    const existingGames = await ctx.db
      .query('studyGames')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .collect();
    const activeGame = existingGames.find((g) => g.status !== 'finished');
    if (activeGame) throw new ConvexError('A game is already in progress');

    if (args.gameType !== 'quiz_battle' && args.gameType !== 'jeopardy') {
      throw new ConvexError('Invalid game type');
    }

    const now = Date.now();
    const gameId = await ctx.db.insert('studyGames', {
      roomId: args.roomId,
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

    // Auto-add all joined room members as players
    const members = await ctx.db
      .query('studyRoomMembers')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
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
    await postSystemMessage(ctx, args.roomId, `${gameLabel} started! Get ready.`);

    return gameId;
  },
});

/** Toggle ready status. */
export const toggleReady = mutation({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.status !== 'waiting') throw new ConvexError('Game already started');

    const player = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game_user', (q) => q.eq('gameId', args.gameId).eq('userId', userId))
      .unique();
    if (!player) throw new ConvexError('Not a player in this game');

    await ctx.db.patch(player._id, { isReady: !player.isReady });
  },
});

/** Start the game — host only, all must be ready. Triggers AI generation. */
export const startGame = mutation({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.hostUserId !== userId) throw new ConvexError('Only the host can start');
    if (game.status !== 'waiting') throw new ConvexError('Game already started');

    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect();

    if (!players.every((p) => p.isReady)) {
      throw new ConvexError('All players must be ready');
    }

    await ctx.db.patch(args.gameId, { status: 'generating' });

    // Kick off AI question generation
    await ctx.scheduler.runAfter(0, internal.studyGames.generateQuestions, {
      gameId: args.gameId,
    });
  },
});

/** Submit an answer for the current round. */
export const submitAnswer = mutation({
  args: {
    gameId: v.id('studyGames'),
    answerIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.status !== 'active') throw new ConvexError('Game is not active');
    if (game.roundPhase !== 'answering') throw new ConvexError('Not in answering phase');

    const player = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game_user', (q) => q.eq('gameId', args.gameId).eq('userId', userId))
      .unique();
    if (!player) throw new ConvexError('Not a player');
    if (player.hasAnsweredCurrentRound) throw new ConvexError('Already answered');

    // Determine correctness from stored questions
    let correctIndex: number;
    let pointValue: number;

    if (game.gameType === 'quiz_battle') {
      const parsed = parseQuizQuestions(game.questions ?? '');
      if (!parsed) throw new ConvexError('Game data is corrupted');
      const q = parsed.questions[game.currentRound];
      if (!q) throw new ConvexError('Question not found for current round');
      correctIndex = q.correctIndex;
      pointValue = 100; // base
    } else {
      const parsed = parseJeopardyCategories(game.questions ?? '');
      if (!parsed) throw new ConvexError('Game data is corrupted');
      // Jeopardy: currentRound = flat index
      const catIdx = Math.floor(game.currentRound / 5);
      const qIdx = game.currentRound % 5;
      const q = parsed.categories[catIdx]?.questions[qIdx];
      if (!q) throw new ConvexError('Question not found for current round');
      correctIndex = q.correctIndex;
      pointValue = q.value;
    }

    const isCorrect = args.answerIndex === correctIndex;

    // Speed bonus for Quiz Battle (up to 50 extra)
    let scoreGain = 0;
    if (isCorrect) {
      scoreGain = pointValue;
      if (game.gameType === 'quiz_battle' && game.roundStartedAt) {
        const elapsed = Date.now() - game.roundStartedAt;
        const bonus = Math.round(50 * Math.max(0, 1 - elapsed / 15000));
        scoreGain += bonus;
      }
    }

    await ctx.db.patch(player._id, {
      hasAnsweredCurrentRound: true,
      lastAnswerCorrect: isCorrect,
      lastAnswerIndex: args.answerIndex,
      score: player.score + scoreGain,
    });

    // Check if all players have answered → auto-reveal
    const allPlayers = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect();

    const allAnswered = allPlayers.every((p) =>
      p.userId === userId ? true : p.hasAnsweredCurrentRound,
    );

    if (allAnswered) {
      await ctx.db.patch(args.gameId, { roundPhase: 'reveal' });
    }
  },
});

/** Advance to the next round (any player, during reveal). */
export const advanceRound = mutation({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.status !== 'active') throw new ConvexError('Game is not active');
    if (game.roundPhase !== 'reveal') throw new ConvexError('Not in reveal phase');

    // Verify caller is a player
    const callerPlayer = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game_user', (q) => q.eq('gameId', args.gameId).eq('userId', userId))
      .unique();
    if (!callerPlayer) throw new ConvexError('Not a player');

    // Determine total rounds
    let totalRounds: number;
    if (game.gameType === 'quiz_battle') {
      const parsed = parseQuizQuestions(game.questions ?? '');
      if (!parsed) throw new ConvexError('Game data is corrupted');
      totalRounds = parsed.questions.length;
    } else {
      // Jeopardy: total = revealed cells count vs 25
      const revealed: number[][] = game.revealedCells ? JSON.parse(game.revealedCells) : [];
      totalRounds = 25;
      // If all cells revealed, finish
      if (revealed.length >= totalRounds) {
        await finishGameHelper(ctx, game._id, game.roomId ?? null, game.examRoomId ?? null);
        return;
      }
    }

    // Quiz Battle: check if this was the last round
    if (game.gameType === 'quiz_battle' && game.currentRound + 1 >= totalRounds) {
      await finishGameHelper(ctx, game._id, game.roomId ?? null, game.examRoomId ?? null);
      return;
    }

    // Reset all players for next round
    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect();

    for (const p of players) {
      await ctx.db.patch(p._id, {
        hasAnsweredCurrentRound: false,
        lastAnswerCorrect: undefined,
        lastAnswerIndex: undefined,
      });
    }

    if (game.gameType === 'quiz_battle') {
      await ctx.db.patch(args.gameId, {
        currentRound: game.currentRound + 1,
        roundPhase: 'answering',
        roundStartedAt: Date.now(),
      });
    } else {
      // Jeopardy: advance turn to next player, go to selecting
      const sortedPlayers = [...players].sort((a, b) => a.createdAt - b.createdAt);
      const currentTurnIdx = sortedPlayers.findIndex((p) => p.userId === game.currentTurnUserId);
      const nextTurnIdx = (currentTurnIdx + 1) % sortedPlayers.length;

      await ctx.db.patch(args.gameId, {
        roundPhase: 'selecting',
        currentTurnUserId: sortedPlayers[nextTurnIdx].userId,
      });
    }
  },
});

/** Select a Jeopardy cell (turn player only). */
export const selectJeopardyCell = mutation({
  args: {
    gameId: v.id('studyGames'),
    categoryIndex: v.number(),
    questionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.gameType !== 'jeopardy') throw new ConvexError('Not a Jeopardy game');
    if (game.status !== 'active') throw new ConvexError('Game is not active');
    if (game.roundPhase !== 'selecting') throw new ConvexError('Not in selecting phase');
    if (game.currentTurnUserId !== userId) throw new ConvexError('Not your turn');

    // Validate cell bounds
    if (args.categoryIndex < 0 || args.categoryIndex >= 5)
      throw new ConvexError('Invalid category');
    if (args.questionIndex < 0 || args.questionIndex >= 5)
      throw new ConvexError('Invalid question');

    // Check cell not already revealed
    const revealed: number[][] = game.revealedCells ? JSON.parse(game.revealedCells) : [];
    const alreadyRevealed = revealed.some(
      (cell) => cell[0] === args.categoryIndex && cell[1] === args.questionIndex,
    );
    if (alreadyRevealed) throw new ConvexError('Cell already revealed');

    revealed.push([args.categoryIndex, args.questionIndex]);

    // Set currentRound to flat index for answer checking
    const flatIndex = args.categoryIndex * 5 + args.questionIndex;

    await ctx.db.patch(args.gameId, {
      currentRound: flatIndex,
      roundPhase: 'answering',
      roundStartedAt: Date.now(),
      revealedCells: JSON.stringify(revealed),
    });
  },
});

/** Host-only: skip to reveal (for disconnected players). */
export const skipRound = mutation({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.hostUserId !== userId) throw new ConvexError('Only the host can skip');
    if (game.status !== 'active') throw new ConvexError('Game is not active');
    if (game.roundPhase !== 'answering') throw new ConvexError('Not in answering phase');

    await ctx.db.patch(args.gameId, { roundPhase: 'reveal' });
  },
});

/** Host-only: cancel a game. */
export const cancelGame = mutation({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new ConvexError('Game not found');
    if (game.hostUserId !== userId) throw new ConvexError('Only the host can cancel');

    // Delete players
    const players = await ctx.db
      .query('studyGamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect();
    for (const p of players) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.gameId);

    const gameLabel = game.gameType === 'quiz_battle' ? 'Quiz Battle' : 'Jeopardy';
    if (game.roomId) {
      await postSystemMessage(ctx, game.roomId, `${gameLabel} was cancelled.`);
    } else if (game.examRoomId) {
      await ctx.db.insert('examRoomMessages', {
        examRoomId: game.examRoomId,
        senderId: 'system',
        content: `${gameLabel} was cancelled.`,
        messageType: 'system',
        createdAt: Date.now(),
      });
    }
  },
});

// ─── Internal Mutations ─────────────────────────────────────

/** Save AI-generated questions and start the game. */
export const saveQuestions = internalMutation({
  args: {
    gameId: v.id('studyGames'),
    questions: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return;

    if (game.gameType === 'jeopardy') {
      // Jeopardy starts in selecting phase — first player picks a cell
      const players = await ctx.db
        .query('studyGamePlayers')
        .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
        .collect();
      const firstPlayer = players.sort((a, b) => a.createdAt - b.createdAt)[0];

      await ctx.db.patch(args.gameId, {
        questions: args.questions,
        status: 'active',
        roundPhase: 'selecting',
        currentTurnUserId: firstPlayer?.userId,
        revealedCells: '[]',
      });
    } else {
      await ctx.db.patch(args.gameId, {
        questions: args.questions,
        status: 'active',
        roundPhase: 'answering',
        roundStartedAt: Date.now(),
      });
    }
  },
});

// ─── Helpers ────────────────────────────────────────────────

async function finishGameHelper(
  ctx: MutationCtx,
  gameId: Id<'studyGames'>,
  roomId: Id<'studyRooms'> | null,
  examRoomId: Id<'examRooms'> | null,
) {
  const players = await ctx.db
    .query('studyGamePlayers')
    .withIndex('by_game', (q) => q.eq('gameId', gameId))
    .collect();

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const game = await ctx.db.get(gameId);
  if (!game) return;

  await ctx.db.patch(game._id, {
    status: 'finished',
    finishedAt: Date.now(),
  });

  const gameLabel = game.gameType === 'quiz_battle' ? 'Quiz Battle' : 'Jeopardy';
  const finishMsg = `${gameLabel} finished! Winner: ${winner?.displayName ?? 'N/A'} (${winner?.score ?? 0} pts)`;

  if (roomId) {
    await postSystemMessage(ctx, roomId, finishMsg);
  } else if (examRoomId) {
    // Post to exam room chat
    await ctx.db.insert('examRoomMessages', {
      examRoomId,
      senderId: 'system',
      content: finishMsg,
      messageType: 'system',
      createdAt: Date.now(),
    });
  }

  // Award XP: 15 to winner, 10 to everyone
  for (const p of players) {
    const isWinner = p.userId === winner?.userId;
    const amount = isWinner ? 15 : 10;
    const label = `${gameLabel} ${isWinner ? 'winner' : 'participant'}`;
    await awardXpHelper(ctx, p.userId, amount, 'game', label);
  }
}

// ─── Action (AI Generation) ─────────────────────────────────

/** Generate questions from the pinned session content (or exam room brain). */
export const generateQuestions = internalAction({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const game = await ctx.runQuery(internal.studyGames.getGameForGeneration, {
      gameId: args.gameId,
    });
    if (!game) throw new Error('Game not found');

    const { gameType } = game;
    let prompt: string;
    let maxTokens: number;

    if (game.isExamRoom && game.examRoomId) {
      // Exam room: use brain context + multi-session content
      const [brain, sessions] = await Promise.all([
        ctx.runQuery(internal.examBrain.getExamRoomBrain, {
          examRoomId: game.examRoomId,
        }),
        ctx.runQuery(internal.examBrain.getAllSessionContent, {
          examRoomId: game.examRoomId,
        }),
      ]);

      if (sessions.length === 0) throw new Error('No sessions in exam room');

      const lt: LectureType = (sessions[0]?.lectureType as LectureType) ?? 'general';
      const combinedInput = buildExamInput(
        brain.brainContext,
        sessions.map((s) => ({ title: s.title, transcript: s.transcript, notes: s.notes })),
      );

      if (gameType === 'quiz_battle') {
        prompt = `You are an expert quiz creator for ScribeCat. Create a 10-question multiple choice quiz covering material from ALL sessions.\n\n${combinedInput}\n\nReturn ONLY valid JSON: {"questions": [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "...", "topic": "..."}]}`;
        maxTokens = 4096;
      } else {
        prompt = `You are a Jeopardy game creator for ScribeCat. Create a Jeopardy board with 5 categories and 5 questions per category covering ALL sessions.\n\n${combinedInput}\n\nReturn ONLY valid JSON: {"categories": [{"name": "Category (2-4 words)", "questions": [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "...", "value": 100}]}]}`;
        maxTokens = 8192;
      }
    } else {
      // Study room: use single pinned session
      const { transcript, notesPlainText, lectureType } = game;
      if (!transcript) throw new Error('Pinned session has no transcript');

      const lt = (lectureType || 'general') as LectureType;

      if (gameType === 'quiz_battle') {
        prompt = getQuizPrompt(transcript, notesPlainText ?? undefined, lt, 10);
        maxTokens = 4096;
      } else {
        prompt = getJeopardyPrompt(transcript, notesPlainText ?? undefined, lt);
        maxTokens = 8192;
      }
    }

    const response = await callClaude(prompt, maxTokens, 0.4);
    const parsed = JSON.parse(extractJson(response));

    await ctx.runMutation(internal.studyGames.saveQuestions, {
      gameId: args.gameId,
      questions: JSON.stringify(parsed),
    });
  },
});

/** Internal query to get session data for question generation. */
export const getGameForGeneration = internalQuery({
  args: { gameId: v.id('studyGames') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    // Study room games use pinned session
    if (game.roomId) {
      const room = await ctx.db.get(game.roomId);
      if (!room?.pinnedSessionId) return null;

      const session = await ctx.db.get(room.pinnedSessionId);
      if (!session) return null;

      const notesDoc = await ctx.db
        .query('sessionNotes')
        .withIndex('by_session', (q) => q.eq('sessionId', room.pinnedSessionId!))
        .unique();

      return {
        gameType: game.gameType,
        transcript: session.transcript ?? null,
        notesPlainText: notesDoc?.plainText ?? session.notesPlainText ?? null,
        lectureType: session.lectureType ?? null,
        isExamRoom: false,
        examRoomId: null,
      };
    }

    // Exam room games use multi-session brain context
    if (game.examRoomId) {
      return {
        gameType: game.gameType,
        transcript: null,
        notesPlainText: null,
        lectureType: null,
        isExamRoom: true,
        examRoomId: game.examRoomId,
      };
    }

    return null;
  },
});
