import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE_WORDS,
  SINGLE_WINDOW_MAX_WORDS,
  WINDOW_OVERLAP_WORDS,
  buildUnprocessedWindows,
} from '../src/renderer/lib/nugget-windows';

/** Builds a transcript of `count` uniquely identifiable words: "w0 w1 w2 ...". */
function transcriptOf(count: number): string {
  return Array.from({ length: count }, (_, i) => `w${i}`).join(' ');
}

/** The words a set of windows collectively covers. */
function coveredWords(windows: string[]): Set<string> {
  return new Set(windows.flatMap((w) => w.split(' ')));
}

describe('buildUnprocessedWindows', () => {
  it('returns nothing when there is no unprocessed content', () => {
    expect(buildUnprocessedWindows(transcriptOf(500), 0)).toEqual({
      windows: [],
      consumedWordCount: 0,
    });
    expect(buildUnprocessedWindows(transcriptOf(500), -5)).toEqual({
      windows: [],
      consumedWordCount: 0,
    });
  });

  it('returns nothing for an empty or whitespace-only transcript', () => {
    expect(buildUnprocessedWindows('', 50).windows).toEqual([]);
    expect(buildUnprocessedWindows('   \n  ', 50).windows).toEqual([]);
  });

  it('sends a small backlog as a single window', () => {
    const { windows, consumedWordCount } = buildUnprocessedWindows(transcriptOf(500), 60);
    expect(windows).toHaveLength(1);
    expect(consumedWordCount).toBe(60);
  });

  it('includes overlap context from before the unprocessed span', () => {
    const { windows } = buildUnprocessedWindows(transcriptOf(500), 60);
    // Unprocessed starts at w440; overlap should reach back to w420.
    expect(windows[0].startsWith(`w${500 - 60 - WINDOW_OVERLAP_WORDS} `)).toBe(true);
  });

  it('never claims more words than the transcript actually holds', () => {
    // The live buffer is capped and drops old text, so the counter can outrun it.
    const { windows, consumedWordCount } = buildUnprocessedWindows(transcriptOf(30), 5000);
    expect(consumedWordCount).toBe(30);
    expect(coveredWords(windows).size).toBe(30);
  });
});

describe('buildUnprocessedWindows — coverage property', () => {
  // This is the regression the patch exists for: a fixed 150-word tail dropped
  // everything a cycle produced beyond 150 words. Every unprocessed word must
  // now appear in at least one window.
  const cases = [
    { total: 1000, unprocessed: 60 }, // quiet stretch
    { total: 1000, unprocessed: 120 }, // exactly the single-window boundary
    { total: 1000, unprocessed: 121 }, // first word past it — starts chunking
    { total: 1000, unprocessed: 225 }, // ~90s at 150 wpm, the everyday case
    { total: 1000, unprocessed: 450 }, // a stalled tab catching up
    { total: 200, unprocessed: 200 }, // whole buffer unprocessed
  ];

  for (const { total, unprocessed } of cases) {
    it(`covers all ${unprocessed} unprocessed words of ${total}`, () => {
      const { windows, consumedWordCount } = buildUnprocessedWindows(
        transcriptOf(total),
        unprocessed,
      );
      const covered = coveredWords(windows);

      for (let i = total - unprocessed; i < total; i++) {
        expect(covered.has(`w${i}`)).toBe(true);
      }
      expect(consumedWordCount).toBe(unprocessed);
    });
  }

  it('demonstrates the old fixed-tail behaviour lost content', () => {
    const total = 1000;
    const unprocessed = 225;
    const words = transcriptOf(total).split(' ');

    // What the previous implementation sent: always the last 150 words.
    const oldTail = new Set(words.slice(-150));
    const firstUnprocessed = `w${total - unprocessed}`;
    expect(oldTail.has(firstUnprocessed)).toBe(false);

    // What we send now.
    const { windows } = buildUnprocessedWindows(transcriptOf(total), unprocessed);
    expect(coveredWords(windows).has(firstUnprocessed)).toBe(true);
  });
});

describe('buildUnprocessedWindows — chunking', () => {
  it('splits a large backlog into overlapping windows', () => {
    const { windows } = buildUnprocessedWindows(transcriptOf(1000), 400);
    expect(windows.length).toBeGreaterThan(1);

    for (const window of windows) {
      expect(window.split(' ').length).toBeLessThanOrEqual(CHUNK_SIZE_WORDS);
    }

    // Consecutive windows must share words, or a note could straddle the seam.
    for (let i = 1; i < windows.length; i++) {
      const prev = new Set(windows[i - 1].split(' '));
      const shared = windows[i].split(' ').filter((w) => prev.has(w));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it('honours maxWindows and reports only what those windows consumed', () => {
    const full = buildUnprocessedWindows(transcriptOf(1000), 400);
    const capped = buildUnprocessedWindows(transcriptOf(1000), 400, 2);

    expect(capped.windows).toHaveLength(2);
    expect(capped.windows).toEqual(full.windows.slice(0, 2));

    // Partial credit — the remainder stays on the caller's counter rather than
    // being silently dropped, which is what makes the cap safe.
    expect(capped.consumedWordCount).toBeGreaterThan(0);
    expect(capped.consumedWordCount).toBeLessThan(400);
  });

  it('treats a maxWindows below one as nothing to do', () => {
    expect(buildUnprocessedWindows(transcriptOf(1000), 400, 0).windows).toEqual([]);
  });

  it('does not chunk at the single-window boundary', () => {
    expect(
      buildUnprocessedWindows(transcriptOf(1000), SINGLE_WINDOW_MAX_WORDS).windows,
    ).toHaveLength(1);
    expect(
      buildUnprocessedWindows(transcriptOf(1000), SINGLE_WINDOW_MAX_WORDS + 1).windows.length,
    ).toBeGreaterThan(1);
  });
});
