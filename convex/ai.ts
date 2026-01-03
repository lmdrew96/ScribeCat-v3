import Anthropic from '@anthropic-ai/sdk';
import { v } from 'convex/values';
import { action } from './_generated/server';

export const generateNotesFromTranscript = action({
  args: {
    transcript: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
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
${args.transcript}

Please generate well-structured markdown notes from this transcript. Include diagram suggestions in HTML comments where visual aids would enhance understanding.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedNotes = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      notes: generatedNotes,
      success: true,
    };
  },
});
