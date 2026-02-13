/**
 * Reusable Generate / Regenerate button with loading state
 */

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

interface GenerateButtonProps {
  onGenerate: () => void;
  isGenerating: boolean;
  hasData: boolean;
  error: string | null;
  label?: string;
  description?: string;
}

export function GenerateButton({
  onGenerate,
  isGenerating,
  hasData,
  error,
  label,
  description,
}: GenerateButtonProps) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Generating...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <p className="text-xs text-destructive">{error}</p>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => onGenerate()}
        >
          <RefreshCw className="h-3 w-3" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        {description && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">{description}</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => onGenerate()}
        >
          <Sparkles className="h-3 w-3" />
          {label || 'Generate'}
        </Button>
      </div>
    );
  }

  // Has data — show small regenerate button
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 h-6 text-[10px] text-muted-foreground"
      onClick={() => onGenerate()}
    >
      <RefreshCw className="h-2.5 w-2.5" />
      Regenerate
    </Button>
  );
}
