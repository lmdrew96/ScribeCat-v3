import Anthropic from '@anthropic-ai/sdk';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { parseCitations } from './citations';
import { AI_MODEL } from './config';
import {
  type LectureType,
  getNoteGenerationPrompt,
  getNoteGenerationPromptWithCitations,
} from './prompts';

export const generateNotesFromTranscript = action({
  args: {
    transcript: v.string(),
    transcriptSegments: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timestamp: v.number(),
          isFinal: v.boolean(),
        }),
      ),
    ),
    sessionId: v.string(),
    lectureType: v.optional(v.string()),
    existingNotes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({ apiKey });
    const lectureType = (args.lectureType || 'general') as LectureType;

    // Use citation-aware prompt when segments are available
    const prompt =
      args.transcriptSegments && args.transcriptSegments.length > 0
        ? getNoteGenerationPromptWithCitations(
            args.transcriptSegments,
            lectureType,
            args.existingNotes,
          )
        : getNoteGenerationPrompt(args.transcript, lectureType, args.existingNotes);

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

    // Parse citations if segments were provided
    const citations =
      args.transcriptSegments && args.transcriptSegments.length > 0
        ? parseCitations(generatedNotes, args.transcriptSegments)
        : [];

    return {
      notes: generatedNotes,
      citations,
      success: true,
    };
  },
});
