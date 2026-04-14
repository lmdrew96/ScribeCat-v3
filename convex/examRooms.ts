/**
 * Exam Rooms — Persistent, multi-session study environments for exam prep.
 * Solo-first (no friend requirement), invite friends later. Sessions are indexed
 * by the Exam Room Brain (examBrain.ts) for intelligent AI context routing.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { verifyFriendship } from './messagingHelpers';
import { awardXpHelper } from './studyQuest';

// ─── Helpers ──────────────────────────────────────────────────

export async function requireExamRoomMember(
  ctx: QueryCtx,
  examRoomId: Id<'examRooms'>,
  userId: string,
) {
  const member = await ctx.db
    .query('examRoomMembers')
    .withIndex('by_room_user', (q) => q.eq('examRoomId', examRoomId).eq('userId', userId))
    .unique();
  if (!member) throw new ConvexError('Not an exam room member');
  return member;
}

export async function requireExamRoomHost(
  ctx: QueryCtx,
  examRoomId: Id<'examRooms'>,
  userId: string,
) {
  const member = await requireExamRoomMember(ctx, examRoomId, userId);
  if (member.role !== 'host') throw new ConvexError('Only the host can do this');
  return member;
}

async function getProfileForUser(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query('userProfiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
}

export async function postExamSystemMessage(
  ctx: MutationCtx,
  examRoomId: Id<'examRooms'>,
  content: string,
) {
  await ctx.db.insert('examRoomMessages', {
    examRoomId,
    senderId: 'system',
    content,
    messageType: 'system',
    createdAt: Date.now(),
  });
}

// ─── Queries ──────────────────────────────────────────────────

/** List all active exam rooms where the current user is a member. */
export const listMyExamRooms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const memberships = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const rooms = await Promise.all(
      memberships.map(async (membership) => {
        const room = await ctx.db.get(membership.examRoomId);
        if (!room || !room.isActive) return null;

        const [hostProfile, members, sessionLinks] = await Promise.all([
          getProfileForUser(ctx, room.hostUserId),
          ctx.db
            .query('examRoomMembers')
            .withIndex('by_room', (q) => q.eq('examRoomId', room._id))
            .collect(),
          ctx.db
            .query('examRoomSessions')
            .withIndex('by_room', (q) => q.eq('examRoomId', room._id))
            .collect(),
        ]);

        return {
          examRoomId: room._id,
          name: room.name,
          status: room.status,
          examDate: room.examDate,
          hasJoined: membership.hasJoined,
          memberCount: members.length,
          sessionCount: sessionLinks.length,
          host: {
            userId: room.hostUserId,
            displayName: hostProfile?.displayName ?? 'Unknown',
            username: hostProfile?.username ?? 'unknown',
          },
          createdAt: room.createdAt,
        };
      }),
    );

    return rooms.filter(Boolean).sort((a, b) => (b?.createdAt ?? 0) - (a?.createdAt ?? 0));
  },
});

/** Get full exam room data with enriched members. */
export const getExamRoom = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room) throw new ConvexError('Exam room not found');

    const memberDocs = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const now = Date.now();
    const members = await Promise.all(
      memberDocs.map(async (member) => {
        const [profile, cat] = await Promise.all([
          getProfileForUser(ctx, member.userId),
          ctx.db
            .query('catCompanion')
            .withIndex('by_user', (q) => q.eq('userId', member.userId))
            .unique(),
        ]);

        return {
          userId: member.userId,
          role: member.role,
          hasJoined: member.hasJoined,
          isOnline: now - member.lastSeenAt < 60_000,
          displayName: profile?.displayName ?? 'Unknown',
          username: profile?.username ?? 'unknown',
          avatarUrl: profile?.avatarUrl,
          catVariant: cat?.variant ?? null,
          catLevel: cat?.level ?? null,
        };
      }),
    );

    return { ...room, members };
  },
});

/** Get exam room chat messages (last 100). */
export const getExamRoomMessages = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const allMessages = await ctx.db
      .query('examRoomMessages')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .order('asc')
      .collect();

    const messages = allMessages.slice(-100);

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        if (msg.messageType === 'system') {
          return { ...msg, senderName: 'System' };
        }
        const profile = await getProfileForUser(ctx, msg.senderId);
        return { ...msg, senderName: profile?.displayName ?? 'Unknown' };
      }),
    );

    return enriched;
  },
});

