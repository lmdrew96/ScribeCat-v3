import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Mic } from 'lucide-react';
import { useState } from 'react';

interface RecordingConsentModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RecordingConsentModal({ open, onConfirm, onCancel }: RecordingConsentModalProps) {
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = () => {
    setAgreed(false);
    onConfirm();
  };

  const handleCancel = () => {
    setAgreed(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Recording Notice
          </DialogTitle>
          <DialogDescription>
            This feature records audio from your device's microphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground/80">
          <p>By proceeding, you confirm that:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">•</span>
              You have obtained consent from all parties who may be recorded
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">•</span>
              You will use recordings only for personal study purposes
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">•</span>
              You comply with all applicable laws and institutional policies regarding audio
              recording
            </li>
          </ul>
          <p className="text-xs text-muted-foreground italic">
            In Delaware and other two-party consent states, recording someone without their
            knowledge or permission may be illegal.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          <span className="text-sm font-medium">I understand and agree</span>
        </label>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!agreed} onClick={handleConfirm} className="gap-1.5">
            <Mic className="h-4 w-4" />
            Start Recording
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
