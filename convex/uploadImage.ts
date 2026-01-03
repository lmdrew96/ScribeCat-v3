import { v } from 'convex/values';
import { mutation } from './_generated/server';

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const saveImage = mutation({
  args: {
    storageId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Store image metadata (optional, for tracking)
    // You can create an images table if you want to track uploaded images
    return args.storageId;
  },
});

export const getImageUrl = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
