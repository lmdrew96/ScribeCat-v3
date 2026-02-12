import type { Recording } from '@/components/study-view';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, FileAudio, MoreHorizontal, PanelLeftClose, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface RecordingsSidebarProps {
  recordings: Recording[];
  selectedId?: string;
  onSelect: (recording: Recording) => void;
  onDelete: (recordingId: string) => void;
  onCollapse?: () => void;
}

export function RecordingsSidebar({
  recordings,
  selectedId,
  onSelect,
  onDelete,
  onCollapse,
}: RecordingsSidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<Recording | null>(null);

  return (
    <>
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
              <div key={recording.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(recording)}
                  className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${
                    selectedId === recording.id
                      ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                      : 'hover:bg-[var(--glass-bg-light)]'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 pr-6">
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

                {/* More menu — visible on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(recording);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recording?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be moved to trash. You can restore it within
              30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
