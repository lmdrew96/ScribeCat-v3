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

export interface UnprocessedWindows {
  /** Transcript slices to generate from, oldest first. Each carries overlap context. */
  windows: string[];
  /**
   * How many of the unprocessed words these windows cover. Callers decrement
   * their unprocessed counter by this rather than zeroing it, so anything left
   * beyond a `maxWindows` cap is picked up on the next cycle instead of lost.
   */
  consumedWordCount: number;
}

const EMPTY: UnprocessedWindows = { windows: [], consumedWordCount: 0 };

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
    return window ? { windows: [window], consumedWordCount: unprocessed } : EMPTY;
  }

  const windows: string[] = [];
  let pos = contextStart;
  // Exclusive index of the furthest word any returned window reaches.
  let coveredTo = unprocessedStart;

  while (pos < totalWords && windows.length < maxWindows) {
    const end = Math.min(pos + CHUNK_SIZE_WORDS, totalWords);
    const window = words.slice(pos, end).join(' ');
    if (window) {
      windows.push(window);
      coveredTo = Math.max(coveredTo, end);
    }
    if (end >= totalWords) break;
    pos += CHUNK_STEP_WORDS;
  }

  return { windows, consumedWordCount: Math.max(0, coveredTo - unprocessedStart) };
}
