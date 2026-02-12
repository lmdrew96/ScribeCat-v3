/**
 * NuggetChat - Sonnet-powered chat for Q&A about transcript/notes
 * Provides contextual responses based on the lecture content.
 * Accepts lecture type and Nugget's AI-generated notes for richer context.
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
  const { message, conversationHistory, transcript, notes, lectureType, nuggetNotes } =
    await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  // Build system prompt with context
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

  if (notes) {
    systemPrompt += `## Student's Notes\nThe student has taken these notes:\n\n${notes}\n\n`;
  }

  if (nuggetNotes) {
    systemPrompt += `## AI-Generated Key Points\nThese are key points automatically identified during recording:\n\n${nuggetNotes}\n\n`;
  }

  if (!transcript && !notes && !nuggetNotes) {
    systemPrompt += `\nNote: The student hasn't included their transcript or notes in this conversation. You can still help with general study questions, but encourage them to start a recording or select a session for more specific help.\n`;
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
