import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, FileAudio, PanelLeftClose } from 'lucide-react';

interface RecordingsSidebarProps {
  recordings: Recording[];
  selectedId?: string;
  onSelect: (recording: Recording) => void;
  onCollapse?: () => void;
}

export function RecordingsSidebar({
  recordings,
  selectedId,
  onSelect,
  onCollapse,
}: RecordingsSidebarProps) {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-medium text-muted-foreground">Recordings</h2>
        {onCollapse && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCollapse}>
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {recordings.map((recording) => (
            <button
              type="button"
              key={recording.id}
              onClick={() => onSelect(recording)}
              className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${
                selectedId === recording.id
                  ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                  : 'hover:bg-[var(--glass-bg-light)]'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <FileAudio className="h-3 w-3 text-primary shrink-0" />
                <span className="line-clamp-1 text-xs font-medium text-sidebar-foreground">
                  {recording.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {recording.date}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {recording.duration}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
