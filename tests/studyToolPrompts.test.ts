import { describe, expect, it } from 'vitest';
import {
  STUDY_TOOL_TRANSCRIPT_CHARS,
  buildInput,
  getConceptMapPrompt,
  getEli5Prompt,
  getFlashcardPrompt,
  getJeopardyPrompt,
  getKeyConceptsPrompt,
  getQuizPrompt,
  getSummaryPrompt,
} from '../convex/studyToolPrompts';

/**
 * The lecture material is sent as a cached prefix shared by every study tool.
 * Caching is a byte-exact prefix match, so these guard the two ways it breaks
 * silently: the prefix varying between tools, and lecture text leaking into a
 * per-tool instruction.
 */
describe('study tool prompt caching shape', () => {
  const transcript = 'The mitochondria is the powerhouse of the cell. '.repeat(1000);
  const notes = 'ATP synthesis happens in the inner membrane.';

  it('builds the same lecture prefix every time for the same session', () => {
    expect(buildInput(transcript, notes)).toBe(buildInput(transcript, notes));
  });

  it('keeps the last STUDY_TOOL_TRANSCRIPT_CHARS of a long transcript', () => {
    const input = buildInput(transcript, undefined);
    expect(input).toContain(transcript.slice(-STUDY_TOOL_TRANSCRIPT_CHARS));
    expect(input.length).toBeLessThan(STUDY_TOOL_TRANSCRIPT_CHARS + 100);
  });

  it('is long enough to clear Haiku 4.5’s 4096-token cache minimum on a real lecture', () => {
    // ~4 chars per token is a rough rule; this just checks the cap isn't
    // quietly lowered back under the threshold.
    expect(STUDY_TOOL_TRANSCRIPT_CHARS / 4).toBeGreaterThan(4096);
  });

  it('never puts lecture text in the per-tool instructions', () => {
    const instructions = [
      getSummaryPrompt('stem'),
      getKeyConceptsPrompt('stem'),
      getFlashcardPrompt('stem', 10),
      getQuizPrompt('stem', 10),
      getConceptMapPrompt('stem'),
      getEli5Prompt('stem'),
      getJeopardyPrompt('stem'),
    ];
    for (const instruction of instructions) {
      expect(instruction).not.toContain('TRANSCRIPT:');
      expect(instruction).not.toContain('mitochondria');
    }
  });
});
