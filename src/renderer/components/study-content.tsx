import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { CitationMark } from '@/lib/citation-mark';
import { DraggableImage } from '@/lib/draggable-image-extension';
import { ExcalidrawNode } from '@/lib/excalidraw-extension';
import { FontSize } from '@/lib/font-size-extension';
import { TextBox } from '@/lib/textbox-extension';
import CodeBlock from '@tiptap/extension-code-block';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
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
import { useMutation } from 'convex/react';
import { BookOpen, Cat, Check, FileText, Mic, Pause, Pencil, Play, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface StudyContentProps {
  recording: Recording;
  sidebarCollapsed?: boolean;
}

export function StudyContent({ recording, sidebarCollapsed }: StudyContentProps) {
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseDraft, setCourseDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const courseInputRef = useRef<HTMLInputElement>(null);

  const updateSession = useMutation(api.sessions.update);

  const startEditTitle = () => {
    setTitleDraft(recording.title);
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== recording.title) {
      await updateSession({ id: recording.id as Id<'sessions'>, title: trimmed });
    }
    setEditingTitle(false);
  };

  const cancelTitle = () => {
    setEditingTitle(false);
    setTitleDraft('');
  };

  const startEditCourse = () => {
    setCourseDraft(recording.course ?? '');
    setEditingCourse(true);
  };

  const saveCourse = async () => {
    const trimmed = courseDraft.trim();
    if (trimmed !== (recording.course ?? '')) {
      await updateSession({ id: recording.id as Id<'sessions'>, course: trimmed || undefined });
    }
    setEditingCourse(false);
  };

  const cancelCourse = () => {
    setEditingCourse(false);
    setCourseDraft('');
  };

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingCourse) courseInputRef.current?.focus();
  }, [editingCourse]);

  const { isPlaying, currentTime, duration, load, togglePlay, seek } = useAudioPlayer({
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
      Color,
      TextStyle,
      FontFamily,
      FontSize,
      DraggableImage,
      TextBox,
      ExcalidrawNode,
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
    if (recording.audioUrl) {
      load(recording.audioUrl);
    }
  }, [recording.audioUrl, load]);

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
      <div className={`mb-2 ${sidebarCollapsed ? 'pl-8' : ''}`}>
        {/* Editable title */}
        {editingTitle ? (
          <div className="flex items-center gap-1 mb-0.5">
            <Input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') cancelTitle();
              }}
              onBlur={saveTitle}
              className="h-7 text-sm font-semibold px-2 py-0"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                saveTitle();
              }}
            >
              <Check className="h-3.5 w-3.5 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                cancelTitle();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditTitle}
            className="group flex items-center gap-1.5 text-left"
          >
            <h1 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
              {recording.title}
            </h1>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}

        {/* Metadata row */}
        <p className="text-xs text-muted-foreground">
          {recording.date} • {recording.duration}
          {recording.lectureType && recording.lectureType !== 'general' && (
            <span className="ml-2 capitalize">• {recording.lectureType}</span>
          )}
        </p>

        {/* Editable course */}
        {editingCourse ? (
          <div className="flex items-center gap-1 mt-1">
            <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              ref={courseInputRef}
              value={courseDraft}
              onChange={(e) => setCourseDraft(e.target.value)}
              placeholder="Course name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCourse();
                if (e.key === 'Escape') cancelCourse();
              }}
              onBlur={saveCourse}
              className="h-6 text-xs px-2 py-0 w-44"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                saveCourse();
              }}
            >
              <Check className="h-3 w-3 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                cancelCourse();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : recording.course ? (
          <button
            type="button"
            onClick={startEditCourse}
            className="group flex items-center gap-1 mt-1"
          >
            <BookOpen className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {recording.course}
            </span>
            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startEditCourse}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <BookOpen className="h-3 w-3" />
            <span>Add course</span>
          </button>
        )}
      </div>

      {/* Audio playback controls */}
      {recording.audioUrl && (
        <div className="mb-4 rounded-xl glass p-3">
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
        <TabsList className="mb-3 h-8">
          <TabsTrigger value="transcript" className="gap-1.5 text-xs h-7 px-3">
            <Mic className="h-3 w-3" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs h-7 px-3">
            <FileText className="h-3 w-3" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="nugget-notes" className="gap-1.5 text-xs h-7 px-3">
            <Cat className="h-3 w-3" />
            Nugget Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-xl glass p-4">
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
                        recording.transcriptSegments?.filter((s) => s.isFinal).indexOf(segment)
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
          <ScrollArea className="h-full rounded-xl glass p-4">
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

        <TabsContent value="nugget-notes" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-xl glass p-4">
            {recording.nuggetNotes && recording.nuggetNotes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recording.nuggetNotes.map((note, index) => (
                  <div
                    key={`${note.recordingTime}-${index}`}
                    className="flex items-start gap-3 rounded-lg glass-light px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{note.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => seek(note.recordingTime)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
                    >
                      @ {formatTime(note.recordingTime)}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Cat className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No Nugget notes for this session</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Nugget generates notes automatically during recording
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
