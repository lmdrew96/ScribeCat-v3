import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { r2 } from './r2';

/**
 * Audio storage for web — replaces Electron local filesystem storage.
 * Uses R2 for audio blobs (WebM recordings), keyed by the same string
 * previously used as a Convex storage ID.
 */

/** Get a playable URL for a stored audio file */
export const getAudioUrl = query({
  args: { storageId: v.string() },
  handler: async (_ctx, args) => {
    return await r2.getUrl(args.storageId);
  },
});

/**
 * Get playable URLs for multiple stored audio files, preserving order.
 * Used for multi-part sessions where audio is stored as a sequence of
 * storageIds that the client concatenates on playback.
 */
export const getAudioUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (_ctx, args) => {
    return await Promise.all(args.storageIds.map((id) => r2.getUrl(id)));
  },
});

/** Get audio URL imperatively (for use in callbacks) */
export const getAudioUrlMutation = mutation({
  args: { storageId: v.string() },
  handler: async (_ctx, args) => {
    return await r2.getUrl(args.storageId);
  },
});

/** Delete an audio file from storage */
export const deleteAudio = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await r2.deleteObject(ctx, args.storageId);
  },
});
