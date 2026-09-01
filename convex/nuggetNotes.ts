/**
 * NuggetNotes - note generation during recording.
 * Runs on the callClaude default model (see convex/config.ts); cadence and
 * window size are owned by the client (DEFAULT_CONFIG in use-nugget-notes.ts).
 * The prompt asks for 0-2 notes and may return none — silence on a transitional
 * segment is a valid result, not a failure.
 * Lecture-type-aware for context-specific note generation.
 */

import { httpAction } from './_generated/server';
import { callClaude } from './config';
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
  const { transcript, context, recordingTimeSeconds, lectureType, userNotes, recentNoteTexts } =
    (await request.json()) as {
      transcript: string;
      context: LectureContext;
      recordingTimeSeconds: number;
      lectureType: string;
      userNotes?: string;
      recentNoteTexts?: string[];
    };

  const prompt = getNuggetNotePrompt(
    transcript,
    context,
    (lectureType || 'general') as LectureType,
    userNotes,
    recentNoteTexts,
  );

  try {
    const responseText = await callClaude({
      maxTokens: 150,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse response into notes
    const lines = responseText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-') || line.startsWith('•'));

    const now = Date.now();
    let noteCounter = 0;

    const notes: NuggetNote[] = lines
      // Safety net for a model that overruns the prompt's 0-2 request.
      .slice(0, 3)
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
