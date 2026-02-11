import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Audio storage for web — replaces Electron local filesystem storage.
 * Uses Convex file storage for audio blobs (WebM recordings).
 */

/** Generate an upload URL for audio files */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/** Get a playable URL for a stored audio file */
export const getAudioUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Get audio URL imperatively (for use in callbacks) */
export const getAudioUrlMutation = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Delete an audio file from storage */
export const deleteAudio = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId as never);
  },
});
