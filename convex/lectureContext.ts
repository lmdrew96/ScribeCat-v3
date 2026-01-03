/**
 * LectureContext - Sonnet-powered context extraction
 * Called every ~2 minutes during recording to extract lecture understanding.
 * Returns themes, current topic, definitions, and structure hints.
 */

import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';

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

const EMPTY_CONTEXT: LectureContext = {
  themes: [],
  currentTopic: '',
  definitions: [],
  structureHint: '',
};

export const extractLectureContext = httpAction(async (ctx, request) => {
  const { transcript, previousContext } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const prevContext = previousContext ? JSON.stringify(previousContext) : JSON.stringify(EMPTY_CONTEXT);

  const prompt = `Analyze this lecture transcript and extract structured context. Be very concise.

PREVIOUS CONTEXT:
${prevContext}

RECENT TRANSCRIPT:
"${transcript.slice(-1500)}"

Return ONLY valid JSON (no markdown, no explanation):
{"themes":["theme1","theme2"],"currentTopic":"topic being discussed now","definitions":["term: definition"],"structureHint":"brief note about lecture flow"}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Parse the JSON response
    let context: LectureContext = EMPTY_CONTEXT;
    try {
      // Try to extract JSON from response (handle potential markdown wrapping)
      let jsonStr = responseText.trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Find JSON object boundaries
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        
        // Validate structure
        if (
          Array.isArray(parsed.themes) &&
          typeof parsed.currentTopic === 'string' &&
          Array.isArray(parsed.definitions) &&
          typeof parsed.structureHint === 'string'
        ) {
          context = {
            themes: parsed.themes.slice(0, 5),
            currentTopic: parsed.currentTopic.slice(0, 100),
            definitions: parsed.definitions.slice(0, 5),
            structureHint: parsed.structureHint.slice(0, 100),
          };
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse context response:', parseError);
    }

    return new Response(
      JSON.stringify({
        context,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error('Error extracting lecture context:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract context';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        context: EMPTY_CONTEXT,
        success: false,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
