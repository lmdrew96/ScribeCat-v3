import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from 'convex/react';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function AudioDeletionWarning() {
  const sessions = useQuery(api.audioCleanup.getSessionsApproachingDeletion);
  const extendRetention = useMutation(api.audioCleanup.extendRetention);
  const [dismissed, setDismissed] = useState(false);

  if (!sessions || sessions.length === 0 || dismissed) return null;

  const minDays = Math.min(...sessions.map((s) => s.daysRemaining));

  const handleKeepAll = async () => {
    await extendRetention({
      sessionIds: sessions.map((s) => s._id) as Id<'sessions'>[],
    });
  };

  return (
    <div className="mx-4 mt-2 rounded-xl glass-light border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
      <p className="text-xs text-foreground/80 flex-1">
        {sessions.length === 1
          ? `1 recording will be automatically deleted in ${minDays} day${minDays === 1 ? '' : 's'}.`
          : `${sessions.length} recordings will be automatically deleted within ${minDays} day${minDays === 1 ? '' : 's'}.`}{' '}
        Transcripts and notes will be kept.
      </p>
      <Button variant="secondary" size="sm" className="text-xs h-7 px-2" onClick={handleKeepAll}>
        Keep All
      </Button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
