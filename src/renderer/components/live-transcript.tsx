import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef, useState } from 'react';

interface LiveTranscriptProps {
  isRecording: boolean;
}

const sampleTranscript = [
  "So today we're going to discuss the fundamentals of machine learning...",
  "The key concept here is that we're training models on data...",
  "Let's look at supervised learning first, where we have labeled examples...",
  'Neural networks are inspired by the structure of the human brain...',
  'Each layer transforms the input data in increasingly abstract ways...',
];

export function LiveTranscript({ isRecording }: LiveTranscriptProps) {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    let lineIndex = 0;
    let charIndex = 0;

    const interval = setInterval(() => {
      if (lineIndex >= sampleTranscript.length) {
        lineIndex = 0;
        setTranscriptLines([]);
      }

      const line = sampleTranscript[lineIndex];
      if (charIndex < line.length) {
        setCurrentLine(line.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setTranscriptLines((prev) => [...prev, line]);
        setCurrentLine('');
        lineIndex++;
        charIndex = 0;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isRecording]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll when transcript updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptLines.length, currentLine.length]);

  if (!isRecording && transcriptLines.length === 0) {
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
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">Live Transcript</h3>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-1.5 pr-2">
          {transcriptLines.map((line, i) => (
            <p key={i} className="text-xs leading-relaxed text-foreground/90">
              {line}
            </p>
          ))}
          {currentLine && (
            <p className="text-xs leading-relaxed text-foreground/90">
              {currentLine}
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary" />
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
