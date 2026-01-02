import { AudioWaveform } from '@/components/audio-waveform';
import { LiveTranscript } from '@/components/live-transcript';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useSessions } from '@/hooks/use-sessions';
import { useTranscription } from '@/hooks/use-transcription';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function RecordingPanel() {
  const userId = 'anonymous-user'; // TODO: Get from authenticated user
  const { createSession, updateSession } = useSessions(userId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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
    isConnected: isTranscribing,
    error: transcriptionError,
    segments,
    start: startTranscription,
    stop: stopTranscription,
    reset: resetTranscription,
    getFullTranscript,
  } = useTranscription({
    onSegment: async (segment) => {
      // Auto-save transcript segments to Convex
      if (currentSessionId && segment.isFinal) {
        try {
          await updateSession({
            id: currentSessionId,
            transcriptSegments: segments,
            transcript: getFullTranscript(),
          });
        } catch (error) {
          console.error('Error saving transcript segment:', error);
        }
      }
    },
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);

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

      // Start audio recording
      await startRecording();

      // Get the media stream for transcription
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId === 'default' ? undefined : { exact: selectedDeviceId },
        },
      });

      mediaStreamRef.current = stream;

      // Start transcription
      await startTranscription(stream);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStop = async () => {
    // Stop recording
    stopRecording();

    // Stop transcription
    await stopTranscription();

    // Update final session data
    if (currentSessionId) {
      await updateSession({
        id: currentSessionId,
        duration: recordingTime * 1000, // Convert to milliseconds
        transcript: getFullTranscript(),
        transcriptSegments: segments,
      });
    }

    // Clean up
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    // Reset state
    resetRecorder();
    resetTranscription();
    setCurrentSessionId(null);
  };

  const handlePauseResume = () => {
    togglePause();
  };

  return (
    <div className="flex h-full flex-col p-2 gap-2">
      {/* Live transcript - takes most space (~60%) */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <LiveTranscript isRecording={isRecording} segments={segments} />
      </div>

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
