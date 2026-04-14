/**
 * Exam Room Brain — The "Session Conductor"
 *
 * AI-powered meta-context layer that indexes each session when added to an exam room.
 * Extracts structured topic indexes so downstream AI calls (chat, tools, games) get a
 * lightweight "brain" instead of raw transcripts — cheaper, more coherent, and smarter
 * about which session content is relevant per interaction.
 */

import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { callClaude } from './config';
import { requireExamRoomMember } from './examRooms';
import { extractJson } from './studyTools';

// ─── Types ──────────────────────────────────────────────────

export interface TopicEntry {
  topic: string;
  concepts: string[];
  sessionTitle: string;
}

export interface TopicIndex {
  topics: TopicEntry[];
  extractedAt: number;
}

// ─── Internal Queries ───────────────────────────────────────

/** Get session content for indexing */
export const getSessionForIndexing = internalQuery({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Prefer sessionNotes table over inline notes
    const sessionNotes = await ctx.db
      .query('sessionNotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .unique();

    const notesPlainText = sessionNotes?.plainText ?? session.notesPlainText ?? '';
    const transcript = session.transcript ?? '';

    return {
      title: session.title,
      transcript,
      notesPlainText,
      lectureType: session.lectureType ?? 'general',
    };
  },
});

/** Aggregate all topic indexes into a combined meta-context string */
export const getExamRoomBrain = internalQuery({
  args: {
    examRoomId: v.id('examRooms'),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const allTopics: TopicEntry[] = [];
    const sessionTitles: string[] = [];

    for (const link of links) {
      sessionTitles.push(''); // placeholder, filled below
      if (link.topicIndex) {
        try {
          const index: TopicIndex = JSON.parse(link.topicIndex);
          allTopics.push(...index.topics);
        } catch {
          // Skip malformed indexes
        }
      }
    }

    // Also fetch session titles for display
    const sessions = await Promise.all(
      links.map(async (link) => {
        const session = await ctx.db.get(link.sessionId);
        return {
          sessionId: link.sessionId,
          title: session?.title ?? 'Untitled',
          lectureType: session?.lectureType ?? 'general',
          hasIndex: !!link.topicIndex,
        };
      }),
    );

    // Build the meta-context string
    let brainContext = 'EXAM ROOM KNOWLEDGE MAP:\n\n';

    // Group topics by session
    const topicsBySession = new Map<string, TopicEntry[]>();
    for (const topic of allTopics) {
      const existing = topicsBySession.get(topic.sessionTitle) ?? [];
      existing.push(topic);
      topicsBySession.set(topic.sessionTitle, existing);
    }

    for (const [sessionTitle, topics] of topicsBySession) {
      brainContext += `--- ${sessionTitle} ---\n`;
      for (const t of topics) {
        brainContext += `• ${t.topic}: ${t.concepts.join(', ')}\n`;
      }
      brainContext += '\n';
    }

    return {
      brainContext,
      sessions,
      allTopics,
      sessionCount: links.length,
    };
  },
});

