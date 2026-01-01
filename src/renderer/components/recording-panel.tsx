import { AudioWaveform } from '@/components/audio-waveform';
import { LiveTranscript } from '@/components/live-transcript';
import { Button } from '@/components/ui/button';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RecordingPanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    }
  };

  const handleStop = () => {
    setIsRecording(false);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="flex h-full flex-col p-2 gap-2">
      {/* Live transcript - takes most space (~60%) */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <LiveTranscript isRecording={isRecording} />
      </div>

      {/* Waveform visualizer - compact */}
      <AudioWaveform isActive={isRecording && !isPaused} />

      {/* Recording controls - compact bottom bar */}
      <div className="flex items-center gap-3 rounded-lg bg-card p-2">
        <button
          type="button"
          onClick={isRecording ? handleStop : handleRecord}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            isRecording
              ? 'recording-pulse bg-[var(--record)]'
              : 'bg-[var(--record)] hover:scale-105 hover:bg-[var(--record)]/90'
          }`}
        >
          {isRecording ? (
            <Square className="h-5 w-5 text-white" fill="white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-mono text-lg font-medium text-foreground">
            {formatTime(recordingTime)}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {isRecording ? (isPaused ? 'Paused' : 'Recording...') : 'Ready'}
          </div>
        </div>

        {isRecording && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePauseResume}
            className="gap-1.5 h-8 px-2 text-xs"
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                Pause
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
