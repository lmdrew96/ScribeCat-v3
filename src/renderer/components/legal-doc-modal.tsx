import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LegalDocModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

export function LegalDocModal({ open, onOpenChange, title, content }: LegalDocModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-relaxed">
            {content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