/** Public query: get brain context for exam chat (auth'd by room membership). */
export const getBrainContext = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const allTopics: TopicEntry[] = [];

    for (const link of links) {
      if (link.topicIndex) {
        try {
          const index: TopicIndex = JSON.parse(link.topicIndex);
          allTopics.push(...index.topics);
        } catch {
          // Skip malformed indexes
        }
      }
    }

    // Fetch session data (always needed for titles, and for fallback content)
    const sessions = await Promise.all(
      links.map(async (link) => {
        const session = await ctx.db.get(link.sessionId);
        if (!session) return { title: 'Untitled', hasIndex: false, notesPreview: '', hasContent: false };

        const sessionNotes = await ctx.db
          .query('sessionNotes')
          .withIndex('by_session', (q) => q.eq('sessionId', link.sessionId))
          .unique();

        const plainText = sessionNotes?.plainText ?? session.notesPlainText ?? '';
        const transcript = session.transcript ?? '';

        return {
          title: session.title ?? 'Untitled',
          hasIndex: !!link.topicIndex,
          // Truncate for context window — first 2000 chars of notes + first 2000 of transcript
          notesPreview: plainText.slice(0, 2000),
          transcriptPreview: transcript.slice(0, 2000),
          hasContent: !!(plainText || transcript),
        };
      }),
    );

    // If topic indexes have real content, use the structured brain context
    if (allTopics.length > 0) {
      let brainContext = 'EXAM ROOM KNOWLEDGE MAP:\n\n';
      const topicsBySession = new Map<string, TopicEntry[]>();
      for (const topic of allTopics) {
        const existing = topicsBySession.get(topic.sessionTitle) ?? [];
        existing.push(topic);
        topicsBySession.set(topic.sessionTitle, existing);
      }
      for (const [sessionTitle, topics] of topicsBySession) {
        brainContext += `--- ${sessionTitle} ---\n`;
        for (const t of topics) {
          brainContext += `• ${t.topic}: ${t.concepts.join(', ')}\n`;
        }
        brainContext += '\n';
      }

      return {
        brainContext,
        sessionTitles: sessions.map((s) => s.title),
      };
    }

    // Fallback: topic indexes are empty, give Nugget raw session content
    let fallbackContext = 'SESSION CONTENT (no topic index available):\n\n';
    for (const session of sessions) {
      if (!session.hasContent) continue;
      fallbackContext += `--- ${session.title} ---\n`;
      if (session.notesPreview) {
        fallbackContext += `NOTES:\n${session.notesPreview}\n\n`;
      }
      if (session.transcriptPreview) {
        fallbackContext += `TRANSCRIPT:\n${session.transcriptPreview}\n\n`;
      }
    }

    return {
      brainContext: fallbackContext,
      sessionTitles: sessions.map((s) => s.title),
    };
  },
});

/** Get session content for specific topics (for targeted review) */
export const getSessionContentForTopics = internalQuery({
  args: {
    examRoomId: v.id('examRooms'),
    topics: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const topicSet = new Set(args.topics.map((t) => t.toLowerCase()));
    const relevantSessions: Array<{
      title: string;
      transcript: string;
      notes: string;
    }> = [];

    for (const link of links) {
      // Check if this session's topic index mentions any of the requested topics
      let isRelevant = false;
      if (link.topicIndex) {
        try {
          const index: TopicIndex = JSON.parse(link.topicIndex);
          if (index.topics.length === 0) {
            // Empty index (indexing ran before content existed) — include it
            isRelevant = true;
          } else {
            isRelevant = index.topics.some(
              (t) =>
                topicSet.has(t.topic.toLowerCase()) ||
                t.concepts.some((c) => topicSet.has(c.toLowerCase())),
            );
          }
        } catch {
          // If we can't parse, include it to be safe
          isRelevant = true;
        }
      } else {
        // No index yet — include it
        isRelevant = true;
      }

      if (isRelevant) {
        const session = await ctx.db.get(link.sessionId);
        if (session) {
          const sessionNotes = await ctx.db
            .query('sessionNotes')
            .withIndex('by_session', (q) => q.eq('sessionId', link.sessionId))
            .unique();
          relevantSessions.push({
            title: session.title,
            transcript: session.transcript ?? '',
            notes: sessionNotes?.plainText ?? session.notesPlainText ?? '',
          });
        }
      }
    }

    return relevantSessions;
  },
});

/** Get all session content for full tool generation */
export const getAllSessionContent = internalQuery({
  args: {
    examRoomId: v.id('examRooms'),
  },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    const sessions: Array<{
      sessionId: Id<'sessions'>;
      title: string;
      transcript: string;
      notes: string;
      lectureType: string;
    }> = [];

    for (const link of links) {
      const session = await ctx.db.get(link.sessionId);
      if (session) {
        const sessionNotes = await ctx.db
          .query('sessionNotes')
          .withIndex('by_session', (q) => q.eq('sessionId', link.sessionId))
          .unique();
        sessions.push({
          sessionId: link.sessionId,
          title: session.title,
          transcript: session.transcript ?? '',
          notes: sessionNotes?.plainText ?? session.notesPlainText ?? '',
          lectureType: session.lectureType ?? 'general',
        });
      }
    }

    return sessions;
  },
});

// ─── Public Mutations ───────────────────────────────────────

