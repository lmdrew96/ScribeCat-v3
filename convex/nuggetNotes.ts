/**
 * NuggetNotes - Haiku-powered note generation
 * Called every ~45 seconds during recording to generate 1-3 bullet notes.
 * Uses context from Sonnet for better understanding.
 * Lecture-type-aware for context-specific note generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
import { AI_MODEL } from './config';
import { type LectureType, getNuggetNotePrompt } from './prompts';

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

export const generateNuggetNotes = httpAction(async (_ctx, request) => {
  const { transcript, context, recordingTimeSeconds, lectureType } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = getNuggetNotePrompt(
    transcript,
    context,
    (lectureType || 'general') as LectureType,
  );

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