/** Get all sessions linked to an exam room. */
export const getExamRoomSessions = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const sessions = await Promise.all(
      links.map(async (link) => {
        const session = await ctx.db.get(link.sessionId);
        const addedByProfile = await getProfileForUser(ctx, link.addedByUserId);
        return {
          linkId: link._id,
          sessionId: link.sessionId,
          title: session?.title ?? 'Untitled',
          course: session?.course,
          duration: session?.duration ?? 0,
          lectureType: session?.lectureType,
          addedBy: addedByProfile?.displayName ?? 'Unknown',
          addedByUserId: link.addedByUserId,
          addedAt: link.addedAt,
          hasTopicIndex: !!link.topicIndex,
          isDeleted: session?.isDeleted ?? true,
        };
      }),
    );

    return sessions.filter((s) => !s.isDeleted);
  },
});

/** Get full session content for viewing within an exam room (read-only). */
export const getExamRoomSessionContent = query({
  args: {
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    // Verify session is linked to this exam room
    const link = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room_session', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('sessionId', args.sessionId),
      )
      .unique();
    if (!link) throw new ConvexError('Session is not in this exam room');

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.isDeleted) throw new ConvexError('Session not found');

    // Join notes from sessionNotes table (same pattern as getSharedSession)
    const notesDoc = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .unique();

    const notes = notesDoc?.content ?? session.notes;
    const notesPlainText = notesDoc?.plainText ?? session.notesPlainText;

    // Get owner profile
    const ownerProfile = await getProfileForUser(ctx, session.userId);

    // Get who added it
    const addedByProfile = await getProfileForUser(ctx, link.addedByUserId);

    return {
      sessionId: session._id,
      title: session.title,
      notes,
      notesPlainText,
      transcript: session.transcript,
      transcriptSegments: session.transcriptSegments,
      duration: session.duration,
      lectureType: session.lectureType,
      course: session.course,
      // Only return audioStorageId if audio hasn't been deleted
      audioStorageId: session.audioDeletedAt ? null : (session.audioStorageId ?? null),
      nuggetNotes: session.nuggetNotes,
      documentText: session.documentText,
      createdAt: session.createdAt,
      owner: {
        userId: session.userId,
        displayName: ownerProfile?.displayName ?? 'Unknown',
        username: ownerProfile?.username ?? 'unknown',
      },
      addedBy: {
        userId: link.addedByUserId,
        displayName: addedByProfile?.displayName ?? 'Unknown',
      },
    };
  },
});

/** Count of exam rooms the user has been invited to but hasn't joined yet. */
export const pendingExamRoomCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const memberships = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const pending = memberships.filter((m) => !m.hasJoined);
    const rooms = await Promise.all(pending.map((m) => ctx.db.get(m.examRoomId)));
    return rooms.filter((r) => r?.isActive).length;
  },
});

// ─── Mutations ────────────────────────────────────────────────

/** Create a new exam room (solo — no friend requirement). */
export const createExamRoom = mutation({
  args: {
    name: v.string(),
    examDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (!args.name.trim()) throw new ConvexError('Room name is required');

    const now = Date.now();

    const examRoomId = await ctx.db.insert('examRooms', {
      name: args.name.trim(),
      hostUserId: userId,
      examDate: args.examDate,
      status: 'studying',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add host as member
    await ctx.db.insert('examRoomMembers', {
      examRoomId,
      userId,
      role: 'host',
      hasJoined: true,
      lastSeenAt: now,
      createdAt: now,
    });

    const profile = await getProfileForUser(ctx, userId);
    await postExamSystemMessage(
      ctx,
      examRoomId,
      `${profile?.displayName ?? 'Host'} created the exam room`,
    );

    // Award XP
    await awardXpHelper(ctx, userId, 10, 'exam_room', 'Created exam room');

    return examRoomId;
  },
});

/** Mark the current user as having joined the exam room. */
export const joinExamRoom = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const member = await requireExamRoomMember(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room?.isActive) throw new ConvexError('Exam room is no longer active');

    if (!member.hasJoined) {
      await ctx.db.patch(member._id, { hasJoined: true, lastSeenAt: Date.now() });
      const profile = await getProfileForUser(ctx, userId);
      await postExamSystemMessage(
        ctx,
        args.examRoomId,
        `${profile?.displayName ?? 'Someone'} joined the exam room`,
      );
    }
  },
});

/** Leave an exam room. If the host leaves, archives the room. */
export const leaveExamRoom = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const member = await requireExamRoomMember(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room?.isActive) throw new ConvexError('Exam room is no longer active');

    const profile = await getProfileForUser(ctx, userId);

    if (member.role === 'host') {
      await ctx.db.patch(args.examRoomId, {
        isActive: false,
        status: 'archived',
        updatedAt: Date.now(),
      });
      await postExamSystemMessage(
        ctx,
        args.examRoomId,
        `${profile?.displayName ?? 'Host'} closed the exam room`,
      );
    } else {
      await ctx.db.delete(member._id);
      await postExamSystemMessage(
        ctx,
        args.examRoomId,
        `${profile?.displayName ?? 'Someone'} left the exam room`,
      );
    }
  },
});

