import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireAuth } from './authHelpers';

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a new API key. Returns the plaintext key once — it is never stored. */
export const generate = action({
  args: { label: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ apiKey: string; keyId: Id<'apiKeys'> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const keyBody = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const apiKey = `sc_${keyBody}`;
    const keyHash = await sha256(apiKey);

    const keyId = await ctx.runMutation(internal.apiKeys.storeKey, {
      userId: identity.subject,
      keyHash,
      label: args.label,
    });

    return { apiKey, keyId };
  },
});

/** Revoke (delete) an API key owned by the current user. */
export const revoke = mutation({
  args: { id: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const key = await ctx.db.get(args.id);
    if (!key || key.userId !== userId) throw new ConvexError('Key not found');
    await ctx.db.delete(args.id);
  },
});

/** List all API keys for the current user (no hashes returned). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
    return keys.map(({ _id, label, createdAt, lastUsedAt }) => ({
      _id,
      label,
      createdAt,
      lastUsedAt,
    }));
  },
});

// ─── Internal ───────────────────────────────────────────────

export const storeKey = internalMutation({
  args: {
    userId: v.string(),
    keyHash: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'apiKeys'>> => {
    return await ctx.db.insert('apiKeys', {
      userId: args.userId,
      keyHash: args.keyHash,
      label: args.label,
      createdAt: Date.now(),
    });
  },
});

/** Validate a hashed API key and return the full record (including userId). */
export const validateApiKey = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiKeys')
      .withIndex('by_hash', (q) => q.eq('keyHash', args.keyHash))
      .unique();
  },
});

export const updateLastUsed = internalMutation({
  args: { keyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
  },
});
