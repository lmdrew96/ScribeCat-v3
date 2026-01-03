/**
 * NuggetNotesPanel - Displays AI-generated notes during recording
 * Shows clickable note bubbles with [+] button to insert into TipTap editor
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NuggetNote } from '@/hooks/use-nugget-notes';
import { Cat, ChevronDown, ChevronUp, FileText, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

interface NuggetNotesPanelProps {
  notes: NuggetNote[];
  isRecording: boolean;
  isEnabled: boolean;
  onInsertNote: (noteText: string) => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

export function NuggetNotesPanel({
  notes,
  isRecording,
  isEnabled,
  onInsertNote,
  // onToggleEnabled - reserved for future settings integration
}: NuggetNotesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Format recording time from seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col rounded-lg bg-card border border-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cat className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Nugget&apos;s Notes</span>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
          {isRecording && isEnabled && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Listening...</span>
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
        <div className="border-t border-border">
          {notes.length === 0 ? (
            <EmptyState isRecording={isRecording} isEnabled={isEnabled} />
          ) : (
            <ScrollArea className="h-32">
              <div className="flex flex-col gap-1.5 p-2">
                {notes.map((note) => (
                  <NoteBubble
                    key={note.id}
                    note={note}
                    onInsert={() => onInsertNote(note.text)}
                    formatTime={formatTime}
                  />
                ))}
                {isRecording && isEnabled && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Notes in progress...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ isRecording, isEnabled }: { isRecording: boolean; isEnabled: boolean }) {
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
  formatTime,
}: {
  note: NuggetNote;
  onInsert: () => void;
  formatTime: (seconds: number) => string;
}) {
  return (
    <div className="group flex items-start gap-2 rounded-md bg-muted/50 hover:bg-muted px-2.5 py-2 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{note.text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">@ {formatTime(note.recordingTime)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          onInsert();
        }}
        title="Insert note into editor"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default NuggetNotesPanel;
