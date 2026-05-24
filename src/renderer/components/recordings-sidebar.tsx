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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SortOrder } from '@/hooks/use-session-list';
import { useSessionList } from '@/hooks/use-session-list';
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  FileAudio,
  Merge,
  MoreHorizontal,
  PanelLeftClose,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface RecordingsSidebarProps {
  recordings: SessionSummary[];
  trashedRecordings: SessionSummary[];
  selectedId?: string;
  onSelect: (recording: SessionSummary) => void;
  onDelete: (recordingId: string) => void;
  onRestore: (recordingId: string) => void;
  onPermanentDelete: (recordingId: string) => void;
  onShare?: (recordingId: string) => void;
  onMerge?: (recordingId: string) => void;
  onCollapse?: () => void;
}

type ConfirmAction = {
  type: 'delete' | 'permanent-delete';
  recording: SessionSummary;
};

const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  az: 'A → Z',
  za: 'Z → A',
};

function SortIcon({ order }: { order: SortOrder }) {
  if (order === 'az') return <ArrowDownAZ className="h-3 w-3" />;
  if (order === 'za') return <ArrowUpAZ className="h-3 w-3" />;
  return <ArrowUpDown className="h-3 w-3" />;
}

function SessionItem({
  recording,
  selectedId,
  viewingTrash,
  onSelect,
  onShare,
  onMerge,
  showMerge,
  onDeleteRequest,
}: {
  recording: SessionSummary;
  selectedId?: string;
  viewingTrash: boolean;
  onSelect: (r: SessionSummary) => void;
  onShare?: (id: string) => void;
  onMerge?: (id: string) => void;
  showMerge: boolean;
  onDeleteRequest: (type: 'delete' | 'permanent-delete') => void;
}) {
  return (
    <div className="group relative">
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteRequest('delete'); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest('permanent-delete'); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete forever
                </DropdownMenuItem>
              </>
            ) : (
              <>
                {onShare && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(recording.id); }}>
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </DropdownMenuItem>
                )}
                {onMerge && showMerge && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMerge(recording.id); }}>
                    <Merge className="h-3.5 w-3.5" />
                    Merge sessions…
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest('delete'); }}
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
  );
}

export function RecordingsSidebar({
  recordings,
  trashedRecordings,
  selectedId,
  onSelect,
  onDelete,
  onRestore,
  onShare,
  onMerge,
  onPermanentDelete,
  onCollapse,
}: RecordingsSidebarProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [viewingTrash, setViewingTrash] = useState(false);

  const { searchQuery, setSearchQuery, sortOrder, setSortOrder, isSearching, flatResults, groups, toggleCourse, isCourseCollapsed } =
    useSessionList(recordings);

  return (
    <>
      <div className="flex h-full flex-col p-3">
        {/* Header */}
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

        {/* Search + sort — only in main view */}
        {!viewingTrash && (
          <div className="flex items-center gap-1 px-1 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions…"
                className="h-7 pl-6 pr-6 text-[11px] bg-background border-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title={SORT_LABELS[sortOrder]}>
                  <SortIcon order={sortOrder} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => (
                  <DropdownMenuItem
                    key={order}
                    onClick={() => setSortOrder(order)}
                    className={sortOrder === order ? 'font-medium text-primary' : ''}
                  >
                    {SORT_LABELS[order]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {/* Trash view — flat list */}
          {viewingTrash && (
            <div className="space-y-1">
              {trashedRecordings.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">Trash is empty</p>
              )}
              {trashedRecordings.map((recording) => (
                <SessionItem
                  key={recording.id}
                  recording={recording}
                  selectedId={selectedId}
                  viewingTrash
                  onSelect={onSelect}
                  onShare={onShare}
                  onMerge={onMerge}
                  showMerge={recordings.length > 1}
                  onDeleteRequest={(type) => {
                    if (type === 'delete') {
                      onRestore(recording.id);
                    } else {
                      setConfirmAction({ type: 'permanent-delete', recording });
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Search results — flat list */}
          {!viewingTrash && isSearching && (
            <div className="space-y-1">
              {flatResults.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No sessions match "{searchQuery}"</p>
              ) : (
                <>
                  <p className="px-2 pb-1 text-[10px] text-muted-foreground">{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</p>
                  {flatResults.map((recording) => (
                    <SessionItem
                      key={recording.id}
                      recording={recording}
                      selectedId={selectedId}
                      viewingTrash={false}
                      onSelect={onSelect}
                      onShare={onShare}
                      onMerge={onMerge}
                      showMerge={recordings.length > 1}
                      onDeleteRequest={(type) => setConfirmAction({ type, recording })}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Browse view — grouped by course */}
          {!viewingTrash && !isSearching && (
            <div className="space-y-1">
              {recordings.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No recordings yet</p>
              )}
              {groups.map((group) => (
                <div key={group.course}>
                  {/* Course group header — only shown when multiple groups exist */}
                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleCourse(group.course)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-[var(--glass-bg-light)]"
                    >
                      {isCourseCollapsed(group.course) ? (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{group.course}</span>
                      <span className="ml-auto tabular-nums opacity-60">{group.sessions.length}</span>
                    </button>
                  )}
                  {!isCourseCollapsed(group.course) && (
                    <div className={`space-y-1 ${groups.length > 1 ? 'pl-2' : ''}`}>
                      {group.sessions.map((recording) => (
                        <SessionItem
                          key={recording.id}
                          recording={recording}
                          selectedId={selectedId}
                          viewingTrash={false}
                          onSelect={onSelect}
                          onShare={onShare}
                          onMerge={onMerge}
                          showMerge={recordings.length > 1}
                          onDeleteRequest={(type) => setConfirmAction({ type, recording })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'permanent-delete' ? 'Delete forever?' : 'Delete recording?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'permanent-delete' ? (
                <>&ldquo;{confirmAction.recording.title}&rdquo; will be permanently deleted. This cannot be undone.</>
              ) : (
                <>&ldquo;{confirmAction?.recording.title}&rdquo; will be moved to trash. You can restore it within 30 days.</>
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
