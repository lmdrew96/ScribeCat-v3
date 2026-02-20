/**
 * StudyQuest — Cat companion backend (queries, mutations, internal mutations)
 */

import { ConvexError, v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { levelFromXp } from './xpUtils';

// ─── Auth helper ─────────────────────────────────────────────

async function requireAuth(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('Not authenticated');
  }
  return identity.subject;
}

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
  args: { name: v.optional(v.string()) },
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
      totalXp: 0,
      level: 1,
      mood: 'idle',
      lastActivityAt: Date.now(),
      lastXpGains: [],
      createdAt: Date.now(),
    });
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
