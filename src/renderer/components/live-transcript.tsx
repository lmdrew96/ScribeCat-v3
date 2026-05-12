import type { TranscriptSegment } from '@/hooks/use-transcription';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useRecordingContext } from '@/contexts/recording-context';

interface LiveTranscriptProps {
  isRecording: boolean;
  segments: TranscriptSegment[];
  isScrubbing?: boolean;
  lastScrubAt?: number | null;
  /** Cleaned transcript prefix (everything up to scrubBoundaryAt). Empty until first scrub. */
  scrubbedText?: string;
  /** Date.now() at scrub start. Segments with timestamp > this are NOT in scrubbedText
   *  and must render as the live raw tail so the user keeps seeing real-time STT output. */
  scrubBoundaryAt?: number;
}

const SCROLL_THRESHOLD = 80; // px from bottom to count as "near bottom"

export function LiveTranscript({
  isRecording,
  segments,
  isScrubbing,
  lastScrubAt,
  scrubbedText,
  scrubBoundaryAt,
}: LiveTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track whether user is near the bottom
  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Auto-scroll only when user is near the bottom — also re-run on scrub completion
  // since the scrubbed prefix replaces a chunk of visible text and can shift layout.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll when segments or scrubbedText changes
  useEffect(() => {
    if (isNearBottomRef.current && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [segments, scrubbedText]);

  // Tail = segments that arrived AFTER the most recent scrub boundary. These haven't
  // been folded into scrubbedText yet, so they render as raw STT (with the cursor on
  // the in-flight non-final segment). Falls back to all segments when no scrub yet.
  const tailSegments = useMemo(() => {
    if (!scrubbedText || !scrubBoundaryAt) return segments;
    return segments.filter((s) => s.timestamp > scrubBoundaryAt);
  }, [segments, scrubbedText, scrubBoundaryAt]);

  // Flagged words local optimistic set to show immediate feedback
  const [flaggedKeys] = useState(() => new Set<string>());
  const { currentSessionId } = useRecordingContext();
  const appendFlaggedWord = useMutation(api.sessions.appendFlaggedWord);

  const handleFlagWord = useCallback(
    async (segment: TranscriptSegment, word: string, wordIndex: number) => {
      const key = `${segment.timestamp}-${wordIndex}-${word}`;
      if (flaggedKeys.has(key)) return;
      flaggedKeys.add(key);
      if (!currentSessionId) return;
      try {
        await appendFlaggedWord({
          id: currentSessionId,
          text: word,
          timestamp: segment.timestamp,
          segmentIndex: wordIndex,
        });
      } catch (err) {
        console.warn('Failed to flag word:', err);
      }
    },
    [appendFlaggedWord, currentSessionId, flaggedKeys],
  );

  if (!isRecording && segments.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl glass p-3">
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Live Transcript</h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">Hit record to start transcribing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl glass p-3">
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">
        Live Transcript
        {isRecording && (
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500">Recording</span>
          </span>
        )}
        {isRecording && isScrubbing && (
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-400">Cleaning...</span>
          </span>
        )}
        {isRecording && !isScrubbing && lastScrubAt && (
          <span className="ml-2 text-xs text-green-400">✓ Cleaned</span>
        )}
        {!isRecording && segments.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">— Recording stopped</span>
        )}
      </h3>
      <div className="flex-1 min-h-0">
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto pr-2 space-y-2"
        >
          {scrubbedText && (
            <div className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {scrubbedText}
            </div>
          )}
          {tailSegments.map((segment, index) => (
            <div
              key={`${segment.timestamp}-${segment.text.substring(0, 20)}`}
              className={`text-xs leading-relaxed ${
                segment.isFinal ? 'text-foreground' : 'text-muted-foreground italic'
              }`}
            >
              {/* Render words as clickable spans during recording so users can flag misheard words */}
              <span className="break-words">
                {segment.text.split(/(\s+)/).map((token, wi) => {
                  // Preserve whitespace tokens
                  if (/^\s+$/.test(token)) return token;
                  const key = `${segment.timestamp}-${wi}-${token}`;
                  const isFlagged = flaggedKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => isRecording && handleFlagWord(segment, token, wi)}
                      className={`inline-block text-left mr-1 mb-0.5 rounded px-0.5 ${
                        isFlagged ? 'bg-amber-100 text-amber-800' : 'hover:bg-amber-50'
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </span>
              {!segment.isFinal && index === tailSegments.length - 1 && (
                <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
