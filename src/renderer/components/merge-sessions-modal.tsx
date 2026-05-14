import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Check, Clock, FileAudio, Merge } from 'lucide-react';
import { useState } from 'react';
import type { SessionSummary } from './study-view';

interface MergeSessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primarySession: SessionSummary;
  otherSessions: SessionSummary[];
  onMerge: (primaryId: string, secondaryIds: string[], newTitle: string) => Promise<void>;
}

export function MergeSessionsModal({
  open,
  onOpenChange,
  primarySession,
  otherSessions,
  onMerge,
}: MergeSessionsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState(primarySession.title);
  const [merging, setMerging] = useState(false);

  const toggleSession = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseDurationMs = (formatted: string): number => {
    const [mins, secs] = formatted.split(':').map(Number);
    return ((mins ?? 0) * 60 + (secs ?? 0)) * 1000;
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedSessions = otherSessions.filter((s) => selectedIds.has(s.id));
  const totalDurationMs =
    parseDurationMs(primarySession.duration) +
    selectedSessions.reduce((sum, s) => sum + parseDurationMs(s.duration), 0);

  const handleMerge = async () => {
    if (selectedIds.size === 0) return;
    setMerging(true);
    try {
      await onMerge(primarySession.id, [...selectedIds], newTitle.trim() || primarySession.title);
      onOpenChange(false);
      setSelectedIds(new Set());
    } finally {
      setMerging(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIds(new Set());
      setNewTitle(primarySession.title);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            Merge Sessions
          </DialogTitle>
          <DialogDescription>
            Select the fragments to merge into this session. Transcripts and notes will be combined
            in chronological order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary session (the one being kept) */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Keeping this session</Label>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
              <FileAudio className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{primarySession.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {primarySession.date}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {primarySession.duration}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Session picker */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Merge these fragments into it
            </Label>
            {otherSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No other sessions to merge with.
              </p>
            ) : (
              <ScrollArea className="max-h-52 rounded-lg border border-border">
                <div className="p-2 space-y-1">
                  {otherSessions.map((session) => {
                    const isSelected = selectedIds.has(session.id);
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        className={`w-full flex items-start gap-2.5 rounded-md p-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-[var(--glass-bg-light)] border border-transparent'
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{session.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {session.date}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {session.duration}
                            </span>
                            {session.course && (
                              <span className="truncate opacity-70">{session.course}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Title for merged session */}
          {selectedIds.size > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="merge-title" className="text-xs text-muted-foreground">
                Title for merged session
              </Label>
              <Input
                id="merge-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={primarySession.title}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Combined duration: {formatDuration(totalDurationMs)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMerge}
            disabled={selectedIds.size === 0 || merging}
          >
            {merging ? 'Merging…' : `Merge ${selectedIds.size > 0 ? `(${selectedIds.size + 1} sessions)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
