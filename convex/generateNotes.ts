import Anthropic from '@anthropic-ai/sdk';
import { httpAction } from './_generated/server';
import { AI_MODEL } from './config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const generateNotes = httpAction(async (ctx, request) => {
  const { transcript, sessionId } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are an expert note-taking assistant. Given the following lecture transcript, create comprehensive, well-structured notes in markdown format.

IMPORTANT GUIDELINES:
1. Use clear headings (# for main topics, ## for subtopics, ### for details)
2. Use bullet points for lists
3. Use **bold** for key terms and concepts
4. Use *italics* for emphasis
5. Create numbered lists for sequential information
6. Include blockquotes (>) for important quotes or definitions
7. Suggest diagrams where visual representations would help (use comments like <!-- DIAGRAM: [description] -->)
8. Organize information hierarchically
9. Keep the notes concise but comprehensive

TRANSCRIPT:
${transcript}

Please generate well-structured markdown notes from this transcript. Include diagram suggestions in HTML comments where visual aids would enhance understanding.`;

  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedNotes = message.content[0].type === 'text' ? message.content[0].text : '';

    return new Response(
      JSON.stringify({
        notes: generatedNotes,
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error('Error generating notes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate notes';
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
