import { ChevronDown, ChevronUp, PenLine } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface QuickNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  isRecording: boolean;
}

export function QuickNotesInput({ value, onChange, isRecording }: QuickNotesInputProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd+Shift+N to focus quick notes from anywhere
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
      e.preventDefault();
      textareaRef.current?.focus();
    }
  }, []);

  if (!isRecording) return null;

  return (
    <div className="flex flex-col rounded-lg bg-card border border-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">My Notes</span>
          {value.trim().length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({value.trim().split(/\s+/).length} words)
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Textarea */}
      {!isCollapsed && (
        <div className="border-t border-border p-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jot quick notes here — the AI will use these when generating your notes"
            className="w-full resize-y bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-h-[3.5rem] max-h-[10rem]"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
