import { v } from 'convex/values';
import { action } from './_generated/server';
import { parseCitations } from './citations';
import { callClaude } from './config';
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

    const generatedNotes = await callClaude({
      maxTokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

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
