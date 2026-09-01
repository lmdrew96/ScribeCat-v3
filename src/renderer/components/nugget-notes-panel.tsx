/**
 * NuggetNotesPanel - Displays AI-generated notes during recording
 * Shows clickable note bubbles with [+] button to insert into TipTap editor
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NuggetNote } from '@/hooks/use-nugget-notes';
import { formatRecordingTime } from '@/lib/format-time';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Cat,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NuggetNotesPanelProps {
  notes: NuggetNote[];
  isRecording: boolean;
  isProcessing: boolean;
  isEnabled: boolean;
  /** Non-null when the last generation failed — shown instead of "Listening…". */
  noteError?: string | null;
  onInsertNote: (noteText: string) => void;
  onDismissNote?: (noteId: string) => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

export function NuggetNotesPanel({
  notes,
  isRecording,
  isProcessing,
  isEnabled,
  noteError,
  onInsertNote,
  onDismissNote,
  // onToggleEnabled - reserved for future settings integration
}: NuggetNotesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // A failed generation must not keep claiming Nugget is listening — a student
  // who believes notes are being captured stops taking their own.
  const isDegraded = isRecording && isEnabled && !isProcessing && !!noteError;
  const isListening = isRecording && isEnabled && !isProcessing && !noteError;

  return (
    <div className="flex flex-col rounded-xl glass overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--glass-bg-light)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cat className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Nugget&apos;s Notes</span>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
          {isProcessing && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Finishing up...</span>
            </span>
          )}
          {isListening && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Listening...</span>
            </span>
          )}
          {isDegraded && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              <span>Not updating</span>
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="border-t border-[var(--glass-border)]">
          {notes.length === 0 ? (
            <EmptyState isRecording={isRecording} isEnabled={isEnabled} isDegraded={isDegraded} />
          ) : (
            <ScrollArea className="h-32">
              <div className="flex flex-col gap-1.5 p-2">
                {notes.map((note) => (
                  <NoteBubble
                    key={note.id}
                    note={note}
                    onInsert={() => onInsertNote(note.text)}
                    onDismiss={onDismissNote ? () => onDismissNote(note.id) : undefined}
                  />
                ))}
                {isProcessing && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing remaining transcript...</span>
                  </div>
                )}
                {isListening && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Notes in progress...</span>
                  </div>
                )}
                {isDegraded && <DegradedNotice />}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

/** Shown in place of the "listening" spinner once generation has failed. */
function DegradedNotice() {
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 text-xs text-amber-500">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="leading-snug">
        Nugget can&apos;t reach its notes service right now. Your recording and transcript are still
        saving.
      </span>
    </div>
  );
}

// Empty state component
function EmptyState({
  isRecording,
  isEnabled,
  isDegraded,
}: { isRecording: boolean; isEnabled: boolean; isDegraded: boolean }) {
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <Cat className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nugget&apos;s Notes is disabled</p>
        <p className="text-xs text-muted-foreground/70">
          Enable in settings to auto-generate notes
        </p>
      </div>
    );
  }

  if (isDegraded) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-sm text-foreground">Nugget isn&apos;t generating notes</p>
        <p className="text-xs text-muted-foreground">
          Your recording and transcript are still saving normally.
        </p>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <div className="relative">
          <Cat className="h-8 w-8 text-primary mb-2" />
          <Loader2 className="h-4 w-4 text-primary animate-spin absolute -right-1 -bottom-1" />
        </div>
        <p className="text-sm text-foreground">Listening...</p>
        <p className="text-xs text-muted-foreground">Nugget will generate notes as you record</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">No notes yet</p>
      <p className="text-xs text-muted-foreground/70">Start recording to generate AI notes</p>
    </div>
  );
}

// Individual note bubble component
function NoteBubble({
  note,
  onInsert,
  onDismiss,
}: {
  note: NuggetNote;
  onInsert: () => void;
  onDismiss?: () => void;
}) {
  // Reveal-on-hover hides these entirely on touch, where there is no hover —
  // so they stay visible below the sm breakpoint.
  const actionVisibility = 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100';

  return (
    <div className="group flex items-start gap-3 rounded-lg glass-light hover:bg-[var(--glass-bg)] px-3 py-2.5 transition-all">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{note.text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          @ {formatRecordingTime(note.recordingTime)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 transition-opacity hover:bg-primary/10 hover:text-primary',
            actionVisibility,
          )}
          onClick={(e) => {
            e.stopPropagation();
            onInsert();
          }}
          title="Insert note into editor"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="sr-only">Insert note into editor</span>
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 transition-opacity hover:bg-destructive/10 hover:text-destructive',
              actionVisibility,
            )}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            title="Dismiss this note"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Dismiss this note</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default NuggetNotesPanel;
