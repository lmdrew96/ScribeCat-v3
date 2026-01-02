import { ScrollArea } from '@/components/ui/scroll-area';
import type { TranscriptSegment } from '@/hooks/use-transcription';
import { useEffect, useRef } from 'react';

interface LiveTranscriptProps {
  isRecording: boolean;
  segments: TranscriptSegment[];
}

export function LiveTranscript({ isRecording, segments }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  if (!isRecording && segments.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-lg bg-[var(--transcript-bg)] p-2">
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Live Transcript</h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">Hit record to start transcribing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg bg-[var(--transcript-bg)] p-2">
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">
        Live Transcript
        {isRecording && (
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500">Recording</span>
          </span>
        )}
        {!isRecording && segments.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">— Recording stopped</span>
        )}
      </h3>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-2 pr-2">
          {segments.map((segment, index) => (
            <div
              key={`${segment.timestamp}-${segment.text.substring(0, 20)}`}
              className={`text-xs leading-relaxed ${
                segment.isFinal ? 'text-foreground' : 'text-muted-foreground italic'
              }`}
            >
              {segment.text}
              {!segment.isFinal && index === segments.length - 1 && (
                <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
