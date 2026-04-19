/**
 * RecordingContext — persistent recording state that survives route navigation.
 *
 * Owns useAudioRecorder, useTranscription, and useNuggetNotes hooks.
 * Mounted in AppLayout so these hooks never unmount during in-app navigation.
 * Syncs key state to SessionContext so NuggetChat, TopBar, etc. keep working.
 */

import type { LectureType } from '@/components/lecture-type-select';
import { useSessionContext } from '@/contexts/session-context';
import { type AudioDevice, useAudioRecorder } from '@/hooks/use-audio-recorder';
import { type UseNuggetNotesReturn, useNuggetNotes } from '@/hooks/use-nugget-notes';
import { useBreakReminder, useLogStudyTime, useStudySettings } from '@/hooks/use-productivity';
import { useSession, useSessions } from '@/hooks/use-sessions';
import { type TranscriptSegment, useTranscription } from '@/hooks/use-transcription';
import { clearRecoveryData, saveAudioChunk, startRecoverySession } from '@/lib/audio-recovery';
import { useMutation } from 'convex/react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { ACHIEVEMENT_DEFINITIONS } from '../../shared/achievements';

// ─── Context Value ───────────────────────────────────────────────────────────

interface RecordingContextValue {
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioLevel: number;
  currentSessionId: Id<'sessions'> | null;

