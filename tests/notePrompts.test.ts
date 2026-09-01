import { describe, expect, it } from 'vitest';
import {
  type NuggetNoteInput,
  getNoteGenerationPrompt,
  getNoteGenerationPromptWithCitations,
} from '../convex/prompts';

const NUGGET_NOTES: NuggetNoteInput[] = [
  { text: 'Meiosis produces four haploid daughter cells.', recordingTime: 184 },
  { text: 'Crossing over happens in prophase I.', recordingTime: 372 },
];

const SEGMENTS = [{ text: 'Some lecture content.', timestamp: 1000, isFinal: true }];

describe('getNoteGenerationPrompt with live notes', () => {
  it('includes the captured notes with m:ss timestamps', () => {
    const prompt = getNoteGenerationPrompt('transcript', 'general', undefined, NUGGET_NOTES);
    expect(prompt).toContain('KEY POINTS CAPTURED DURING THE LECTURE');
    expect(prompt).toContain('[3:04] Meiosis produces four haploid daughter cells.');
    expect(prompt).toContain('[6:12] Crossing over happens in prophase I.');
  });

  it('tells the model it may overrule them', () => {
    // The live pass sees only short excerpts, so the full pass has to be free to
    // correct it rather than faithfully restating a mistake.
    const prompt = getNoteGenerationPrompt('transcript', 'general', undefined, NUGGET_NOTES);
    expect(prompt).toContain('correct anything the full transcript contradicts');
  });

  it('omits the section entirely when there are no notes', () => {
    for (const notes of [undefined, []]) {
      const prompt = getNoteGenerationPrompt('transcript', 'general', undefined, notes);
      expect(prompt).not.toContain('KEY POINTS CAPTURED');
    }
  });

  it('keeps the student notes framing separate from the live notes', () => {
    const prompt = getNoteGenerationPrompt('transcript', 'general', 'my own notes', NUGGET_NOTES);
    expect(prompt).toContain('YOUR NOTES (taken during the lecture)');
    expect(prompt).toContain('KEY POINTS CAPTURED DURING THE LECTURE');
  });

  it('caps how many notes reach the prompt, keeping the most recent', () => {
    const many: NuggetNoteInput[] = Array.from({ length: 80 }, (_, i) => ({
      text: `note-${i}`,
      recordingTime: i * 60,
    }));
    const prompt = getNoteGenerationPrompt('transcript', 'general', undefined, many);
    expect(prompt).not.toContain('note-19 ');
    expect(prompt).toContain('note-79');
    expect(prompt.match(/^- \[/gm) ?? []).toHaveLength(60);
  });
});

describe('getNoteGenerationPromptWithCitations with live notes', () => {
  it('includes the section without disturbing the citation instructions', () => {
    const prompt = getNoteGenerationPromptWithCitations(
      SEGMENTS,
      'general',
      undefined,
      NUGGET_NOTES,
    );
    expect(prompt).toContain('KEY POINTS CAPTURED DURING THE LECTURE');
    expect(prompt).toContain('[cite:XXXXX]');
    expect(prompt).toContain('TIMESTAMPED TRANSCRIPT:');
  });
});
