import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface RecordingContinueModalProps {
  open: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onStop: () => void;
}

export function RecordingContinueModal({
  open,
  remainingSeconds,
  onContinue,
  onStop,
}: RecordingContinueModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onStop()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Recording limit reached
          </DialogTitle>
          <DialogDescription>
            You've been recording for a long time. Do you want to continue recording?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground/80">
          <p>
            For safety and device battery reasons, recordings are prompted every 3 hours. If you do
            not respond within <strong>{remainingSeconds}</strong> seconds, recording will be
            stopped automatically and saved.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onStop}>
            Stop recording
          </Button>
          <Button size="sm" onClick={onContinue} className="gap-1.5">
            Continue recording
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

