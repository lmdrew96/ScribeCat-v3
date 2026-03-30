/**
 * ScrubTranscript - Haiku-powered transcript accuracy correction
 * Called every ~2 minutes during recording to fix STT errors using lecture context.
 * Operates on a sliding window of the last 800 words — fixed cost regardless of session length.
 */

import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
import { AI_MODEL } from './config';
import type { LectureContext } from './lectureContext';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const scrubTranscript = httpAction(async (_ctx, request) => {
  const { rawWindow, lectureContext } = (await request.json()) as {
    rawWindow: string;
    lectureContext: LectureContext;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a speech-to-text transcript editor. Your only job is to fix errors made by the speech recognition system.

Fix ONLY:
- Misheard words (e.g., "there" → "their", "socio-logical" → "sociological")
- Incorrect proper nouns, names, or technical terms (use the lecture context to correct these)
- Broken compound words or garbled phrases from the STT system
- Obvious punctuation and capitalization artifacts from STT

DO NOT:
- Paraphrase or rephrase anything
- Remove any content
- Add new content or commentary
- Change sentence structure beyond what is needed to fix a transcription error

Return ONLY the corrected transcript text. No preamble, no explanation, no markdown.

Lecture context (use this to identify and correct domain-specific terms, names, and concepts):
${JSON.stringify(lectureContext)}`;

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: rawWindow,
        },
      ],
    });

    const scrubbedWindow =
      message.content[0].type === 'text' ? message.content[0].text.trim() : rawWindow;

    return new Response(
      JSON.stringify({
        scrubbedWindow,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error('Error scrubbing transcript:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrub transcript';
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
