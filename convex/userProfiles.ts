/**
 * User Profiles — Public identity for social features.
 * Each user sets a unique @username on first social interaction.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth, requireAuthWithProfile } from './authHelpers';

// ─── Queries ─────────────────────────────────────────────────

/** Get the current user's profile (or null if not set up yet) */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
  },
});

/** Look up a profile by @username */
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query('userProfiles')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
  },
});

/** Search users by username prefix (for friend discovery) */
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    if (args.query.length < 2) return [];

    const results = await ctx.db
      .query('userProfiles')
      .withSearchIndex('search_username', (q) => q.search('username', args.query))
      .take(10);

    // Exclude self from results
    return results.filter((p) => p.userId !== userId);
  },
});

/** Check if a username is already taken (for real-time validation) */
export const isUsernameTaken = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_username', (q) => q.eq('username', args.username.toLowerCase()))
      .unique();
    return !!existing;
  },
});

// ─── Mutations ───────────────────────────────────────────────

/** Create a new user profile (called on first-time username setup) */
export const createProfile = mutation({
  args: { username: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, displayName: jwtDisplayName, avatarUrl } = await requireAuthWithProfile(ctx);

    // Validate username format
    const username = args.username.toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new ConvexError(
        'Username must be 3-20 characters, letters, numbers, and underscores only',
      );
    }

    // Resolve display name: user-provided value wins, then JWT, then fallback
    const providedName = args.displayName?.trim();
    if (providedName !== undefined && providedName.length === 0) {
      throw new ConvexError('Display name cannot be empty');
    }
    if (providedName && providedName.length > 50) {
      throw new ConvexError('Display name must be 50 characters or fewer');
    }
    const displayName = providedName || jwtDisplayName;

    // Check uniqueness
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique();
    if (existing) {
      throw new ConvexError('Username already taken');
    }

    // Check user doesn't already have a profile
    const myProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (myProfile) {
      throw new ConvexError('Profile already exists');
    }

    const now = Date.now();
    return await ctx.db.insert('userProfiles', {
      userId,
      username,
      displayName,
      avatarUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Update last seen timestamp for presence detection */
export const updatePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!profile) return; // no profile yet, skip silently
    await ctx.db.patch(profile._id, { lastSeenAt: Date.now() });
  },
});

/** Update profile display name or avatar (NOT username) */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (!profile) throw new ConvexError('Profile not found');

    if (args.displayName !== undefined) {
      const trimmed = args.displayName.trim();
      if (trimmed.length === 0) {
        throw new ConvexError('Display name cannot be empty');
      }
      if (trimmed.length > 50) {
        throw new ConvexError('Display name must be 50 characters or fewer');
      }
    }

    await ctx.db.patch(profile._id, {
      ...(args.displayName !== undefined && {
        displayName: args.displayName.trim(),
      }),
      ...(args.avatarUrl !== undefined && { avatarUrl: args.avatarUrl }),
      updatedAt: Date.now(),
    });
  },
});
