import type { Recording } from '@/components/study-view';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRecordingTime } from '@/lib/format-time';
import { Cat, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type SavedNuggetNote = NonNullable<Recording['nuggetNotes']>[number];
type Segment = NonNullable<Recording['transcriptSegments']>[number];

interface StudyNuggetNotesProps {
  notes: Recording['nuggetNotes'];
  segments: Recording['transcriptSegments'];
  /** Seeks the session audio, in seconds. */
  onSeek: (seconds: number) => void;
}

/** The raw transcript a note was generated from, or null if it can't be shown. */
const sourceTextFor = (note: SavedNuggetNote, segments: Segment[]): string | null => {
  const { sourceStartMs, sourceEndMs } = note;
  if (sourceStartMs === undefined || sourceEndMs === undefined) return null;
  const text = segments
    .filter((s) => s.isFinal && s.timestamp >= sourceStartMs && s.timestamp <= sourceEndMs)
    .map((s) => s.text.trim())
    .join(' ');
  return text || null;
};

/**
 * Nugget's notes for a saved session. Notes that carry a source span expand to
 * show the transcript they were written from, so a student can check a claim
 * without scrubbing audio. Older notes have no span and stay plain.
 */
export function StudyNuggetNotes({ notes, segments, onSeek }: StudyNuggetNotesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const finalSegments = segments ?? [];

  if (!notes || notes.length === 0) {
    return (
      <ScrollArea className="h-full rounded-xl glass p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Cat className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No Nugget notes for this session</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Nugget generates notes automatically during recording
          </p>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full rounded-xl glass p-4">
      <div className="flex flex-col gap-2">
        {notes.map((note, index) => {
          const source = sourceTextFor(note, finalSegments);
          const isExpanded = source !== null && expandedIndex === index;

          return (
            <div
              key={`${note.recordingTime}-${index}`}
              className="flex flex-col gap-2 rounded-lg glass-light px-3 py-2.5"
            >
              <div className="flex items-start gap-3">
                {source ? (
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                    title={isExpanded ? 'Hide the source' : 'Show where this came from'}
                    className="flex flex-1 min-w-0 items-start gap-1.5 text-left group"
                  >
                    {isExpanded ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                    )}
                    <span className="text-sm text-foreground leading-snug">{note.text}</span>
                  </button>
                ) : (
                  <p className="flex-1 min-w-0 text-sm text-foreground leading-snug">{note.text}</p>
                )}
                <button
                  type="button"
                  onClick={() => onSeek(note.recordingTime)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                  @ {formatRecordingTime(note.recordingTime)}
                </button>
              </div>

              {isExpanded && note.sourceStartMs !== undefined && (
                <div className="ml-5 border-l-2 border-primary/40 pl-3">
                  <button
                    type="button"
                    onClick={() => onSeek((note.sourceStartMs ?? 0) / 1000)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                    title="Play the recording from here"
                  >
                    From the transcript ({formatRecordingTime(note.sourceStartMs / 1000)}
                    {'–'}
                    {formatRecordingTime((note.sourceEndMs ?? note.sourceStartMs) / 1000)})
                  </button>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                    {'“'}
                    {source}
                    {'”'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
