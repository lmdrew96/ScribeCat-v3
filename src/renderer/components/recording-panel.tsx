import { AudioWaveform } from '@/components/audio-waveform';
import { type LectureType, LectureTypeSelect } from '@/components/lecture-type-select';
import { LiveTranscript } from '@/components/live-transcript';
import { NuggetNotesPanel } from '@/components/nugget-notes-panel';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

import { type NuggetNote, useNuggetNotes } from '@/hooks/use-nugget-notes';
import { useBreakReminder, useLogStudyTime, useStudySettings } from '@/hooks/use-productivity';
import { useSession, useSessions } from '@/hooks/use-sessions';
import { useTranscription } from '@/hooks/use-transcription';
import { useMutation } from 'convex/react';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { ACHIEVEMENT_DEFINITIONS } from '../../shared/achievements';

interface RecordingPanelProps {
  onSessionChange?: (sessionId: Id<'sessions'> | null) => void;
  onInsertNote?: (noteText: string) => void;
  onNuggetNotesChange?: (notes: NuggetNote[]) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export function RecordingPanel({
  onSessionChange,
  onInsertNote,
  onNuggetNotesChange,
  onRecordingStateChange,
}: RecordingPanelProps) {
  const { createSession, updateSession } = useSessions();
  const logStudyTime = useLogStudyTime();
  const [currentSessionId, setCurrentSessionId] = useState<Id<'sessions'> | null>(null);

  // Reactively get session data (for user's notes in the editor)
  const session = useSession(currentSessionId);

  // Lecture type state
  const [lectureType, setLectureType] = useState<LectureType>('general');

  // Course + title state
  const { settings } = useStudySettings();
  const courses = settings && '_id' in settings ? (settings.courses ?? []) : [];
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');

  // Nugget Notes: read persistent setting for initial enabled state
  const nuggetNotesInitialEnabled =
    settings && '_id' in settings ? (settings.nuggetNotesEnabled ?? true) : true;
  const nuggetNotes = useNuggetNotes({ initialEnabled: nuggetNotesInitialEnabled });

  // Handle inserting a note into the editor
  const handleInsertNote = useCallback(
    (noteText: string) => {
      if (onInsertNote) {
        onInsertNote(noteText);
      }
    },
    [onInsertNote],
  );

  // Convex audio upload mutation
  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);

  // Notify parent when session changes
  useEffect(() => {
    onSessionChange?.(currentSessionId);
  }, [currentSessionId, onSessionChange]);

  // Notify parent when Nugget Notes change
  useEffect(() => {
    onNuggetNotesChange?.(nuggetNotes.notes);
  }, [nuggetNotes.notes, onNuggetNotesChange]);

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
      // Upload audio to Convex storage when recording stops
      if (currentSessionId) {
        try {
          const uploadUrl = await generateUploadUrl();
          const uploadResult = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
            body: audioBlob,
          });
          const { storageId } = await uploadResult.json();

          await updateSession({
            id: currentSessionId,
            audioStorageId: storageId,
          });
        } catch (error) {
          console.error('Error uploading audio:', error);
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

  // Break reminder toasts during recording
  useBreakReminder(isRecording);

  // Notify parent when recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

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

      // Process the transcript chunk with lecture type context and user's notes
      await nuggetNotes.processTranscriptChunk(
        fullTranscript,
        recordingTime,
        lectureType,
        session?.notesPlainText || undefined,
      );
    };

    processForNugget();

    return () => {
      nuggetEffectActiveRef.current = false;
    };
  }, [segments, recordingTime, nuggetNotes, lectureType, session?.notesPlainText]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = async () => {
    try {
      // Build session title: custom title > course prefix + timestamp > timestamp
      const course = selectedCourse && selectedCourse !== 'none' ? selectedCourse : '';
      const defaultTitle = course
        ? `${course} - ${new Date().toLocaleString()}`
        : `Recording ${new Date().toLocaleString()}`;
      const sessionId = await createSession({
        title: sessionTitle.trim() || defaultTitle,
        lectureType,
      });

      setCurrentSessionId(sessionId);

      // Clear previous state for new recording
      resetTranscription();
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

    // Update final session data (including nugget notes)
    // Use getLatestNotes() instead of .notes to get notes generated
    // during stopRecording (React state may not have flushed yet)
    if (currentSessionId) {
      await updateSession({
        id: currentSessionId,
        duration: recordingTime * 1000, // Convert to milliseconds
        transcript: getFullTranscript(),
        transcriptSegments: segments,
        nuggetNotes: nuggetNotes.getLatestNotes().map((n) => ({
          text: n.text,
          recordingTime: n.recordingTime,
        })),
      });
    }

    // Log study time for productivity tracking
    const durationMinutes = Math.round(recordingTime / 60);
    if (durationMinutes > 0) {
      try {
        const result = await logStudyTime({
          durationMinutes,
          sessionHour: new Date().getHours(),
        });

        // Show toast for newly unlocked achievements
        if (result?.newUnlocks?.length) {
          for (const id of result.newUnlocks) {
            const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
            if (def) {
              toast.success(`Achievement Unlocked: ${def.name}`, {
                description: def.description,
                duration: 5000,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error logging study time:', error);
      }
    }

    // Clear refs to help garbage collection
    lastSavedTranscriptRef.current = '';
    lastNuggetProcessRef.current = '';

    // Reset title for next recording
    setSessionTitle('');

    // Reset recorder but keep transcription visible
    // NOTE: Do NOT clear currentSessionId here — notes must remain
    // editable/saveable until a new recording starts
    resetRecorder();
  };

  const handlePauseResume = () => {
    togglePause();
  };

  return (
    <div className="flex h-full flex-col p-4 gap-3">
      {/* Live transcript - takes most space */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <LiveTranscript isRecording={isRecording} segments={segments} />
      </div>

      {/* Nugget's Notes panel */}
      <NuggetNotesPanel
        notes={nuggetNotes.notes}
        isRecording={isRecording}
        isProcessing={nuggetNotes.isProcessing}
        isEnabled={nuggetNotes.isEnabled}
        onInsertNote={handleInsertNote}
        onToggleEnabled={nuggetNotes.setEnabled}
      />

      {/* Waveform visualizer - compact */}
      <AudioWaveform isActive={isRecording && !isPaused} audioLevel={audioLevel} />

      {/* Recording controls - compact bottom bar */}
      <div className="flex items-center gap-4 rounded-xl glass p-3">
        {/* Device selector + Lecture type - only show when not recording */}
        {!isRecording && (
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-2">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-full h-8 text-xs">
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
            <div className="flex gap-2">
              <LectureTypeSelect value={lectureType} onChange={setLectureType} />
              {courses.length > 0 && (
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course} className="text-xs">
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={
                selectedCourse && selectedCourse !== 'none'
                  ? `${selectedCourse} — Recording title...`
                  : 'Recording title (optional)'
              }
              className="h-8 text-xs bg-background border-border"
            />
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
        <div className="rounded-xl glass-light bg-destructive/10 p-3 text-xs text-destructive">
          Transcription error: {transcriptionError}
        </div>
      )}
    </div>
  );
}
