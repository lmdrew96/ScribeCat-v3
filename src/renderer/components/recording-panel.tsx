import { AudioWaveform } from '@/components/audio-waveform';
import { LiveTranscript } from '@/components/live-transcript';
import { NuggetNotesPanel } from '@/components/nugget-notes-panel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useNuggetNotes } from '@/hooks/use-nugget-notes';
import { useSessions } from '@/hooks/use-sessions';
import { useTranscription } from '@/hooks/use-transcription';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

interface RecordingPanelProps {
  onSessionChange?: (sessionId: Id<'sessions'> | null) => void;
  onInsertNote?: (noteText: string) => void;
}

export function RecordingPanel({ onSessionChange, onInsertNote }: RecordingPanelProps) {
  const userId = 'anonymous-user'; // TODO: Get from authenticated user
  const { createSession, updateSession } = useSessions(userId);
  const [currentSessionId, setCurrentSessionId] = useState<Id<'sessions'> | null>(null);

  // Nugget Notes hook for real-time AI note generation
  const nuggetNotes = useNuggetNotes();

  // Handle inserting a note into the editor
  const handleInsertNote = useCallback(
    (noteText: string) => {
      if (onInsertNote) {
        onInsertNote(noteText);
      }
    },
    [onInsertNote],
  );

  // Notify parent when session changes
  useEffect(() => {
    onSessionChange?.(currentSessionId);
  }, [currentSessionId, onSessionChange]);

  // Track if component is mounted for async operations
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Clear refs to help garbage collection
      lastSavedTranscriptRef.current = '';
      lastNuggetProcessRef.current = '';
      console.log('🧹 RecordingPanel unmount cleanup');
    };
  }, []);

  const {
    isRecording,
    isPaused,
    devices,
    selectedDeviceId,
    audioLevel,
    recordingTime,
    startRecording,
    stopRecording,
    togglePause,
    setSelectedDeviceId,
    reset: resetRecorder,
    getStream,
  } = useAudioRecorder({
    onDataAvailable: async (audioBlob) => {
      // Save audio file when recording stops
      if (currentSessionId && window.electronAPI) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const filename = `${currentSessionId}.webm`;
        const result = await window.electronAPI.saveAudio(filename, arrayBuffer);

        if (result.success && result.filePath) {
          await updateSession({
            id: currentSessionId,
            audioFilePath: result.filePath,
          });
        }
      }
    },
    onError: (error) => {
      console.error('Recording error:', error);
    },
  });

  const {
    error: transcriptionError,
    segments,
    start: startTranscription,
    stop: stopTranscription,
    reset: resetTranscription,
    getFullTranscript,
  } = useTranscription();

  // Track the last saved transcript to avoid duplicate saves
  const lastSavedTranscriptRef = useRef<string>('');
  const lastNuggetProcessRef = useRef<string>('');

  // Save transcript when we get new final segments (debounced by checking if content changed)
  useEffect(() => {
    const saveTranscript = async () => {
      if (!currentSessionId || segments.length === 0) return;

      const finalSegments = segments.filter((s) => s.isFinal);
      if (finalSegments.length === 0) return;

      const fullTranscript = finalSegments.map((s) => s.text).join(' ');

      // Only save if transcript actually changed
      if (fullTranscript === lastSavedTranscriptRef.current) return;
      lastSavedTranscriptRef.current = fullTranscript;

      try {
        await updateSession({
          id: currentSessionId,
          transcriptSegments: segments,
          transcript: fullTranscript,
        });
        console.log(`Transcript saved: ${fullTranscript.substring(0, 50)}...`);
      } catch (error) {
        console.error('Error saving transcript:', error);
      }
    };
    saveTranscript();
  }, [segments, currentSessionId, updateSession]);

  // Process transcript chunks for Nugget Notes
  // Use a ref to track if the effect is still active
  const nuggetEffectActiveRef = useRef(true);

  useEffect(() => {
    nuggetEffectActiveRef.current = true;

    const processForNugget = async () => {
      if (!nuggetEffectActiveRef.current) return;
      if (!nuggetNotes.isRecording || !nuggetNotes.isEnabled) return;

      const finalSegments = segments.filter((s) => s.isFinal);
      if (finalSegments.length === 0) return;

      const fullTranscript = finalSegments.map((s) => s.text).join(' ');

      // Only process if we have new content
      if (fullTranscript === lastNuggetProcessRef.current) return;
      lastNuggetProcessRef.current = fullTranscript;

      // Check again if still active before async operation
      if (!nuggetEffectActiveRef.current) return;

      // Process the transcript chunk
      await nuggetNotes.processTranscriptChunk(fullTranscript, recordingTime);
    };

    processForNugget();

    return () => {
      nuggetEffectActiveRef.current = false;
    };
  }, [segments, recordingTime, nuggetNotes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = async () => {
    try {
      // Create a new session
      const sessionId = await createSession({
        userId,
        title: `Recording ${new Date().toLocaleString()}`,
      });

      setCurrentSessionId(sessionId);

      // Clear previous transcription when starting a new recording
      resetTranscription();

      // Clear and start Nugget Notes
      nuggetNotes.clearNotes();
      nuggetNotes.startRecording();
      lastNuggetProcessRef.current = '';

      // Start audio recording first (this creates the media stream)
      await startRecording();

      // Get the media stream from the audio recorder (avoid duplicate getUserMedia)
      // Small delay to ensure the stream is ready
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stream = getStream();

      if (!stream) {
        throw new Error('Failed to get media stream from audio recorder');
      }

      // Start transcription with the shared stream
      await startTranscription(stream);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStop = async () => {
    // Stop recording (this also stops the media stream tracks)
    stopRecording();

    // Stop transcription
    await stopTranscription();

    // Stop Nugget Notes (process final chunk)
    const finalTranscript = getFullTranscript();
    await nuggetNotes.stopRecording(finalTranscript);

    // Update final session data
    if (currentSessionId) {
      await updateSession({
        id: currentSessionId,
        duration: recordingTime * 1000, // Convert to milliseconds
        transcript: getFullTranscript(),
        transcriptSegments: segments,
      });
    }

    // Clear refs to help garbage collection
    lastSavedTranscriptRef.current = '';
    lastNuggetProcessRef.current = '';

    // Reset recorder but keep transcription visible
    resetRecorder();
    setCurrentSessionId(null);
  };

  const handlePauseResume = () => {
    togglePause();
  };

  return (
    <div className="flex h-full flex-col p-2 gap-2">
      {/* Live transcript - takes most space */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <LiveTranscript isRecording={isRecording} segments={segments} />
      </div>

      {/* Nugget's Notes panel */}
      <NuggetNotesPanel
        notes={nuggetNotes.notes}
        isRecording={isRecording}
        isEnabled={nuggetNotes.isEnabled}
        onInsertNote={handleInsertNote}
        onToggleEnabled={nuggetNotes.setEnabled}
      />

      {/* Waveform visualizer - compact */}
      <AudioWaveform isActive={isRecording && !isPaused} audioLevel={audioLevel} />

      {/* Recording controls - compact bottom bar */}
      <div className="flex items-center gap-3 rounded-lg bg-card p-2">
        {/* Device selector - only show when not recording */}
        {!isRecording && (
          <div className="flex-1 min-w-0">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Recording timer - show when recording */}
        {isRecording && (
          <div className="flex-1 min-w-0">
            <div className="font-mono text-lg font-medium text-foreground">
              {formatTime(recordingTime)}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {isPaused ? 'Paused' : 'Recording...'}
            </div>
          </div>
        )}

        {/* Record/Stop button */}
        <button
          type="button"
          onClick={isRecording ? handleStop : handleRecord}
          disabled={!isRecording && devices.length === 0}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
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

        {/* Pause/Resume button */}
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

      {/* Error display */}
      {transcriptionError && (
        <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          Transcription error: {transcriptionError}
        </div>
      )}
    </div>
  );
}
