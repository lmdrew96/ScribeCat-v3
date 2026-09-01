import { describe, expect, it } from 'vitest';
import { buildChatSystemPrompt } from '../convex/nuggetChat';

const TRANSCRIPT = 'Lorem ipsum lecture content. '.repeat(200);

const base = {
  transcript: TRANSCRIPT,
  notes: 'my notes',
  nuggetNotes: 'key points',
  lectureType: 'stem',
  currentDateTime: 'Monday, September 1, 2026 at 9:15 AM',
};

/** The block carrying cache_control, if any. */
function cachedBlock(blocks: ReturnType<typeof buildChatSystemPrompt>) {
  return blocks.find((b) => b.cache_control);
}

describe('buildChatSystemPrompt cache prefix', () => {
  it('marks a breakpoint when there is a transcript to cache', () => {
    const blocks = buildChatSystemPrompt(base);
    expect(cachedBlock(blocks)).toBeDefined();
    expect(cachedBlock(blocks)?.text).toContain(TRANSCRIPT.trim().slice(0, 40));
  });

  it('keeps the cached block byte-identical as volatile inputs change', () => {
    // The whole point. Caching is a strict prefix match, so if anything that
    // changes between turns leaks into the cached block, the hit rate is zero.
    const first = cachedBlock(buildChatSystemPrompt(base))?.text;
    const later = cachedBlock(
      buildChatSystemPrompt({
        ...base,
        notes: 'my notes, now much longer after more typing',
        nuggetNotes: 'key points plus three more',
        currentDateTime: 'Monday, September 1, 2026 at 9:47 AM',
      }),
    )?.text;

    expect(first).toBeDefined();
    expect(later).toBe(first);
  });

  it('keeps the clock out of the cached block', () => {
    // currentDateTime has minute granularity and used to sit at position 2,
    // ahead of the transcript — a naive cache_control there would have been a
    // pure loss.
    const blocks = buildChatSystemPrompt(base);
    expect(cachedBlock(blocks)?.text).not.toContain('9:15 AM');
    expect(blocks.map((b) => b.text).join('')).toContain('9:15 AM');
  });

  it('keeps the student and Nugget notes out of the cached block', () => {
    const cached = cachedBlock(buildChatSystemPrompt(base))?.text ?? '';
    expect(cached).not.toContain('my notes');
    expect(cached).not.toContain('key points');
  });

  it('invalidates the prefix when the transcript itself grows, as it must', () => {
    const grown = cachedBlock(
      buildChatSystemPrompt({ ...base, transcript: `${TRANSCRIPT} and more` }),
    )?.text;
    expect(grown).not.toBe(cachedBlock(buildChatSystemPrompt(base))?.text);
  });

  it('skips the breakpoint entirely with no transcript', () => {
    // Nothing worth caching, and a short prefix would silently no-op anyway.
    const blocks = buildChatSystemPrompt({ ...base, transcript: undefined });
    expect(cachedBlock(blocks)).toBeUndefined();
    expect(blocks).toHaveLength(1);
  });

  it('still includes every section it is given', () => {
    const all = buildChatSystemPrompt(base)
      .map((b) => b.text)
      .join('');
    expect(all).toContain('Lecture Transcript');
    expect(all).toContain("Student's Notes");
    expect(all).toContain('AI-Generated Key Points');
    expect(all).toContain('Lecture Type');
  });
});
