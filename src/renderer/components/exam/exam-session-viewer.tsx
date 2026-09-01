import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useExamRoomSessionContent } from '@/hooks/use-exam-room';
import { useSessionAudioUrl } from '@/hooks/use-session-audio-url';
import { formatRecordingTime } from '@/lib/format-time';
import { renderMarkdown } from '@/lib/render-markdown';
import { BookOpen, Clock, FileText, Loader2, Mic, Pause, Play, User } from 'lucide-react';
import { useEffect } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamSessionViewerProps {
  examRoomId: Id<'examRooms'>;
  sessionId: Id<'sessions'> | null;
  open: boolean;
  onClose: () => void;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExamSessionViewer({
  examRoomId,
  sessionId,
  open,
  onClose,
}: ExamSessionViewerProps) {
  const { content, isLoading } = useExamRoomSessionContent(
    open ? examRoomId : null,
    open ? sessionId : null,
  );

  const audioUrl = useSessionAudioUrl(
    content
      ? {
          audioStorageId: content.audioStorageId ?? undefined,
          audioStorageIds: content.audioStorageIds ?? undefined,
        }
      : null,
  );

  const { isPlaying, currentTime, duration, load, togglePlay, seek } = useAudioPlayer();

  // Load audio when URL becomes available
  useEffect(() => {
    if (audioUrl) {
      void load(audioUrl);
    }
  }, [audioUrl, load]);

  const hasNotes = !!(content?.notesPlainText || content?.notes);
  const hasTranscript = !!content?.transcript;
  const hasAudio = !!(
    content?.audioStorageId ||
    (content?.audioStorageIds && content.audioStorageIds.length > 0)
  );
  const hasNuggetNotes = !!(content?.nuggetNotes && content.nuggetNotes.length > 0);
  const hasDocumentText = !!content?.documentText;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          {isLoading ? (
            <>
              <DialogTitle>Loading session...</DialogTitle>
              <DialogDescription>Fetching session content</DialogDescription>
            </>
          ) : content ? (
            <>
              <DialogTitle className="truncate">{content.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-3 flex-wrap">
                {content.course && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {content.course}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(content.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />@{content.owner.username}
                </span>
                {content.lectureType && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                    {content.lectureType}
                  </span>
                )}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Session not found</DialogTitle>
              <DialogDescription>
                This session may have been removed from the exam room.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && content && (
          <Tabs
            defaultValue={
              hasNotes
                ? 'notes'
                : hasDocumentText
                  ? 'document'
                  : hasTranscript
                    ? 'transcript'
                    : 'audio'
            }
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="shrink-0 w-full justify-start">
              {hasNotes && (
                <TabsTrigger value="notes" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Notes
                </TabsTrigger>
              )}
              {hasDocumentText && (
                <TabsTrigger value="document" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Document
                </TabsTrigger>
              )}
              {hasTranscript && (
                <TabsTrigger value="transcript" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Transcript
                </TabsTrigger>
              )}
              {hasAudio && (
                <TabsTrigger value="audio" className="gap-1.5">
                  <Mic className="h-3.5 w-3.5" />
                  Audio
                </TabsTrigger>
              )}
              {hasNuggetNotes && (
                <TabsTrigger value="nugget" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Live Notes
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 min-h-0 mt-2">
              {hasNotes && (
                <TabsContent value="notes" className="h-full m-0">
                  <ScrollArea className="h-[50vh]">
                    <div className="pr-4 text-sm text-foreground space-y-1">
                      {content.notesPlainText ? (
                        renderMarkdown(content.notesPlainText)
                      ) : (
                        <p className="text-muted-foreground italic">
                          Notes available in rich text format only.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {hasDocumentText && (
                <TabsContent value="document" className="h-full m-0">
                  <ScrollArea className="h-[50vh]">
                    <div className="pr-4 text-sm text-foreground space-y-1">
                      {renderMarkdown(content.documentText!)}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {hasTranscript && (
                <TabsContent value="transcript" className="h-full m-0">
                  <ScrollArea className="h-[50vh]">
                    <div className="pr-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {content.transcript}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {hasAudio && (
                <TabsContent value="audio" className="h-full m-0">
                  <div className="space-y-4 p-4">
                    {audioUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-16 w-16 rounded-full"
                          onClick={() => void togglePlay()}
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6 ml-0.5" />
                          )}
                        </Button>
                        <div className="w-full max-w-md space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={duration || 1}
                            value={currentTime}
                            onChange={(e) => seek(Number(e.target.value))}
                            className="w-full accent-[var(--accent)]"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatRecordingTime(currentTime)}</span>
                            <span>{formatRecordingTime(duration)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading audio...</span>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {hasNuggetNotes && (
                <TabsContent value="nugget" className="h-full m-0">
                  <ScrollArea className="h-[50vh]">
                    <div className="pr-4 space-y-2">
                      {content.nuggetNotes?.map((note, idx) => (
                        <div
                          key={`nugget-${note.recordingTime}-${idx}`}
                          className="rounded-lg p-3 glass-light border border-[var(--glass-border)]"
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatRecordingTime(note.recordingTime)}
                          </div>
                          <div className="text-sm text-foreground">{renderMarkdown(note.text)}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </div>

            {/* Empty state when no content at all */}
            {!hasNotes && !hasDocumentText && !hasTranscript && !hasAudio && !hasNuggetNotes && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-3">
                  This session has no viewable content yet.
                </p>
              </div>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
