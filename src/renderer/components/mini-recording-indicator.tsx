import { Button } from '@/components/ui/button';
import { useRecordingContext } from '@/contexts/recording-context';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Mic, Pause, Play, Square } from 'lucide-react';

export function MiniRecordingIndicator() {
  const { isRecording, isPaused, recordingTime, handleStop, handlePauseResume } =
    useRecordingContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Only show on non-home routes while recording
  if (!isRecording || pathname === '/') return null;

  const mins = Math.floor(recordingTime / 60);
  const secs = recordingTime % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed top-16 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="glass-heavy flex items-center gap-3 rounded-full border border-[var(--glass-border)] px-4 py-2 shadow-lg">
        {/* Pulsing red dot */}
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--record)] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--record)]" />
        </span>

        {/* Timer — click to go back to recording view */}
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="font-mono text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {timeStr}
        </button>

        <span className="text-xs text-muted-foreground">{isPaused ? 'Paused' : 'Recording'}</span>

        {/* Pause/Resume */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePauseResume}>
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>

        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleStop}
        >
          <Square className="h-3.5 w-3.5" fill="currentColor" />
        </Button>

        {/* Back to recording view */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigate({ to: '/' })}
        >
          <Mic className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
