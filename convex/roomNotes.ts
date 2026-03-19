import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';

export const updateNotesCursor = mutation({
  args: {
    roomId: v.id('studyRooms'),
    cursor: v.optional(v.string()), // JSON {from, to} — omit to clear on blur
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const member = await ctx.db
      .query('studyRoomMembers')
      .withIndex('by_room_user', (q) => q.eq('roomId', args.roomId).eq('userId', userId))
      .unique();
    if (member) {
      await ctx.db.patch(member._id, { notesCursor: args.cursor });
    }
  },
});

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
