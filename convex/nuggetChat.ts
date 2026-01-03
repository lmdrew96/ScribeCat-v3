/**
 * NuggetChat - Sonnet-powered chat for Q&A about transcript/notes
 * Provides contextual responses based on the lecture content.
 */

import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
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

export const nuggetChat = httpAction(async (ctx, request) => {
  const { message, conversationHistory, transcript, notes } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  // Build system prompt with context
  let systemPrompt = `You are Nugget 🐱, a friendly and helpful AI assistant for ScribeCat, a note-taking app for students. You help students understand their lecture content, answer questions, and provide study assistance.

Your personality:
- Friendly and encouraging
- Concise but thorough
- Use occasional cat-related puns or emoji (but don't overdo it)
- Focus on being genuinely helpful for studying

`;

  if (transcript) {
    systemPrompt += `\n## Lecture Transcript\nThe user has provided this transcript from their lecture recording:\n\n${transcript}\n\n`;
  }

  if (notes) {
    systemPrompt += `\n## User's Notes\nThe user has taken these notes:\n\n${notes}\n\n`;
  }

  if (!transcript && !notes) {
    systemPrompt += `\nNote: The user hasn't included their transcript or notes in this conversation. You can still help with general questions, but encourage them to include context for more specific help.\n`;
  }

  // Build messages array
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
