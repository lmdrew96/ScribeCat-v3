/**
 * StudyQuest — Cat companion backend (queries, mutations, internal mutations)
 */

import { ConvexError, v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { levelFromXp } from './xpUtils';

// ─── Queries ─────────────────────────────────────────────────

export const getCatState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const cat = await ctx.db
      .query('catCompanion')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    return cat ?? null;
  },
});

// ─── Mutations ───────────────────────────────────────────────

export const adoptCat = mutation({
  args: {
    name: v.optional(v.string()),
    variant: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('catCompanion')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (existing) throw new ConvexError('Cat already adopted');

    await ctx.db.insert('catCompanion', {
      userId,
      name: args.name ?? 'Nugget',
      variant: args.variant ?? 'grey',
      totalXp: 0,
      level: 1,
      mood: 'idle',
      lastActivityAt: Date.now(),
      lastXpGains: [],
      createdAt: Date.now(),
    });
  },
});

export const changeVariant = mutation({
  args: { variant: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const cat = await ctx.db
      .query('catCompanion')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!cat) throw new ConvexError('No cat found');
    await ctx.db.patch(cat._id, { variant: args.variant });
  },
});

export const renameCat = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const cat = await ctx.db
      .query('catCompanion')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!cat) throw new ConvexError('No cat found');
    await ctx.db.patch(cat._id, { name: args.name });
  },
});

// ─── Internal: XP Award Helper ──────────────────────────────

/** Award XP to a user's cat. Called from productivity.ts and studyTools.ts. */
export async function awardXpHelper(
  ctx: MutationCtx,
  userId: string,
  amount: number,
  source: string,
  label: string,
): Promise<{ leveledUp: boolean; newLevel: number } | null> {
  const cat = await ctx.db
    .query('catCompanion')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (!cat) return null;

  const newTotalXp = cat.totalXp + amount;
  const newLevel = levelFromXp(newTotalXp);
  const leveledUp = newLevel > cat.level;

  const newGain = {
    amount,
    source,
    label,
    timestamp: Date.now(),
  };
  const lastXpGains = [newGain, ...cat.lastXpGains].slice(0, 5);

  await ctx.db.patch(cat._id, {
    totalXp: newTotalXp,
    level: newLevel,
    mood: leveledUp ? 'excited' : 'happy',
    lastActivityAt: Date.now(),
    lastXpGains,
  });

  return { leveledUp, newLevel };
}

/**
 * Add (or subtract) coins from the user's cat. Returns the new balance, or
 * null if the user hasn't adopted yet. Throws if the result would go negative.
 */
export async function adjustCoinsHelper(
  ctx: MutationCtx,
  userId: string,
  delta: number,
): Promise<number | null> {
  const cat = await ctx.db
    .query('catCompanion')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (!cat) return null;
  const current = cat.coins ?? 0;
  const next = current + delta;
  if (next < 0) throw new ConvexError('Not enough coins');
  await ctx.db.patch(cat._id, { coins: next });
  return next;
}

/** Internal mutation wrapper for calling from actions via ctx.runMutation */
export const awardXp = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    source: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    return await awardXpHelper(ctx, args.userId, args.amount, args.source, args.label);
  },
});

// ─── Public: StudyQuest game XP grants ──────────────────────

/**
 * Allow the StudyQuest game (Excalibur scenes via the bridge) to award XP
 * for in-game events like battle victories. Sources are validated against
 * an allowlist so this can't be used as a generic XP firehose.
 */
const GAME_XP_SOURCES = new Set([
  'battle-victory',
  'boss-victory',
  'treasure-found',
  'floor-cleared',
]);
const GAME_XP_MAX_PER_CALL = 100;

export const awardGameXp = mutation({
  args: {
    amount: v.number(),
    source: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (!GAME_XP_SOURCES.has(args.source)) {
      throw new ConvexError(`Invalid game XP source: ${args.source}`);
    }
    const amount = Math.max(0, Math.min(GAME_XP_MAX_PER_CALL, Math.round(args.amount)));
    if (amount === 0) return null;
    return await awardXpHelper(ctx, userId, amount, args.source, args.label);
  },
});
