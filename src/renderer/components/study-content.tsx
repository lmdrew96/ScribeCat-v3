import { AudioWaveform } from '@/components/audio-waveform';
import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { FileText, Mic, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StudyContentProps {
  recording: Recording;
}

export function StudyContent({ recording }: StudyContentProps) {
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);

  const { isPlaying, currentTime, duration, audioLevel, load, togglePlay, seek } = useAudioPlayer({
    onTimeUpdate: (time) => {
      // Find the segment that corresponds to current playback time
      if (recording.transcriptSegments) {
        const index = recording.transcriptSegments.findIndex((seg, i) => {
          const nextSeg = recording.transcriptSegments?.[i + 1];
          return time * 1000 >= seg.timestamp && (!nextSeg || time * 1000 < nextSeg.timestamp);
        });
        setHighlightedSegmentIndex(index >= 0 ? index : null);
      }
    },
  });

  // Load audio when recording changes
  useEffect(() => {
    if (recording.audioFilePath) {
      const filename = recording.audioFilePath.split('/').pop() || '';
      load(filename);
    }
  }, [recording.audioFilePath, load]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleSegmentClick = (timestamp: number) => {
    seek(timestamp / 1000); // Convert ms to seconds
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h1 className="text-base font-semibold text-foreground">{recording.title}</h1>
        <p className="text-xs text-muted-foreground">
          {recording.date} • {recording.duration}
        </p>
      </div>

      {/* Audio playback controls */}
      {recording.audioFilePath && (
        <div className="mb-3 rounded-lg bg-card p-2 space-y-2">
          <AudioWaveform isActive={isPlaying} audioLevel={audioLevel} />

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(currentTime)}
            </span>

            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />

            <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="transcript" className="flex-1 min-h-0">
        <TabsList className="mb-2 bg-secondary/50 h-7">
          <TabsTrigger value="transcript" className="gap-1 text-xs h-6 px-2">
            <Mic className="h-3 w-3" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs h-6 px-2">
            <FileText className="h-3 w-3" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-lg bg-card p-3">
            {recording.transcriptSegments && recording.transcriptSegments.length > 0 ? (
              <div className="space-y-2">
                {recording.transcriptSegments
                  .filter((seg) => seg.isFinal)
                  .map((segment) => (
                    <button
                      type="button"
                      key={segment.timestamp}
                      onClick={() => handleSegmentClick(segment.timestamp)}
                      className={`whitespace-pre-wrap leading-relaxed text-xs cursor-pointer rounded px-2 py-1 transition-colors text-left w-full ${
                        highlightedSegmentIndex ===
                        recording.transcriptSegments.filter((s) => s.isFinal).indexOf(segment)
                          ? 'bg-primary/20 text-foreground'
                          : 'text-foreground/90 hover:bg-secondary/50'
                      }`}
                    >
                      {segment.text}
                    </button>
                  ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed text-xs text-foreground/90">
                {recording.transcript || 'No transcript available'}
              </p>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-lg bg-card p-3">
            <p className="whitespace-pre-wrap leading-relaxed text-xs text-foreground/90">
              {recording.notes || 'No notes yet'}
            </p>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
