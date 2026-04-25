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
import {
  clearChunksUpTo,
  clearRecoveryData,
  saveAudioChunk,
  startRecoverySession,
} from '@/lib/audio-recovery';
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
  /** True while the final post-stop audio chunk is being flushed to Convex. */
  isSavingAudio: boolean;
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
  const appendAudioChunk = useMutation(api.sessions.appendAudioChunk);

  // Session state
  const currentSessionIdRef = useRef<Id<'sessions'> | null>(null);
  // We need a state version too for reactivity
  const [currentSessionId, setCurrentSessionId] = useStateWithRef<Id<'sessions'> | null>(
    null,
    currentSessionIdRef,
  );

  // Consent modal
  const [showConsentModal, setShowConsentModal] = useState(false);

  // True while the post-stop audio flush is still in flight.
  const [isSavingAudio, setIsSavingAudio] = useState(false);

  // Monotonic count of chunks successfully uploaded so far this session.
  // Used as the exclusive upper bound when clearing IndexedDB after a
  // successful periodic upload.
  const uploadedChunkCountRef = useRef(0);

  // Promise for the periodic uploader's in-flight request, if any.
  // handleStop awaits this before snapshotting the final unuploaded
  // chunks, so the two can't race on overlapping chunk ranges.
  const activeUploadRef = useRef<Promise<void> | null>(null);

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

  // Scrub state mirrored as refs so both the segment-save effect and the stop flow
  // can build `scrubbedPrefix + post-boundary tail` without depending on hook state
  // (which would re-run effects and risk losing latest values during stop).
  const scrubbedTextRef = useRef<string>('');
  const scrubBoundaryAtRef = useRef<number>(0);
  // Bumped after each scrub completes so the segment-save effect re-runs and
  // immediately writes the freshly-scrubbed prefix to the DB.
  const [scrubVersion, setScrubVersion] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Nugget Notes hook ──────────────────────────────────────────────────

  const handleScrubComplete = useCallback(
    (scrubbedTranscript: string, boundary: number) => {
      // Update refs synchronously. The segment-save effect picks up the new prefix
      // on its next run (triggered by either new segments OR the bumped scrubVersion)
      // and writes `scrubbedPrefix + tail` — avoiding the prior race where this
      // effect-driven save fought a separate segment-effect save.
      scrubbedTextRef.current = scrubbedTranscript;
      scrubBoundaryAtRef.current = boundary;
      setScrubVersion((v) => v + 1);
    },
    [],
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
    getUnuploadedChunks,
    markChunksUploaded,
  } = useAudioRecorder({
    onChunkAvailable: (chunk, index) => {
      // Fire-and-forget: save chunk to IndexedDB for crash recovery.
      // The progressive uploader clears chunks below uploadedChunkCountRef
      // after each successful periodic upload, so IDB only holds the
      // "since last upload" tail.
      const sessionId = currentSessionIdRef.current;
      if (sessionId) {
        saveAudioChunk(sessionId, chunk, index).catch(() => {
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
  // Single writer for `session.transcript`. Builds the saved string as
  // `scrubbedPrefix + tail-segments-after-boundary` whenever a scrub has
  // produced cleaned text; otherwise falls back to raw concat. Re-runs on
  // both new segments AND scrubVersion bumps, so a fresh scrub flushes to
  // the DB immediately. Replaces the prior race where this effect's raw
  // write would clobber a separate scrub-driven write within milliseconds.
  useEffect(() => {
    const saveTranscript = async () => {
      if (!currentSessionIdRef.current) return;
      if (segments.length === 0 && !scrubbedTextRef.current) return;

      const finalSegments = segments.filter((s) => s.isFinal);
      const scrubbedPrefix = scrubbedTextRef.current;
      const boundary = scrubBoundaryAtRef.current;

      let fullTranscript: string;
      if (scrubbedPrefix) {
        const tailText = finalSegments
          .filter((s) => s.timestamp > boundary)
          .map((s) => s.text)
          .join(' ');
        fullTranscript = tailText ? `${scrubbedPrefix} ${tailText}` : scrubbedPrefix;
      } else {
        if (finalSegments.length === 0) return;
        fullTranscript = finalSegments.map((s) => s.text).join(' ');
      }

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
  }, [segments, scrubVersion, updateSession]);

  // ─── Progressive audio upload effect ────────────────────────────────────
  // Every ~30s during recording, flush any accumulated audio chunks to
  // Convex storage as a separate file and append the storageId to the
  // session's audioStorageIds array. This keeps the "upload at stop" cost
  // near-zero even for multi-hour sessions, and means the recovery flow
  // only ever needs to ship the last ~30s when a crash happens.

  useEffect(() => {
    if (!isRecording || !currentSessionIdRef.current) return;

    const UPLOAD_INTERVAL_MS = 30_000; // 30s — matches notes periodic save cadence
    const MIN_UPLOAD_SIZE = 50_000; // skip sub-50KB flushes to avoid churn

    const interval = setInterval(() => {
      // Skip this tick if a previous upload is still in flight — prevents
      // overlapping snapshots of chunksRef and duplicate appendAudioChunk calls.
      if (activeUploadRef.current) return;

      const sessionId = currentSessionIdRef.current;
      if (!sessionId) return;

      const pending = getUnuploadedChunks();
      if (!pending || pending.blob.size < MIN_UPLOAD_SIZE) return;

      const newTotal = uploadedChunkCountRef.current + pending.count;

      const uploadPromise = (async () => {
        try {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': pending.blob.type || 'audio/webm' },
            body: pending.blob,
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(
              `Upload failed (${res.status} ${res.statusText}): ${
                body.slice(0, 200) || 'no response body'
              }`,
            );
          }
          const { storageId } = (await res.json()) as { storageId?: string };
          if (!storageId) throw new Error('Upload response missing storageId');

          await appendAudioChunk({ id: sessionId, storageId });
          markChunksUploaded(pending.count);
          uploadedChunkCountRef.current = newTotal;
          // Drop now-persisted chunks from IndexedDB so recovery only ever
          // has to upload the tail after the most recent successful flush.
          clearChunksUpTo(sessionId, newTotal).catch(() => {});
        } catch (err) {
          // Leave chunks in place — they'll be retried on the next tick, and
          // the final flush in handleStop covers anything still pending.
          console.warn('Periodic audio upload failed (will retry):', err);
        }
      })();

      activeUploadRef.current = uploadPromise;
      uploadPromise.finally(() => {
        if (activeUploadRef.current === uploadPromise) {
          activeUploadRef.current = null;
        }
      });
    }, UPLOAD_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRecording, generateUploadUrl, appendAudioChunk, getUnuploadedChunks, markChunksUploaded]);

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
      uploadedChunkCountRef.current = 0;
      resetTranscription();
      nuggetNotes.clearNotes();
      nuggetNotes.startRecording();
      lastNuggetProcessRef.current = '';
      lastSavedTranscriptRef.current = '';
      scrubbedTextRef.current = '';
      scrubBoundaryAtRef.current = 0;

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
    const capturedSessionId = currentSessionIdRef.current;
    const capturedRecordingTime = recordingTime;

    setIsSavingAudio(true);

    // Stop the recorder and wait for `onstop` to flush remaining data into
    // chunksRef. Any final partial-second of audio is now in the in-memory
    // buffer and in IndexedDB.
    await stopRecording();
    await stopTranscription();

    // If the periodic uploader has an in-flight request, wait for it to
    // finish before we snapshot the final unuploaded chunks — otherwise
    // the two would race and could both upload overlapping ranges.
    if (activeUploadRef.current) {
      try {
        await activeUploadRef.current;
      } catch {
        /* error already logged inside the upload */
      }
    }

    // Prefer the scrubbed prefix + post-boundary tail for the final saved transcript,
    // so a long recording that completed scrub passes is saved as cleaned text — not
    // overwritten by the raw segment concat.
    const scrubbedPrefix = scrubbedTextRef.current;
    const boundary = scrubBoundaryAtRef.current;
    const finalTranscript = scrubbedPrefix
      ? (() => {
          const tailText = segments
            .filter((s) => s.isFinal && s.timestamp > boundary)
            .map((s) => s.text)
            .join(' ');
          return tailText ? `${scrubbedPrefix} ${tailText}` : scrubbedPrefix;
        })()
      : getFullTranscript();

    // Flush any chunks that arrived since the last periodic upload.
    // Typically small (<30s of audio, < 2 MB) so this completes quickly.
    let finalUploadSucceeded = true;
    if (capturedSessionId) {
      const pending = getUnuploadedChunks();
      if (pending) {
        const newTotal = uploadedChunkCountRef.current + pending.count;
        try {
          const uploadUrl = await generateUploadUrl();
          const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': pending.blob.type || 'audio/webm' },
            body: pending.blob,
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(
              `Upload failed (${res.status} ${res.statusText}): ${
                body.slice(0, 200) || 'no response body'
              }`,
            );
          }
          const { storageId } = (await res.json()) as { storageId?: string };
          if (!storageId) throw new Error('Upload response missing storageId');

          await appendAudioChunk({ id: capturedSessionId, storageId });
          markChunksUploaded(pending.count);
          uploadedChunkCountRef.current = newTotal;
        } catch (err) {
          console.error('Final audio chunk upload failed:', err);
          const message = err instanceof Error ? err.message : String(err);
          toast.error('Audio save failed', {
            description: `${message}. Refresh the page — the "Recover Audio" banner will let you retry.`,
            duration: 15000,
          });
          finalUploadSucceeded = false;
        }
      }
    }

    // Clear IndexedDB recovery data only if the full upload chain succeeded.
    // If the final chunk failed, leave the IDB state so the recovery banner
    // can retry the tail on next load.
    if (finalUploadSucceeded && capturedSessionId) {
      clearRecoveryData(capturedSessionId).catch(console.warn);
    }

    // Save session metadata.
    if (capturedSessionId) {
      try {
        await updateSession({
          id: capturedSessionId,
          duration: capturedRecordingTime * 1000,
          transcript: finalTranscript,
          transcriptSegments: segments,
          nuggetNotes: nuggetNotes.getLatestNotes().map((n) => ({
            text: n.text,
            recordingTime: n.recordingTime,
          })),
        });
      } catch (error) {
        console.error('Error saving final session metadata:', error);
      }
    }

    // Log study time + achievements.
    const durationMinutes = Math.round(capturedRecordingTime / 60);
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
    uploadedChunkCountRef.current = 0;
    scrubbedTextRef.current = '';
    scrubBoundaryAtRef.current = 0;

    // Reset title for next recording
    setSessionTitle('');
    resetRecorder();
    setIsSavingAudio(false);

    // Nugget Notes catch-up runs in the background so it doesn't hold up
    // handleStop. When it finishes we persist any new tail-notes, since
    // the 30s periodic save interval has already stopped.
    if (capturedSessionId) {
      const beforeCount = nuggetNotes.getLatestNotes().length;
      nuggetNotes
        .stopRecording(finalTranscript)
        .then(async () => {
          const afterNotes = nuggetNotes.getLatestNotes();
          if (afterNotes.length > beforeCount) {
            try {
              await updateSession({
                id: capturedSessionId,
                nuggetNotes: afterNotes.map((n) => ({
                  text: n.text,
                  recordingTime: n.recordingTime,
                })),
              });
            } catch (err) {
              console.warn('Failed to save final Nugget tail-notes:', err);
            }
          }
        })
        .catch((err) => console.warn('Nugget catch-up failed:', err));
    }
  }, [
    stopRecording,
    stopTranscription,
    getFullTranscript,
    getUnuploadedChunks,
    markChunksUploaded,
    generateUploadUrl,
    appendAudioChunk,
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
    isSavingAudio,
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
