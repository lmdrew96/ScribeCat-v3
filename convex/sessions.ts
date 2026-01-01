import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// List all sessions for a user (excluding deleted)
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', args.userId).eq('isDeleted', false))
      .order('desc')
      .collect();
  },
});

// Get a single session by ID
export const get = query({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new session
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('sessions', {
      userId: args.userId,
      title: args.title,
      duration: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  },
});

// Update session fields
export const update = mutation({
  args: {
    id: v.id('sessions'),
    title: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
    notes: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined),
    );

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Soft delete a session (move to trash)
export const softDelete = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Restore a session from trash
export const restore = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Permanently delete a session
export const permanentDelete = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// List deleted sessions (trash)
export const listDeleted = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) => q.eq('userId', args.userId).eq('isDeleted', true))
      .order('desc')
      .collect();
  },
});