  // Devices
  devices: AudioDevice[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;

  // Pre-record config
  lectureType: LectureType;
  setLectureType: (type: LectureType) => void;
  selectedCourse: string;
  setSelectedCourse: (course: string) => void;
  sessionTitle: string;
  setSessionTitle: (title: string) => void;
  courses: string[];

  // Transcription
  segments: TranscriptSegment[];
  transcriptionError: string | null;

  // Nugget notes
  nuggetNotes: UseNuggetNotesReturn;

  // Controls
  handleRecord: () => Promise<void>;
  handleStop: () => Promise<void>;
  handlePauseResume: () => void;

  // Consent
  showConsentModal: boolean;
  setShowConsentModal: (show: boolean) => void;
  requestRecord: () => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RecordingProvider({ children }: { children: ReactNode }) {
  const {
    setActiveSessionId,
    setNuggetNotes: setContextNuggetNotes,
    setIsRecording: setContextIsRecording,
  } = useSessionContext();

  const { createSession, updateSession } = useSessions();
  const logStudyTime = useLogStudyTime();
  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);

  // Session state
  const currentSessionIdRef = useRef<Id<'sessions'> | null>(null);
  // We need a state version too for reactivity
  const [currentSessionId, setCurrentSessionId] = useStateWithRef<Id<'sessions'> | null>(
    null,
    currentSessionIdRef,
  );

  // Consent modal
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Pre-record config
  const [lectureType, setLectureType] = useSimpleState<LectureType>('general');
  const [selectedCourse, setSelectedCourse] = useSimpleState('');
  const [sessionTitle, setSessionTitle] = useSimpleState('');

  const { settings } = useStudySettings();
  const courses = settings && '_id' in settings ? (settings.courses ?? []) : [];
  const nuggetNotesInitialEnabled =
    settings && '_id' in settings ? (settings.nuggetNotesEnabled ?? true) : true;

  // Refs for dedup
  const lastSavedTranscriptRef = useRef('');
  const lastNuggetProcessRef = useRef('');
  const isMountedRef = useRef(true);
  const nuggetEffectActiveRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Nugget Notes hook ──────────────────────────────────────────────────

  const handleScrubComplete = useCallback(
    async (scrubbedTranscript: string) => {
      if (!currentSessionIdRef.current) return;
      try {
        await updateSession({ id: currentSessionIdRef.current, transcript: scrubbedTranscript });
      } catch (error) {
        console.error('Error saving scrubbed transcript:', error);
      }
    },
    [updateSession],
  );

  const nuggetNotes = useNuggetNotes({
    initialEnabled: nuggetNotesInitialEnabled,
    onScrubComplete: handleScrubComplete,
  });

  // Stable ref for getLatestNotes — avoids re-creating intervals on every render
  const getLatestNuggetNotesRef = useRef(nuggetNotes.getLatestNotes);
  getLatestNuggetNotesRef.current = nuggetNotes.getLatestNotes;

  // ─── Audio Recorder ─────────────────────────────────────────────────────

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
      if (currentSessionIdRef.current) {
        const sessionId = currentSessionIdRef.current;
        try {
          if (audioBlob.size === 0) {
            throw new Error('Recording produced an empty audio blob');
          }
          const uploadUrl = await generateUploadUrl();
          const uploadResult = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
            body: audioBlob,
          });
          if (!uploadResult.ok) {
            const body = await uploadResult.text().catch(() => '');
            throw new Error(
              `Upload failed (${uploadResult.status} ${uploadResult.statusText}): ${
                body.slice(0, 200) || 'no response body'
              }`,
            );
          }
          const { storageId } = (await uploadResult.json()) as { storageId?: string };
          if (!storageId) {
            throw new Error('Upload response missing storageId');
          }
          await updateSession({
            id: sessionId,
            audioStorageId: storageId,
          });
          // Audio uploaded successfully — clear recovery data
          clearRecoveryData(sessionId).catch(console.warn);
        } catch (error) {
          console.error('Error uploading audio:', error);
          const message = error instanceof Error ? error.message : String(error);
          toast.error('Audio save failed', {
            description: `${message}. Refresh the page — the "Recover Audio" banner will let you retry.`,
            duration: 15000,
          });
        }
      }
    },
    onChunkAvailable: (chunk) => {
      // Fire-and-forget: save chunk to IndexedDB for crash recovery
      const sessionId = currentSessionIdRef.current;
      if (sessionId) {
        saveAudioChunk(sessionId, chunk).catch(() => {
          // Silently ignore — never interrupt recording for recovery saves
        });
      }
    },
    onError: (error) => {
      console.error('Recording error:', error);
    },
  });

  // ─── Transcription ──────────────────────────────────────────────────────

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

  // ─── Sync to SessionContext ─────────────────────────────────────────────

  useEffect(() => {
    setContextIsRecording(isRecording);
  }, [isRecording, setContextIsRecording]);

  useEffect(() => {
    setContextNuggetNotes(nuggetNotes.notes);
  }, [nuggetNotes.notes, setContextNuggetNotes]);

  useEffect(() => {
    setActiveSessionId(currentSessionId);
  }, [currentSessionId, setActiveSessionId]);

  // ─── Transcript save effect ─────────────────────────────────────────────

  useEffect(() => {
    const saveTranscript = async () => {
      if (!currentSessionIdRef.current || segments.length === 0) return;

      const finalSegments = segments.filter((s) => s.isFinal);
      if (finalSegments.length === 0) return;

      const fullTranscript = finalSegments.map((s) => s.text).join(' ');
      if (fullTranscript === lastSavedTranscriptRef.current) return;
      lastSavedTranscriptRef.current = fullTranscript;

      try {
        await updateSession({
          id: currentSessionIdRef.current,
          transcriptSegments: segments,
          transcript: fullTranscript,
        });
      } catch (error) {
        console.error('Error saving transcript:', error);
      }
    };
    saveTranscript();
  }, [segments, updateSession]);

  // ─── Nugget notes periodic save effect ──────────────────────────────────

  useEffect(() => {
    if (!isRecording || !currentSessionIdRef.current) return;

    const interval = setInterval(async () => {
      if (!currentSessionIdRef.current) return;
      const latestNotes = getLatestNuggetNotesRef.current();
      if (latestNotes.length === 0) return;

      try {
        await updateSession({
          id: currentSessionIdRef.current,
          nuggetNotes: latestNotes.map((n) => ({
            text: n.text,
            recordingTime: n.recordingTime,
          })),
        });
      } catch (error) {
        console.error('Error saving nugget notes:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isRecording, updateSession]);

  // ─── Nugget notes process effect ────────────────────────────────────────

  // We need the session for user notes context — use a query from the hook
  const sessionForNotes = useSessionQuery(currentSessionId);

  useEffect(() => {
    nuggetEffectActiveRef.current = true;

    const processForNugget = async () => {
      if (!nuggetEffectActiveRef.current) return;
      if (!nuggetNotes.isRecording || !nuggetNotes.isEnabled) return;

      const finalSegments = segments.filter((s) => s.isFinal);
      if (finalSegments.length === 0) return;

      const fullTranscript = finalSegments.map((s) => s.text).join(' ');
      if (fullTranscript === lastNuggetProcessRef.current) return;
      lastNuggetProcessRef.current = fullTranscript;

      if (!nuggetEffectActiveRef.current) return;

      await nuggetNotes.processTranscriptChunk(
        fullTranscript,
        recordingTime,
        lectureType,
        sessionForNotes?.notesPlainText || undefined,
      );
    };

    processForNugget();

    return () => {
      nuggetEffectActiveRef.current = false;
    };
  }, [segments, recordingTime, nuggetNotes, lectureType, sessionForNotes?.notesPlainText]);

  // ─── Recording Controls ─────────────────────────────────────────────────

  const requestRecord = useCallback(() => {
    setShowConsentModal(true);
  }, []);

  const handleRecord = useCallback(async () => {
    try {
      const course = selectedCourse && selectedCourse !== 'none' ? selectedCourse : '';
      const defaultTitle = course
        ? `${course} - ${new Date().toLocaleString()}`
        : `Recording ${new Date().toLocaleString()}`;
      const sessionId = await createSession({
        title: sessionTitle.trim() || defaultTitle,
        lectureType,
        course: course || undefined,
      });

      setCurrentSessionId(sessionId);

      // Start crash recovery session (fire-and-forget)
      startRecoverySession(sessionId).catch(console.warn);

      // Clear previous state
      resetTranscription();
      nuggetNotes.clearNotes();
      nuggetNotes.startRecording();
      lastNuggetProcessRef.current = '';
      lastSavedTranscriptRef.current = '';

      await startRecording();

      // Get the media stream (small delay for readiness)
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stream = getStream();

      if (!stream) {
        throw new Error('Failed to get media stream from audio recorder');
      }

      await startTranscription(stream);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [
    selectedCourse,
    sessionTitle,
    lectureType,
    createSession,
    setCurrentSessionId,
    resetTranscription,
    nuggetNotes,
    startRecording,
    getStream,
    startTranscription,
  ]);

  const handleStop = useCallback(async () => {
    stopRecording();
    await stopTranscription();

    const finalTranscript = getFullTranscript();
    await nuggetNotes.stopRecording(finalTranscript);

    if (currentSessionIdRef.current) {
      await updateSession({
        id: currentSessionIdRef.current,
        duration: recordingTime * 1000,
        transcript: getFullTranscript(),
        transcriptSegments: segments,
        nuggetNotes: nuggetNotes.getLatestNotes().map((n) => ({
          text: n.text,
          recordingTime: n.recordingTime,
        })),
      });
    }

    // Log study time
    const durationMinutes = Math.round(recordingTime / 60);
    if (durationMinutes > 0) {
      try {
        const result = await logStudyTime({
          durationMinutes,
          sessionHour: new Date().getHours(),
        });

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

    // Clean up refs
    lastSavedTranscriptRef.current = '';
    lastNuggetProcessRef.current = '';

    // Reset title for next recording
    setSessionTitle('');
    resetRecorder();
  }, [
    stopRecording,
    stopTranscription,
    getFullTranscript,
    nuggetNotes,
    updateSession,
    recordingTime,
    segments,
    logStudyTime,
    setSessionTitle,
    resetRecorder,
  ]);

  const handlePauseResume = useCallback(() => {
    togglePause();
  }, [togglePause]);

  // ─── Context Value ──────────────────────────────────────────────────────

  const value: RecordingContextValue = {
    isRecording,
    isPaused,
    recordingTime,
    audioLevel,
    currentSessionId,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    lectureType,
    setLectureType,
    selectedCourse,
    setSelectedCourse,
    sessionTitle,
    setSessionTitle,
    courses,
    segments,
    transcriptionError,
    nuggetNotes,
    handleRecord,
    handleStop,
    handlePauseResume,
    showConsentModal,
    setShowConsentModal,
    requestRecord,
  };

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRecordingContext(): RecordingContextValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) {
    throw new Error('useRecordingContext must be used within a RecordingProvider');
  }
  return ctx;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** useState + ref in sync, so callbacks always have the latest value via ref */
function useStateWithRef<T>(initial: T, ref: React.MutableRefObject<T>): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initial);
  const set = useCallback(
    (value: T) => {
      ref.current = value;
      setState(value);
    },
    [ref],
  );
  return [state, set];
}

/** Simple useState wrapper for consistency */
function useSimpleState<T>(initial: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(initial);
  const set = useCallback((value: T) => setState(value), []);
  return [state, set];
}

/** Query session data for nugget notes context */
function useSessionQuery(sessionId: Id<'sessions'> | null) {
  return useSession(sessionId);
}
