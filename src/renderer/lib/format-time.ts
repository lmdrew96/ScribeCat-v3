/**
 * Shared clock formatting for audio positions and note timestamps.
 *
 * The unit here is SECONDS, and that matters: `NuggetNote.recordingTime` is
 * seconds (derived in use-nugget-notes.ts), but nothing in the type system says
 * so, and one call site had been dividing it by 1000 — rendering every note in
 * the exam session viewer as "0:00". A single formatter gives the unit one
 * documented home instead of three identical copies to disagree with.
 *
 * Note: the live recording timer in recording-panel.tsx pads minutes to two
 * digits ("05:07" rather than "5:07"). That is a deliberately different display
 * contract, so it keeps its own formatter.
 */

/** Formats a position in SECONDS as `m:ss`. Negative or non-finite input reads as `0:00`. */
export function formatRecordingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * The moment a Nugget note refers to, in SECONDS — the time it shows and seeks to.
 *
 * `recordingTime` is when the note was *generated*, at the end of its window,
 * so it lands after the words were said. Notes anchored to the transcript
 * (v5.30.0+) know where their source window starts; that runs a few seconds
 * early because the window includes lead-in context, and early beats late when
 * you're trying to hear where something came from. Older notes fall back.
 */
export function noteMomentSeconds(note: {
  recordingTime: number;
  sourceStartMs?: number;
}): number {
  return note.sourceStartMs === undefined ? note.recordingTime : note.sourceStartMs / 1000;
}
