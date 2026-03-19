import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';

export const getRoomNotes = query({
  args: { roomId: v.id('studyRooms') },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query('roomNotes')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .unique();
  },
});

export const saveRoomNotes = mutation({
  args: {
    roomId: v.id('studyRooms'),
    content: v.string(),
    updatedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query('roomNotes')
      .withIndex('by_room', (q) => q.eq('roomId', args.roomId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
        updatedBy: userId,
        updatedByName: args.updatedByName,
      });
    } else {
      await ctx.db.insert('roomNotes', {
        roomId: args.roomId,
        content: args.content,
        updatedAt: Date.now(),
        updatedBy: userId,
        updatedByName: args.updatedByName,
      });
    }
  },
});
