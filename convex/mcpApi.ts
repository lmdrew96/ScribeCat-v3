/**
 * MCP API — HTTP endpoints for the ScribeCat MCP server.
 * All routes are authenticated with a user-generated API key (Authorization: Bearer sc_xxx).
 */

import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { httpAction, internalQuery } from './_generated/server';

// ─── Helpers ────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS });
}

type HttpCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function resolveApiKey(ctx: HttpCtx, request: Request): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const key = auth.slice(7).trim();
  if (!key.startsWith('sc_')) return null;

  const keyHash = await sha256(key);
  const record = await ctx.runQuery(internal.apiKeys.validateApiKey, { keyHash });
  if (!record) return null;

  void ctx.runMutation(internal.apiKeys.updateLastUsed, { keyId: record._id });
  return record.userId;
}

// ─── HTTP Actions ───────────────────────────────────────────

/** GET /mcp/sessions?course=CISC220&limit=50 */
export const mcpListSessions = httpAction(async (ctx, request) => {
  const userId = await resolveApiKey(ctx, request);
  if (!userId) return errorResponse('Invalid or missing API key', 401);

  const url = new URL(request.url);
  const course = url.searchParams.get('course') ?? undefined;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam), 100) : 50;

  const sessions = await ctx.runQuery(internal.mcpApi.listSessionsInternal, {
    userId,
    course,
    limit,
  });

  return new Response(JSON.stringify({ sessions }), { headers: JSON_HEADERS });
});

/** GET /mcp/session?id=<sessionId> */
export const mcpGetSession = httpAction(async (ctx, request) => {
  const userId = await resolveApiKey(ctx, request);
  if (!userId) return errorResponse('Invalid or missing API key', 401);

  const sessionId = new URL(request.url).searchParams.get('id');
  if (!sessionId) return errorResponse('Missing required parameter: id', 400);

  const session = await ctx.runQuery(internal.mcpApi.getSessionInternal, { userId, sessionId });
  if (!session) return errorResponse('Session not found', 404);

  return new Response(JSON.stringify(session), { headers: JSON_HEADERS });
});

/** GET /mcp/sessions/search?q=<query>&course=CISC220 */
export const mcpSearchSessions = httpAction(async (ctx, request) => {
  const userId = await resolveApiKey(ctx, request);
  if (!userId) return errorResponse('Invalid or missing API key', 401);

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  if (!query) return errorResponse('Missing required parameter: q', 400);

  const course = url.searchParams.get('course') ?? undefined;
  const sessions = await ctx.runQuery(internal.mcpApi.searchSessionsInternal, {
    userId,
    query,
    course,
  });

  return new Response(JSON.stringify({ sessions }), { headers: JSON_HEADERS });
});

/** GET /mcp/courses */
export const mcpGetCourses = httpAction(async (ctx, request) => {
  const userId = await resolveApiKey(ctx, request);
  if (!userId) return errorResponse('Invalid or missing API key', 401);

  const courses = await ctx.runQuery(internal.mcpApi.getCoursesInternal, { userId });
  return new Response(JSON.stringify({ courses }), { headers: JSON_HEADERS });
});

// ─── Internal Queries ───────────────────────────────────────

export const listSessionsInternal = internalQuery({
  args: {
    userId: v.string(),
    course: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let sessions;
    if (args.course) {
      sessions = await ctx.db
        .query('sessions')
        .withIndex('by_user_course', (q) =>
          q.eq('userId', args.userId).eq('course', args.course!),
        )
        .filter((q) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .take(args.limit);
    } else {
      sessions = await ctx.db
        .query('sessions')
        .withIndex('by_user_deleted', (q) =>
          q.eq('userId', args.userId).eq('isDeleted', false),
        )
        .order('desc')
        .take(args.limit);
    }

    return sessions.map((s) => ({
      id: s._id,
      title: s.title,
      course: s.course ?? null,
      lectureType: s.lectureType ?? null,
      durationSeconds: s.duration,
      createdAt: new Date(s.createdAt).toISOString(),
      hasTranscript: !!s.transcript,
      hasNotes: !!(s.notesPlainText ?? s.notes),
    }));
  },
});

export const getSessionInternal = internalQuery({
  args: { userId: v.string(), sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<'sessions'>);
    if (!session || session.userId !== args.userId || session.isDeleted) return null;

    const sessionNotes = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId as Id<'sessions'>))
      .unique();

    const notes = sessionNotes?.plainText ?? session.notesPlainText ?? null;

    return {
      id: session._id,
      title: session.title,
      course: session.course ?? null,
      lectureType: session.lectureType ?? null,
      durationSeconds: session.duration,
      createdAt: new Date(session.createdAt).toISOString(),
      transcript: session.transcript ?? null,
      notes,
      nuggetNotes: (session.nuggetNotes ?? []).map((n) => n.text),
    };
  },
});

export const searchSessionsInternal = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
    course: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Full-text search on notes
    const noteResults = await ctx.db
      .query('sessions')
      .withSearchIndex('search_notes', (q) =>
        q.search('notesPlainText', args.query).eq('userId', args.userId).eq('isDeleted', false),
      )
      .take(20);

    // Title match (all user sessions, filtered in memory — users have bounded session counts)
    const allSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) =>
        q.eq('userId', args.userId).eq('isDeleted', false),
      )
      .collect();

    const lower = args.query.toLowerCase();
    const titleMatches = allSessions.filter((s) => s.title.toLowerCase().includes(lower));

    // Merge and deduplicate
    const seen = new Set(noteResults.map((s) => s._id.toString()));
    const merged = [...noteResults];
    for (const s of titleMatches) {
      if (!seen.has(s._id.toString())) {
        merged.push(s);
      }
    }

    const filtered = args.course ? merged.filter((s) => s.course === args.course) : merged;

    return filtered.slice(0, 20).map((s) => ({
      id: s._id,
      title: s.title,
      course: s.course ?? null,
      lectureType: s.lectureType ?? null,
      durationSeconds: s.duration,
      createdAt: new Date(s.createdAt).toISOString(),
      hasTranscript: !!s.transcript,
      hasNotes: !!(s.notesPlainText ?? s.notes),
    }));
  },
});

export const getCoursesInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_deleted', (q) =>
        q.eq('userId', args.userId).eq('isDeleted', false),
      )
      .collect();

    const courses = new Set<string>();
    for (const s of sessions) {
      if (s.course) courses.add(s.course);
    }

    return Array.from(courses).sort();
  },
});
