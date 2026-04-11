import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useExamRoomActions } from '@/hooks/use-exam-room';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

interface CreateExamRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateExamRoomModal({ open, onOpenChange }: CreateExamRoomModalProps) {
  const navigate = useNavigate();
  const { createExamRoom } = useExamRoomActions();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Enter a name for your exam room');
      return;
    }

    setCreating(true);
    try {
      const examRoomId = await createExamRoom({
        name: name.trim(),
        examDate: examDate ? new Date(examDate).getTime() : undefined,
      });
      toast.success('Exam room created!');
      onOpenChange(false);
      setName('');
      setExamDate('');
      navigate({ to: '/exam/$examRoomId', params: { examRoomId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create exam room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Exam Room</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="exam-room-name" className="text-sm font-medium text-foreground">
              Room Name
            </label>
            <Input
              id="exam-room-name"
              placeholder="e.g. CISC108 Midterm 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="exam-date" className="text-sm font-medium text-foreground">
              Exam Date <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Set a target date to track your countdown
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
