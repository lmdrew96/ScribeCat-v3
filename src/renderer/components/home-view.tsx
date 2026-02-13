import type React from 'react';

import { NotesPanel } from '@/components/notes-panel';
import { RecordingPanel } from '@/components/recording-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionContext } from '@/contexts/session-context';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { FileText, GripVertical, Mic } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

// Type for NotesPanel ref
export interface NotesPanelRef {
  insertNote: (noteText: string) => void;
}

export function HomeView() {
  const { setActiveSessionId, setNuggetNotes, setIsRecording } = useSessionContext();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'notes' | 'recording'>('recording');
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<Id<'sessions'> | null>(null);
  const notesPanelRef = useRef<NotesPanelRef>(null);

  // Sync local session ID to shared context for NuggetChat
  useEffect(() => {
    setActiveSessionId(currentSessionId);
  }, [currentSessionId, setActiveSessionId]);

  // Clear context on unmount (navigating away from home)
  useEffect(() => {
    return () => {
      setActiveSessionId(null);
      setNuggetNotes([]);
      setIsRecording(false);
    };
  }, [setActiveSessionId, setNuggetNotes, setIsRecording]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(newWidth, 25), 75));
    },
    [isDragging],
  );

  // Handle inserting a note from Nugget Notes panel into TipTap editor
  const handleInsertNote = useCallback((noteText: string) => {
    if (notesPanelRef.current) {
      notesPanelRef.current.insertNote(noteText);
    }
  }, []);

  if (isMobile) {
    return (
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'notes' | 'recording')}
        className="flex h-full flex-col"
      >
        <TabsList className="mx-3 mt-3 shrink-0">
          <TabsTrigger value="recording" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            Recording
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="recording"
          forceMount
          className={cn('flex-1 min-h-0', activeTab !== 'recording' && 'hidden')}
        >
          <RecordingPanel
            onSessionChange={setCurrentSessionId}
            onInsertNote={handleInsertNote}
            onNuggetNotesChange={setNuggetNotes}
            onRecordingStateChange={setIsRecording}
          />
        </TabsContent>
        <TabsContent
          value="notes"
          forceMount
          className={cn('flex-1 min-h-0', activeTab !== 'notes' && 'hidden')}
        >
          <NotesPanel sessionId={currentSessionId} ref={notesPanelRef} />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <div
      className="flex h-full select-none gap-3 p-3"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ width: `${leftWidth}%` }} className="min-w-0">
        <NotesPanel sessionId={currentSessionId} ref={notesPanelRef} />
      </div>

      {/* Drag handle */}
      <div
        className="group flex w-1.5 cursor-col-resize items-center justify-center rounded-full glass-light hover:bg-[var(--glass-bg)] transition-colors"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div style={{ width: `${100 - leftWidth}%` }} className="min-w-[260px]">
        <RecordingPanel
          onSessionChange={setCurrentSessionId}
          onInsertNote={handleInsertNote}
          onNuggetNotesChange={setNuggetNotes}
          onRecordingStateChange={setIsRecording}
        />
      </div>
    </div>
  );
}