/** Invite a friend to the exam room (host only). */
export const inviteToExamRoom = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    friendId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomHost(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room?.isActive) throw new ConvexError('Exam room is no longer active');

    await verifyFriendship(ctx, userId, args.friendId);

    const existing = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_room_user', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('userId', args.friendId),
      )
      .unique();
    if (existing) throw new ConvexError('User is already in this exam room');

    const now = Date.now();
    await ctx.db.insert('examRoomMembers', {
      examRoomId: args.examRoomId,
      userId: args.friendId,
      role: 'member',
      hasJoined: false,
      lastSeenAt: 0,
      createdAt: now,
    });

    const friendProfile = await getProfileForUser(ctx, args.friendId);
    await postExamSystemMessage(
      ctx,
      args.examRoomId,
      `${friendProfile?.displayName ?? 'A friend'} was invited`,
    );

    await awardXpHelper(ctx, userId, 5, 'exam_room', 'Invited friend to exam room');
  },
});

/** Add a session to the exam room (any member can add their own sessions). */
export const addSession = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const room = await ctx.db.get(args.examRoomId);
    if (!room?.isActive || room.status === 'archived') {
      throw new ConvexError('Exam room is archived');
    }

    // Verify user owns the session
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.isDeleted) throw new ConvexError('Session not found');
    if (session.userId !== userId) throw new ConvexError('You can only add your own sessions');

    // Check not already added
    const existing = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room_session', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('sessionId', args.sessionId),
      )
      .unique();
    if (existing) throw new ConvexError('Session already added to this exam room');

    const now = Date.now();
    await ctx.db.insert('examRoomSessions', {
      examRoomId: args.examRoomId,
      sessionId: args.sessionId,
      addedByUserId: userId,
      addedAt: now,
    });

    await ctx.db.patch(args.examRoomId, { updatedAt: now });

    const profile = await getProfileForUser(ctx, userId);
    await postExamSystemMessage(
      ctx,
      args.examRoomId,
      `${profile?.displayName ?? 'Someone'} added "${session.title}"`,
    );

    // Trigger brain indexing (async)
    await ctx.scheduler.runAfter(0, internal.examBrain.indexSession, {
      examRoomId: args.examRoomId,
      sessionId: args.sessionId,
    });

    await awardXpHelper(ctx, userId, 5, 'exam_room', 'Added session to exam room');
  },
});

/** Remove a session from the exam room (host or person who added it). */
export const removeSession = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const link = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room_session', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('sessionId', args.sessionId),
      )
      .unique();
    if (!link) throw new ConvexError('Session not found in this exam room');

    // Only host or the person who added it can remove
    const room = await ctx.db.get(args.examRoomId);
    if (link.addedByUserId !== userId && room?.hostUserId !== userId) {
      throw new ConvexError('Only the host or the person who added the session can remove it');
    }

    const session = await ctx.db.get(args.sessionId);
    await ctx.db.delete(link._id);

    const profile = await getProfileForUser(ctx, userId);
    await postExamSystemMessage(
      ctx,
      args.examRoomId,
      `${profile?.displayName ?? 'Someone'} removed "${session?.title ?? 'a session'}"`,
    );
  },
});

/** Send a chat message in an exam room. */
export const sendExamRoomMessage = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    if (!args.content.trim()) throw new ConvexError('Message cannot be empty');

    await ctx.db.insert('examRoomMessages', {
      examRoomId: args.examRoomId,
      senderId: userId,
      content: args.content.trim(),
      messageType: 'text',
      createdAt: Date.now(),
    });
  },
});

/** Update presence heartbeat. */
export const examHeartbeat = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const member = await ctx.db
      .query('examRoomMembers')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();

    if (member) {
      await ctx.db.patch(member._id, { lastSeenAt: Date.now() });
    }
  },
});

/** Update exam room metadata (host only). */
export const updateExamRoom = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    name: v.optional(v.string()),
    examDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomHost(ctx, args.examRoomId, userId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      if (!args.name.trim()) throw new ConvexError('Room name is required');
      updates.name = args.name.trim();
    }
    if (args.examDate !== undefined) {
      updates.examDate = args.examDate ?? undefined;
    }

    await ctx.db.patch(args.examRoomId, updates);
  },
});

/** Archive an exam room (host only). Room becomes read-only. */
export const archiveExamRoom = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomHost(ctx, args.examRoomId, userId);

    await ctx.db.patch(args.examRoomId, {
      status: 'archived',
      updatedAt: Date.now(),
    });

    const profile = await getProfileForUser(ctx, userId);
    await postExamSystemMessage(
      ctx,
      args.examRoomId,
      `${profile?.displayName ?? 'Host'} archived the exam room`,
    );
  },
});
