import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useExamRoomActions } from '@/hooks/use-exam-room';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface EditExamRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examRoomId: Id<'examRooms'>;
  currentName: string;
  currentExamDate?: number;
}

function timestampToDateString(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function EditExamRoomModal({
  open,
  onOpenChange,
  examRoomId,
  currentName,
  currentExamDate,
}: EditExamRoomModalProps) {
  const { updateExamRoom } = useExamRoomActions();
  const [name, setName] = useState(currentName);
  const [examDate, setExamDate] = useState(timestampToDateString(currentExamDate));
  const [saving, setSaving] = useState(false);

  // Sync form state when the modal opens with new values
  useEffect(() => {
    if (open) {
      setName(currentName);
      setExamDate(timestampToDateString(currentExamDate));
    }
  }, [open, currentName, currentExamDate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Room name is required');
      return;
    }

    setSaving(true);
    try {
      const newExamDate = examDate
        ? new Date(`${examDate}T00:00:00`).getTime()
        : null;

      await updateExamRoom({
        examRoomId,
        name: name.trim(),
        examDate: newExamDate,
      });
      toast.success('Exam room updated');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update exam room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Edit Exam Room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="edit-exam-room-name" className="text-sm font-medium text-foreground">
              Room Name
            </label>
            <Input
              id="edit-exam-room-name"
              placeholder="e.g. CISC108 Midterm 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-exam-date" className="text-sm font-medium text-foreground">
              Exam Date <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="edit-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="flex-1"
              />
              {examDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => setExamDate('')}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Set a target date to track your countdown
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
