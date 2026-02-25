import type { SessionSummary } from '@/components/study-view';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileAudio,
  Filter,
  MoreHorizontal,
  PanelLeftClose,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface RecordingsSidebarProps {
  recordings: SessionSummary[];
  trashedRecordings: SessionSummary[];
  selectedId?: string;
  onSelect: (recording: SessionSummary) => void;
  onDelete: (recordingId: string) => void;
  onRestore: (recordingId: string) => void;
  onPermanentDelete: (recordingId: string) => void;
  onShare?: (recordingId: string) => void;
  onCollapse?: () => void;
}

type ConfirmAction = {
  type: 'delete' | 'permanent-delete';
  recording: SessionSummary;
};

export function RecordingsSidebar({
  recordings,
  trashedRecordings,
  selectedId,
  onSelect,
  onDelete,
  onRestore,
  onShare,
  onPermanentDelete,
  onCollapse,
}: RecordingsSidebarProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [viewingTrash, setViewingTrash] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');

  // Extract unique courses from recordings for filter dropdown
  const availableCourses = useMemo(() => {
    const courses = new Set<string>();
    for (const r of recordings) {
      if (r.course) courses.add(r.course);
    }
    return Array.from(courses).sort();
  }, [recordings]);

  const filteredRecordings =
    courseFilter === 'all' ? recordings : recordings.filter((r) => r.course === courseFilter);

  const activeList = viewingTrash ? trashedRecordings : filteredRecordings;

  return (
    <>
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          {viewingTrash ? (
            <button
              type="button"
              onClick={() => setViewingTrash(false)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Trash
            </button>
          ) : (
            <h2 className="text-xs font-medium text-muted-foreground">Recordings</h2>
          )}
          {onCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCollapse}>
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Course filter — only in main view when courses exist */}
        {!viewingTrash && availableCourses.length > 0 && (
          <div className="px-1 mb-2">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-7 text-[11px] bg-background border-border">
                <Filter className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Courses
                </SelectItem>
                {availableCourses.map((course) => (
                  <SelectItem key={course} value={course} className="text-xs">
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {activeList.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {viewingTrash
                  ? 'Trash is empty'
                  : courseFilter !== 'all'
                    ? 'No recordings for this course'
                    : 'No recordings yet'}
              </p>
            )}
            {activeList.map((recording) => (
              <div key={recording.id} className="group relative">
                <button
                  type="button"
                  onClick={() => !viewingTrash && onSelect(recording)}
                  className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${
                    !viewingTrash && selectedId === recording.id
                      ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                      : 'hover:bg-[var(--glass-bg-light)]'
                  } ${viewingTrash ? 'opacity-60' : ''}`}
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
                      {viewingTrash ? (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestore(recording.id);
                            }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({ type: 'permanent-delete', recording });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete forever
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {onShare && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onShare(recording.id);
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Share
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({ type: 'delete', recording });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Trash toggle at bottom */}
        {!viewingTrash && (
          <button
            type="button"
            onClick={() => setViewingTrash(true)}
            className="mt-2 flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-[var(--glass-bg-light)] ml-auto"
            title={`Trash${trashedRecordings.length > 0 ? ` (${trashedRecordings.length})` : ''}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Confirmation dialog for delete / permanent delete */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'permanent-delete' ? 'Delete forever?' : 'Delete recording?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'permanent-delete' ? (
                <>
                  &ldquo;{confirmAction.recording.title}&rdquo; will be permanently deleted. This
                  cannot be undone.
                </>
              ) : (
                <>
                  &ldquo;{confirmAction?.recording.title}&rdquo; will be moved to trash. You can
                  restore it within 30 days.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'permanent-delete') {
                  onPermanentDelete(confirmAction.recording.id);
                } else {
                  onDelete(confirmAction.recording.id);
                }
                setConfirmAction(null);
              }}
            >
              {confirmAction?.type === 'permanent-delete' ? 'Delete forever' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
