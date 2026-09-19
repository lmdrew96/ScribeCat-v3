/**
 * Transcript windowing for Nugget's Notes.
 *
 * Note generation is time-gated (fire at most every `noteIntervalMs`) but the
 * payload has to be size-gated by how much was actually said since the last
 * generation. Sending a fixed-size tail silently drops whatever overflowed it —
 * at ~140 wpm a 90-second cycle produces ~210 words, so a 150-word tail loses
 * around a quarter of the lecture.
 *
 * These helpers size the window from the unprocessed word count instead, and
 * split it into overlapping chunks when a backlog builds up (a throttled tab or
 * a slow network can stretch a cycle well past its interval).
 */

/** Already-processed words prepended to a window so notes don't start mid-thought. */
export const WINDOW_OVERLAP_WORDS = 20;

/** A backlog at or below this size goes out as one window. */
export const SINGLE_WINDOW_MAX_WORDS = 120;

/** Size of each window once the backlog has to be split. */
export const CHUNK_SIZE_WORDS = 100;

/** How far each window advances. Smaller than the chunk size, so windows overlap. */
export const CHUNK_STEP_WORDS = 80;

/**
 * Where a window sits, counted in words from the END of the transcript. The
 * buffer is trimmed from the front as it grows, so front-relative positions
 * shift between calls; tail-relative ones stay valid.
 */
export interface TailRange {
  /** Words from the window's first word through the end of the transcript. */
  fromEnd: number;
  /** Words after the window's last word. 0 when the window runs to the end. */
  toEnd: number;
}

export interface UnprocessedWindows {
  /** Transcript slices to generate from, oldest first. Each carries overlap context. */
  windows: string[];
  /** Parallel to `windows`: each one's position, for anchoring notes to the transcript. */
  tailRanges: TailRange[];
  /**
   * How many of the unprocessed words these windows cover. Callers decrement
   * their unprocessed counter by this rather than zeroing it, so anything left
   * beyond a `maxWindows` cap is picked up on the next cycle instead of lost.
   */
  consumedWordCount: number;
}

const EMPTY: UnprocessedWindows = { windows: [], tailRanges: [], consumedWordCount: 0 };

/**
 * Builds the transcript windows covering the unprocessed tail of `transcript`.
 *
 * @param transcript The full buffered transcript.
 * @param unprocessedWordCount Words spoken since the last successful generation.
 * @param maxWindows Cap on windows returned — bounds the API calls one cycle can
 *   make when a large backlog has accumulated. Uncapped by default (the final
 *   flush at stop wants everything).
 */
export function buildUnprocessedWindows(
  transcript: string,
  unprocessedWordCount: number,
  maxWindows: number = Number.POSITIVE_INFINITY,
): UnprocessedWindows {
  if (unprocessedWordCount <= 0 || maxWindows < 1) return EMPTY;

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) return EMPTY;

  // The counter can outrun the buffer — the buffer is capped at MAX_BUFFER_SIZE
  // and older text is dropped off the front. Never claim more than we hold.
  const unprocessed = Math.min(unprocessedWordCount, totalWords);
  const unprocessedStart = totalWords - unprocessed;
  const contextStart = Math.max(0, unprocessedStart - WINDOW_OVERLAP_WORDS);

  if (unprocessed <= SINGLE_WINDOW_MAX_WORDS) {
    const window = words.slice(contextStart).join(' ');
    return window
      ? {
          windows: [window],
          tailRanges: [{ fromEnd: totalWords - contextStart, toEnd: 0 }],
          consumedWordCount: unprocessed,
        }
      : EMPTY;
  }

  const windows: string[] = [];
  const tailRanges: TailRange[] = [];
  let pos = contextStart;
  // Exclusive index of the furthest word any returned window reaches.
  let coveredTo = unprocessedStart;

  while (pos < totalWords && windows.length < maxWindows) {
    const end = Math.min(pos + CHUNK_SIZE_WORDS, totalWords);
    const window = words.slice(pos, end).join(' ');
    if (window) {
      windows.push(window);
      tailRanges.push({ fromEnd: totalWords - pos, toEnd: totalWords - end });
      coveredTo = Math.max(coveredTo, end);
    }
    if (end >= totalWords) break;
    pos += CHUNK_STEP_WORDS;
  }

  return {
    windows,
    tailRanges,
    consumedWordCount: Math.max(0, coveredTo - unprocessedStart),
  };
}

export interface SourceSpan {
  /** Timestamp of the first transcript segment the window drew on (ms since recording start). */
  startMs: number;
  /** Timestamp of the last such segment — segments in [startMs, endMs] are the source. */
  endMs: number;
}

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Maps a window's tail range onto the segments its words came from.
 *
 * Assumes the transcript the window was cut from ends with these segments'
 * text — true for the live path (a plain join of final segments) and for the
 * unprocessed tail at stop, where only the scrubbed prefix differs. If the
 * range reaches past the segments, it clamps to the earliest one.
 */
export function spanForTailRange(
  segments: ReadonlyArray<{ text: string; timestamp: number }>,
  range: TailRange,
): SourceSpan | null {
  if (segments.length === 0 || range.fromEnd <= range.toEnd) return null;

  // 0-based word indices counted back from the last word (0 = final word).
  const firstWordFromEnd = range.fromEnd - 1;
  const lastWordFromEnd = range.toEnd;

  let wordsAfter = 0; // words in segments later than the one being examined
  let startMs: number | null = null;
  let endMs: number | null = null;

  for (let i = segments.length - 1; i >= 0; i--) {
    const segmentWords = countWords(segments[i].text);
    const lastIndexInSegment = wordsAfter + segmentWords - 1;
    if (endMs === null && segmentWords > 0 && lastWordFromEnd <= lastIndexInSegment) {
      endMs = segments[i].timestamp;
    }
    if (segmentWords > 0 && firstWordFromEnd <= lastIndexInSegment) {
      startMs = segments[i].timestamp;
      break;
    }
    wordsAfter += segmentWords;
  }

  const earliest = segments[0].timestamp;
  return { startMs: startMs ?? earliest, endMs: endMs ?? earliest };
}
