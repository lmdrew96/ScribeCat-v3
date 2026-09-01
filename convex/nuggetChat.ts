/**
 * NuggetChat - chat for Q&A about transcript/notes.
 * Runs on the callClaude default model (see convex/config.ts) — it does not
 * pass its own, so naming a model here would drift the moment that changes.
 * Provides contextual responses based on the lecture content.
 * Accepts lecture type and Nugget's AI-generated notes for richer context.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
import { callClaude } from './config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatPromptInput {
  transcript?: string;
  notes?: string;
  nuggetNotes?: string;
  lectureType?: string;
  currentDateTime?: string;
}

/**
 * Builds the system prompt as cacheable blocks.
 *
 * Exported so the prefix-stability property can be tested directly: the cached
 * block must be byte-identical across turns that differ only in volatile inputs.
 * A silent regression there is exactly how prompt caching fails — no error, just
 * a 0% hit rate that costs more than not caching at all.
 */
export function buildChatSystemPrompt({
  transcript,
  notes,
  nuggetNotes,
  lectureType,
  currentDateTime,
}: ChatPromptInput): Anthropic.Messages.TextBlockParam[] {
  // The system prompt is built in two halves so the expensive part can be cached.
  //
  // CACHED: personality, lecture type, and the transcript. For a 50-minute
  // lecture the transcript dominates the prompt and was previously re-sent and
  // re-billed on every single chat turn.
  //
  // UNCACHED: the student's notes, Nugget's notes, and the current time. These
  // change while a session is live — notes as the student types, the clock every
  // minute — and caching is a prefix match, so anything volatile placed before
  // the transcript would invalidate it on every message. The clock in particular
  // sat at position 2 in the old ordering, which would have made a naive
  // cache_control a pure loss.
  let systemPrompt = `You are Nugget, a friendly and helpful AI study companion in ScribeCat, a note-taking app for students. You help students understand their lecture content, answer questions, and provide study assistance.

Your personality:
- Warm, encouraging, and concise
- You genuinely care about helping students learn
- Use markdown formatting (bold, lists, code blocks) to make responses scannable
- Keep responses focused — students are busy
- Occasional cat puns are welcome but keep them subtle

`;

  if (lectureType && lectureType !== 'general') {
    systemPrompt += `## Lecture Type\nThis is a **${lectureType}** lecture. Tailor your explanations accordingly.\n\n`;
  }

  if (transcript) {
    systemPrompt += `## Lecture Transcript\nThe student has provided this transcript from their lecture recording:\n\n${transcript}\n\n`;
  }

  // ── everything below here is volatile and must stay after the breakpoint ──
  let volatilePrompt = '';

  if (notes) {
    volatilePrompt += `## Student's Notes\nThe student has taken these notes:\n\n${notes}\n\n`;
  }

  if (nuggetNotes) {
    volatilePrompt += `## AI-Generated Key Points\nThese are key points automatically identified during recording:\n\n${nuggetNotes}\n\n`;
  }

  if (currentDateTime) {
    volatilePrompt += `## Current Date & Time\n${currentDateTime}\n\n`;
  }

  if (!transcript && !notes && !nuggetNotes) {
    volatilePrompt += `\nNote: The student hasn't included their transcript or notes in this conversation. You can still help with general study questions, but encourage them to start a recording or select a session for more specific help.\n`;
  }

  // Only mark a breakpoint when there is a transcript worth caching. Haiku's
  // minimum cacheable prefix is 4096 tokens — below that a breakpoint silently
  // does nothing, so short sessions just skip it.
  const system: Anthropic.Messages.TextBlockParam[] = transcript
    ? [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ...(volatilePrompt ? [{ type: 'text' as const, text: volatilePrompt }] : []),
      ]
    : [{ type: 'text', text: systemPrompt + volatilePrompt }];

  return system;
}

export const nuggetChat = httpAction(async (_ctx, request) => {
  const {
    message,
    conversationHistory,
    transcript,
    notes,
    lectureType,
    nuggetNotes,
    currentDateTime,
  } = await request.json();

  const system = buildChatSystemPrompt({
    transcript,
    notes,
    nuggetNotes,
    lectureType,
    currentDateTime,
  });

  // Build messages array
  const messages: ChatMessage[] = [
    ...(conversationHistory || []),
    { role: 'user' as const, content: message },
  ];

  try {
    const responseText = await callClaude({
      maxTokens: 1024,
      system,
      onUsage: (usage) => {
        // The only reliable signal that the cache is working. If
        // cache_read_input_tokens stays 0 across turns of one conversation,
        // something in the prefix is still varying.
        console.log(
          `[nuggetChat] tokens in=${usage.input_tokens} cache_write=${usage.cache_creation_input_tokens ?? 0} cache_read=${usage.cache_read_input_tokens ?? 0}`,
        );
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return new Response(
      JSON.stringify({
        response: responseText,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error('Error in nugget chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
