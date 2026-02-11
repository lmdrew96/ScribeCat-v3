/**
 * Citation parser for AI-generated notes
 * Extracts [cite:XXXXX] references and maps them to transcript segments.
 */

interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface Citation {
  noteText: string;
  timestamp: number;
  segmentText: string;
}

/**
 * Find the closest matching segment for a given timestamp.
 * Returns the segment with the nearest timestamp that doesn't exceed
 * the cited timestamp by more than the duration to the next segment.
 */
function findClosestSegment(
  timestamp: number,
  segments: TranscriptSegment[],
): TranscriptSegment | undefined {
  if (segments.length === 0) return undefined;

  let closest = segments[0];
  let minDistance = Math.abs(segments[0].timestamp - timestamp);

  for (const segment of segments) {
    const distance = Math.abs(segment.timestamp - timestamp);
    if (distance < minDistance) {
      minDistance = distance;
      closest = segment;
    }
  }

  return closest;
}

/**
 * Parse [cite:XXXXX] patterns from AI-generated markdown notes.
 * Returns an array of citations with matched transcript segments.
 */
export function parseCitations(markdownNotes: string, segments?: TranscriptSegment[]): Citation[] {
  const citePattern = /\[cite:(\d+)\]/g;
  const citations: Citation[] = [];
  const finalSegments = segments?.filter((s) => s.isFinal) ?? [];

  for (const line of markdownNotes.split('\n')) {
    let match = citePattern.exec(line);
    while (match !== null) {
      const timestamp = Number.parseInt(match[1], 10);
      const noteText = line
        .replace(/\[cite:\d+\]/g, '')
        .replace(/^[-*#>\s]+/, '')
        .replace(/\*\*/g, '')
        .trim();

      const segment = findClosestSegment(timestamp, finalSegments);

      citations.push({
        noteText,
        timestamp,
        segmentText: segment?.text || '',
      });

      match = citePattern.exec(line);
    }
  }

  return citations;
}

/**
 * Strip all [cite:XXXXX] markers from markdown text.
 * Used when rendering notes without citation support.
 */
export function stripCitations(markdown: string): string {
  return markdown.replace(/\s*\[cite:\d+\]/g, '');
}