/** Re-index sessions with empty topic indexes (host or member can trigger). */
export const reindexEmptySessions = mutation({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireExamRoomMember(ctx, args.examRoomId, userId);

    const links = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room', (q) => q.eq('examRoomId', args.examRoomId))
      .collect();

    let reindexed = 0;
    for (const link of links) {
      // Re-index if topic index is missing or has empty topics
      let needsReindex = !link.topicIndex;
      if (link.topicIndex) {
        try {
          const index: TopicIndex = JSON.parse(link.topicIndex);
          needsReindex = index.topics.length === 0;
        } catch {
          needsReindex = true;
        }
      }

      if (needsReindex) {
        // Clear the stale empty index so it re-runs
        await ctx.db.patch(link._id, { topicIndex: undefined });
        await ctx.scheduler.runAfter(0, internal.examBrain.indexSession, {
          examRoomId: args.examRoomId,
          sessionId: link.sessionId,
        });
        reindexed++;
      }
    }

    return { reindexed };
  },
});

// ─── Internal Mutations ─────────────────────────────────────

/** Save the extracted topic index for a session */
export const saveTopicIndex = internalMutation({
  args: {
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
    topicIndex: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('examRoomSessions')
      .withIndex('by_room_session', (q) =>
        q.eq('examRoomId', args.examRoomId).eq('sessionId', args.sessionId),
      )
      .unique();

    if (link) {
      await ctx.db.patch(link._id, { topicIndex: args.topicIndex });
    }
  },
});

// ─── Internal Actions ───────────────────────────────────────

/** Index a session using Sonnet — extracts structured topic map */
export const indexSession = internalAction({
  args: {
    examRoomId: v.id('examRooms'),
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.examBrain.getSessionForIndexing, {
      sessionId: args.sessionId,
    });

    if (!session || (!session.transcript && !session.notesPlainText)) {
      // Nothing to index — save empty index
      const emptyIndex: TopicIndex = { topics: [], extractedAt: Date.now() };
      await ctx.runMutation(internal.examBrain.saveTopicIndex, {
        examRoomId: args.examRoomId,
        sessionId: args.sessionId,
        topicIndex: JSON.stringify(emptyIndex),
      });
      return;
    }

    // Build input — truncate to keep prompt reasonable
    const transcriptSlice = session.transcript.slice(-6000);
    const notesSlice = session.notesPlainText.slice(0, 3000);

    let input = '';
    if (transcriptSlice) input += `TRANSCRIPT:\n${transcriptSlice}\n\n`;
    if (notesSlice) input += `NOTES:\n${notesSlice}\n`;

    const prompt = `You are an academic content indexer for ScribeCat, an ADHD-friendly study app.

Analyze this lecture content and extract a structured topic index. For each major topic, list the key concepts, terms, and definitions covered.

${input}

Return ONLY valid JSON matching this exact schema (no markdown wrapping):
{
  "topics": [
    {
      "topic": "Main topic or theme name",
      "concepts": ["concept 1", "concept 2", "key term", "definition"]
    }
  ]
}

Extract 3-8 topics. Each topic should have 2-6 key concepts. Use clear, concise labels.`;

    try {
      const responseText = await callClaude({
        maxTokens: 1024,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      });
      const jsonStr = extractJson(responseText);
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize
      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        throw new Error('Invalid topic index structure');
      }

      const topicIndex: TopicIndex = {
        topics: parsed.topics.slice(0, 8).map((t: { topic: string; concepts: string[] }) => ({
          topic: String(t.topic).slice(0, 100),
          concepts: (t.concepts ?? []).slice(0, 6).map((c: string) => String(c).slice(0, 80)),
          sessionTitle: session.title,
        })),
        extractedAt: Date.now(),
      };

      await ctx.runMutation(internal.examBrain.saveTopicIndex, {
        examRoomId: args.examRoomId,
        sessionId: args.sessionId,
        topicIndex: JSON.stringify(topicIndex),
      });
    } catch (error) {
      console.error('Failed to index session:', error);
      // Save empty index so we don't retry endlessly
      const emptyIndex: TopicIndex = { topics: [], extractedAt: Date.now() };
      await ctx.runMutation(internal.examBrain.saveTopicIndex, {
        examRoomId: args.examRoomId,
        sessionId: args.sessionId,
        topicIndex: JSON.stringify(emptyIndex),
      });
    }
  },
});
