import { AudioWaveform } from '@/components/audio-waveform';
import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { CitationMark } from '@/lib/citation-mark';
import CodeBlock from '@tiptap/extension-code-block';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FileText, Mic, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface StudyContentProps {
  recording: Recording;
}

export function StudyContent({ recording }: StudyContentProps) {
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);

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

  // Read-only TipTap editor for rendering notes with citations
  const readOnlyExtensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      CodeBlock,
      TextStyle,
      CitationMark,
    ],
    [],
  );

  const readOnlyEditor = useEditor({
    extensions: readOnlyExtensions,
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-foreground text-xs leading-relaxed',
      },
    },
  });

  // Load notes content into read-only editor
  useEffect(() => {
    if (readOnlyEditor && recording.notes) {
      try {
        const content = JSON.parse(recording.notes);
        readOnlyEditor.commands.setContent(content);
      } catch {
        // Fallback: render as plain text
        readOnlyEditor.commands.setContent(`<p>${recording.notes}</p>`);
      }
    }
  }, [readOnlyEditor, recording.notes]);

  // Handle citation clicks in the notes tab — seek audio to timestamp
  const handleNoteCitationClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const citationEl = target.closest('.citation-mark');
      if (citationEl) {
        const timestamp = Number.parseInt(citationEl.getAttribute('data-timestamp') || '0', 10);
        if (timestamp > 0) {
          seek(timestamp / 1000);
        }
      }
    },
    [seek],
  );

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
          {recording.lectureType && recording.lectureType !== 'general' && (
            <span className="ml-2 capitalize">• {recording.lectureType}</span>
          )}
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
            {recording.notes ? (
              <div
                ref={notesContainerRef}
                onClick={handleNoteCitationClick}
                onKeyDown={() => {}}
                role="presentation"
              >
                <EditorContent editor={readOnlyEditor} />
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed text-xs text-foreground/90">
                No notes yet
              </p>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
