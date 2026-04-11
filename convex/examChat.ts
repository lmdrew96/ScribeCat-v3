/**
 * Exam Chat — Multi-session Nugget Chat for exam rooms.
 * Uses the Exam Room Brain's topic index as context instead of raw transcripts.
 * Haiku handles per-message chat; the brain provides intelligent context routing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { v } from 'convex/values';
import { httpAction } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuth } from './authHelpers';
import { AI_MODEL } from './config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── HTTP Action ─────────────────────────────────────────────

export const examNuggetChat = httpAction(async (_ctx, request) => {
  const { message, conversationHistory, brainContext, sessionTitles } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  let systemPrompt = `You are Nugget, a friendly and expert AI study companion in ScribeCat's Exam Study Room. You're helping a student prepare for an exam by reviewing multiple lecture sessions at once.

Your personality:
- Warm, encouraging, and concise
- You genuinely care about helping students ace their exams
- Use markdown formatting (bold, lists, code blocks) to make responses scannable
- Keep responses focused — exam prep time is precious
- Occasional cat puns are welcome but keep them subtle

## Exam Room Context
The student has ${(sessionTitles as string[])?.length ?? 0} sessions loaded for exam prep:
${(sessionTitles as string[])?.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') ?? 'No sessions yet'}

`;

  if (brainContext) {
    systemPrompt += `## Knowledge Map (Topics & Concepts)\n${brainContext}\n\n`;
  }

  systemPrompt += `## Your Role
- Answer questions about ANY of the loaded sessions
- Help the student understand connections between topics across sessions
- Quiz them informally if they ask
- Suggest which areas to focus on based on their questions
- If they ask about something not in the knowledge map, let them know it might not be covered in their sessions

`;

  const messages: ChatMessage[] = [
    ...(conversationHistory || []),
    { role: 'user' as const, content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    return new Response(JSON.stringify({ response: responseText, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error('Error in exam nugget chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// ─── Queries ─────────────────────────────────────────────────

/** Get chat history for the current user in an exam room. */
export const getExamChatHistory = query({
  args: { examRoomId: v.id('examRooms') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    return await ctx.db
      .query('examChatHistory')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();
  },
});

// ─── Mutations ──────────────────────────────────────────────

/** Save/update chat history for the current user in an exam room. */
export const saveExamChatHistory = mutation({
  args: {
    examRoomId: v.id('examRooms'),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const existing = await ctx.db
      .query('examChatHistory')
      .withIndex('by_room_user', (q) => q.eq('examRoomId', args.examRoomId).eq('userId', userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('examChatHistory', {
        examRoomId: args.examRoomId,
        userId,
        messages: args.messages,
        updatedAt: Date.now(),
      });
    }
  },
});
