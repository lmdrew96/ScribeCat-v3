/**
 * NuggetNotes - Haiku-powered note generation
 * Called every ~45 seconds during recording to generate 1-3 bullet notes.
 * Uses context from Sonnet for better understanding.
 */

import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
import { AI_MODEL } from './config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export interface LectureContext {
  themes: string[];
  currentTopic: string;
  definitions: string[];
  structureHint: string;
}

export interface NuggetNote {
  id: string;
  text: string;
  timestamp: number;
  recordingTime: number;
}

export const generateNuggetNotes = httpAction(async (ctx, request) => {
  const { transcript, context, recordingTimeSeconds } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  // Build context string
  const contextStr = context?.currentTopic
    ? `Topic: "${context.currentTopic}". Themes: ${context.themes?.join(', ') || 'general'}.`
    : 'Lecture in progress.';

  const prompt = `Create 1-3 concise bullet notes from this lecture segment.

CONTEXT: ${contextStr}

TRANSCRIPT:
"${transcript.slice(-500)}"

Output ONLY bullet points (no intro, no explanation). Each must start with "- ":`;

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 150,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse response into notes
    const lines = responseText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-') || line.startsWith('•'));

    const now = Date.now();
    let noteCounter = 0;

    const notes: NuggetNote[] = lines
      .slice(0, 3) // Max 3 notes per generation
      .map((line) => {
        // Remove bullet point prefix and clean up
        const text = line
          .replace(/^[-•]\s*/, '')
          .replace(/\*\*/g, '') // Remove markdown bold
          .trim();

        if (text.length < 5) return null; // Skip very short notes

        noteCounter++;
        return {
          id: `note-${now}-${noteCounter}`,
          text,
          timestamp: now,
          recordingTime: recordingTimeSeconds,
        };
      })
      .filter((note): note is NuggetNote => note !== null);

    return new Response(
      JSON.stringify({
        notes,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error('Error generating nugget notes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate notes';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        notes: [],
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
