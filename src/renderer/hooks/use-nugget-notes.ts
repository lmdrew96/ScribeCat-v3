/**
 * useNuggetNotes - React hook for real-time AI note generation.
 * Orchestrates three server calls — context extraction, note generation, and
 * transcript scrubbing — all on the callClaude default model (convex/config.ts).
 * Lecture-type-aware for context-specific note generation.
 */

import { buildUnprocessedWindows } from '@/lib/nugget-windows';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { LectureType } from '../components/lecture-type-select';

// Types
export interface LectureContext {
  themes: string[];
  currentTopic: string;
  definitions: string[];
  structureHint: string;
}

export interface NuggetNote {
  id: string;
  text: string;
  timestamp: number;
  recordingTime: number;
}

/** A note removed by the user, kept so the dismissal can be undone in place. */
export interface DismissedNote {
  note: NuggetNote;
  index: number;
}

/**
 * Outcome of one generation attempt. Distinguishes "the model had nothing new
 * to say" (a valid, expected result) from "the request failed" — the old
 * `NuggetNote[]` return collapsed both into an empty array, which is why
 * failures were invisible.
 */
type GenerateNotesResult =
  | { ok: true; notes: NuggetNote[] }
  | { ok: false; aborted: boolean; message: string };

interface UseNuggetNotesConfig {
  /** Minimum words before generating notes (default: 30) */
  minWordsForNotes?: number;
  /** Minimum interval between note generations in ms (see DEFAULT_CONFIG) */
  noteIntervalMs?: number;
  /** Minimum words before updating context (default: 200) */
  minWordsForContext?: number;
  /** Minimum interval between context updates in ms (default: 120000 = 2 min) */
  contextIntervalMs?: number;
  /** Minimum words before scrubbing transcript (default: 150) */
  minWordsForScrub?: number;
  /** Minimum interval between scrub passes in ms (default: 120000 = 2 min) */
  scrubIntervalMs?: number;
  /** Convex URL for API calls */
  convexUrl?: string;
  /** Initial enabled state from user settings (default: true) */
  initialEnabled?: boolean;
  /** Called when a scrub pass completes with the full stitched transcript and the
   *  boundary timestamp (ms since recording start, matching segment.timestamp units).
   *  Segments with timestamp > boundary are NOT yet represented in scrubbedTranscript
   *  and should be appended as the live tail. */
  onScrubComplete?: (scrubbedTranscript: string, boundary: number) => void;
}

const DEFAULT_CONFIG: Required<Omit<UseNuggetNotesConfig, 'onScrubComplete'>> = {
  minWordsForNotes: 60,
  noteIntervalMs: 90000,
  minWordsForContext: 200,
  contextIntervalMs: 120000,
  minWordsForScrub: 150,
  scrubIntervalMs: 120000,
  convexUrl: import.meta.env.VITE_CONVEX_URL || '',
  initialEnabled: true,
};

const EMPTY_CONTEXT: LectureContext = {
  themes: [],
  currentTopic: '',
  definitions: [],
  structureHint: '',
};

export interface UseNuggetNotesReturn {
  notes: NuggetNote[];
  context: LectureContext;
  /** Message from the most recent failed generation, or null while healthy. */
  noteError: string | null;
  isEnabled: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isScrubbing: boolean;
  lastScrubAt: number | null;
  /** The full transcript with all completed scrub passes applied. Empty until first scrub. */
  scrubbedText: string;
  /** Ms since recording start, captured at the start of the most recent scrub.
   *  Same units as segment.timestamp — segments with timestamp > this value have
   *  NOT been folded into scrubbedText yet and must render as the live raw tail. */
  scrubBoundaryAt: number;
  setEnabled: (enabled: boolean) => void;
  startRecording: () => void;
  stopRecording: (finalTranscript?: string) => Promise<void>;
  processTranscriptChunk: (
    transcript: string,
    durationSeconds: number,
    lectureType?: LectureType,
    userNotes?: string,
  ) => Promise<void>;
  clearNotes: () => void;
  /**
   * Drops a note. It leaves the panel, the dedup context sent to the model, the
   * chat payload, and what gets persisted — all of which read the same array.
   */
  dismissNote: (id: string) => DismissedNote | null;
  /** Puts a dismissed note back at the position it came from. */
  restoreNote: (dismissed: DismissedNote) => void;
  /** Get the latest notes synchronously (bypasses React state batching) */
  getLatestNotes: () => NuggetNote[];
}

const SCRUB_WINDOW_WORDS = 800;

/** Most windows one live cycle will generate from, bounding API calls on a backlog. */
const LIVE_MAX_WINDOWS = 3;

/** Consecutive failed generations before we tell the user something is wrong. */
const NOTE_FAILURE_TOAST_THRESHOLD = 2;

export function useNuggetNotes(config?: UseNuggetNotesConfig): UseNuggetNotesReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Keep onScrubComplete in a ref so it's always current without being a useCallback dep
  const onScrubCompleteRef = useRef(config?.onScrubComplete);
  onScrubCompleteRef.current = config?.onScrubComplete;

  // State
  const [notes, setNotes] = useState<NuggetNote[]>([]);
  const [context, setContext] = useState<LectureContext>(EMPTY_CONTEXT);
  const [isEnabled, setIsEnabled] = useState(cfg.initialEnabled);
  useEffect(() => {
    setIsEnabled(cfg.initialEnabled);
  }, [cfg.initialEnabled]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [lastScrubAt, setLastScrubAt] = useState<number | null>(null);
  const [scrubbedText, setScrubbedText] = useState<string>('');
  const [scrubBoundaryAt, setScrubBoundaryAt] = useState<number>(0);

  // Refs mirroring scrubbed text so scrubTranscriptWindow can read latest values
  // without becoming a new useCallback identity on every scrub.
  const scrubbedTextRef = useRef<string>('');
  scrubbedTextRef.current = scrubbedText;
  // Length of the raw transcript (as-passed-into-the-hook) at the moment of the last
  // successful scrub. Used to compute the "new raw tail since last scrub" so each
  // iteration's scrub input is `prior scrubbed text + new raw tail`, not raw all the way.
  const lastScrubbedRawLengthRef = useRef<number>(0);

  // Synchronous ref for latest notes (React state is async, so this
  // ensures callers can read the up-to-date list immediately after stopRecording)
  const notesRef = useRef<NuggetNote[]>([]);

  // Refs for tracking timing/buffering
  const transcriptBufferRef = useRef('');
  const lastNoteTimeRef = useRef(0);
  const lastContextTimeRef = useRef(0);
  const lastScrubTimeRef = useRef(0);
  const wordsSinceNoteRef = useRef(0);
  const wordsSinceContextRef = useRef(0);
  const wordsSinceScrubRef = useRef(0);
  const recordingStartTimeRef = useRef(0);
  const noteCounterRef = useRef(0);

  // Consecutive non-abort generation failures. Drives the one-shot toast, and
  // resets the moment a generation succeeds.
  const noteFailureCountRef = useRef(0);

  // AbortController for canceling pending fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRecordingRef = useRef(false);

  // Max buffer size to prevent unbounded growth (approximately 10k words)
  const MAX_BUFFER_SIZE = 50000;

  // Get the API base URL
  const getApiUrl = useCallback(
    (endpoint: string) => {
      // Convert Convex URL to HTTP endpoint
      // e.g., https://xxx.convex.cloud -> https://xxx.convex.site/endpoint
      const baseUrl = cfg.convexUrl.replace('.convex.cloud', '.convex.site');
      return `${baseUrl}/${endpoint}`;
    },
    [cfg.convexUrl],
  );

  // Call Haiku for context extraction
  const updateContext = useCallback(
    async (
      transcript: string,
      lectureType?: LectureType,
      userNotes?: string,
    ): Promise<LectureContext> => {
      // Don't start new requests if not recording
      if (!isRecordingRef.current) return context;

      // Cancel any pending request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(getApiUrl('lectureContext'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            previousContext: context,
            lectureType: lectureType || 'general',
            userNotes,
          }),
          signal: controller.signal,
        });

        // Check if we're still recording after await
        if (!isRecordingRef.current) return context;

        const data = await response.json();

        if (data.success && data.context) {
          setContext(data.context);
          lastContextTimeRef.current = Date.now();
          wordsSinceContextRef.current = 0;
          console.log('📚 Context updated:', data.context.currentTopic);
          return data.context;
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return context;
        console.warn('⚠️ Failed to update context:', error);
      }
      return context;
    },
    [context, getApiUrl],
  );

  // Call Haiku for note generation
  const generateNotes = useCallback(
    async (
      transcript: string,
      currentContext: LectureContext,
      recordingTimeSeconds: number,
      lectureType?: LectureType,
      userNotes?: string,
    ): Promise<GenerateNotesResult> => {
      // Don't start new requests if not recording
      if (!isRecordingRef.current) return { ok: false, aborted: true, message: 'not recording' };

      // Cancel any pending request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Pass the last 8 note texts so Claude avoids redundancy
      const recentNoteTexts = notesRef.current.slice(-8).map((n) => n.text);

      try {
        const response = await fetch(getApiUrl('nuggetNotes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            context: currentContext,
            recordingTimeSeconds,
            lectureType: lectureType || 'general',
            userNotes,
            recentNoteTexts,
          }),
          signal: controller.signal,
        });

        // Check if we're still recording after await
        if (!isRecordingRef.current) return { ok: false, aborted: true, message: 'not recording' };

        const data = await response.json();

        // Mark the attempt regardless of outcome so the interval gate throttles
        // retries too — otherwise a failing endpoint gets hammered every chunk.
        lastNoteTimeRef.current = Date.now();

        if (!data.success) {
          const message =
            typeof data.error === 'string' ? data.error : 'Nugget could not generate notes';
          console.warn('⚠️ Note generation reported failure:', message);
          return { ok: false, aborted: false, message };
        }

        const incoming: NuggetNote[] = Array.isArray(data.notes) ? data.notes : [];

        // Zero notes is a valid outcome — the prompt explicitly tells the model
        // to stay silent on transitional or repetitive segments.
        if (incoming.length === 0) return { ok: true, notes: [] };

        // Add unique IDs with our counter
        const newNotes = incoming.map((note: NuggetNote) => {
          noteCounterRef.current++;
          return {
            ...note,
            id: `note-${Date.now()}-${noteCounterRef.current}`,
          };
        });

        const updated = [...notesRef.current, ...newNotes];
        notesRef.current = updated;
        setNotes(updated);
        console.log(`📝 Generated ${newNotes.length} notes`);
        return { ok: true, notes: newNotes };
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return { ok: false, aborted: true, message: 'aborted' };
        }
        // A thrown fetch (offline, DNS, CORS) never reached the response handler
        // above, so record the attempt here too. Without this the interval gate
        // stays open and every subsequent transcript chunk retries immediately.
        lastNoteTimeRef.current = Date.now();
        console.warn('⚠️ Failed to generate notes:', error);
        return {
          ok: false,
          aborted: false,
          message: error instanceof Error ? error.message : 'Nugget could not generate notes',
        };
      }
    },
    [getApiUrl],
  );

  /**
   * Folds one generation outcome into the user-visible health state.
   *
   * Aborts are deliberate cancellations, not faults, so they never count toward
   * the failure streak. The toast fires exactly once per streak (on the Nth
   * failure) rather than on every failure past the threshold.
   */
  const recordNoteResult = useCallback((result: GenerateNotesResult) => {
    if (result.ok) {
      noteFailureCountRef.current = 0;
      setNoteError((prev) => (prev === null ? prev : null));
      return;
    }
    if (result.aborted) return;

    noteFailureCountRef.current += 1;
    setNoteError(result.message);

    if (noteFailureCountRef.current === NOTE_FAILURE_TOAST_THRESHOLD) {
      toast.error("Nugget's Notes stopped updating", {
        description: 'Your recording and transcript are still saving normally.',
      });
    }
  }, []);

  // Check if we should update context
  const shouldUpdateContext = useCallback(
    (newWords: number): boolean => {
      wordsSinceContextRef.current += newWords;
      const timeSinceUpdate = Date.now() - lastContextTimeRef.current;
      const enoughTime = timeSinceUpdate >= cfg.contextIntervalMs;
      const enoughWords = wordsSinceContextRef.current >= cfg.minWordsForContext;
      return enoughTime && enoughWords;
    },
    [cfg.contextIntervalMs, cfg.minWordsForContext],
  );

  // Check if we should generate notes
  const shouldGenerateNotes = useCallback(
    (newWords: number): boolean => {
      wordsSinceNoteRef.current += newWords;
      const timeSinceGeneration = Date.now() - lastNoteTimeRef.current;
      const enoughTime = timeSinceGeneration >= cfg.noteIntervalMs;
      const enoughWords = wordsSinceNoteRef.current >= cfg.minWordsForNotes;
      return enoughTime && enoughWords;
    },
    [cfg.noteIntervalMs, cfg.minWordsForNotes],
  );

  // Check if we should scrub
  const shouldScrub = useCallback(
    (newWords: number): boolean => {
      wordsSinceScrubRef.current += newWords;
      const timeSinceUpdate = Date.now() - lastScrubTimeRef.current;
      const enoughTime = timeSinceUpdate >= cfg.scrubIntervalMs;
      const enoughWords = wordsSinceScrubRef.current >= cfg.minWordsForScrub;
      return enoughTime && enoughWords;
    },
    [cfg.scrubIntervalMs, cfg.minWordsForScrub],
  );

  // Scrub the last SCRUB_WINDOW_WORDS of transcript, stitch with already-scrubbed prefix,
  // call onScrubComplete. Each iteration uses `priorScrubbedText + newRawTailSinceLastScrub`
  // as input — so successive passes clean older portions instead of leaving them raw forever.
  const scrubTranscriptWindow = useCallback(
    async (fullTranscript: string, currentContext: LectureContext): Promise<void> => {
      if (!isRecordingRef.current) return;

      // Boundary captured at scrub START (not completion) so segments arriving during
      // the network round-trip are properly attributed as "after this scrub" / live tail.
      // Stored as ms-since-recording-start to match segment.timestamp units — comparing
      // against absolute Date.now() would always evaluate false and freeze the live tail.
      const boundary = Date.now() - recordingStartTimeRef.current;

      // Build the input: prior scrubbed text + the new raw tail since the last scrub.
      // First pass (no prior scrubbed text) just uses the raw transcript.
      const priorScrubbed = scrubbedTextRef.current;
      const rawTailSinceLastScrub = fullTranscript.slice(lastScrubbedRawLengthRef.current).trim();
      const combined = priorScrubbed
        ? rawTailSinceLastScrub
          ? `${priorScrubbed} ${rawTailSinceLastScrub}`
          : priorScrubbed
        : fullTranscript;

      const words = combined.trim().split(/\s+/);
      const windowStart = Math.max(0, words.length - SCRUB_WINDOW_WORDS);
      const prefix = words.slice(0, windowStart).join(' ');
      const rawWindow = words.slice(windowStart).join(' ');
      if (!rawWindow.trim()) return;

      setIsScrubbing(true);
      try {
        const response = await fetch(getApiUrl('scrubTranscript'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawWindow, lectureContext: currentContext }),
        });

        if (!isRecordingRef.current) return;

        const data = await response.json();
        if (data.success && data.scrubbedWindow) {
          const stitched =
            windowStart > 0 ? `${prefix} ${data.scrubbedWindow}` : data.scrubbedWindow;
          lastScrubTimeRef.current = Date.now();
          wordsSinceScrubRef.current = 0;
          lastScrubbedRawLengthRef.current = fullTranscript.length;
          setScrubbedText(stitched);
          setScrubBoundaryAt(boundary);
          setLastScrubAt(Date.now());
          onScrubCompleteRef.current?.(stitched, boundary);
          console.log('✨ Transcript window scrubbed');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.warn('⚠️ Failed to scrub transcript:', error);
      } finally {
        setIsScrubbing(false);
      }
    },
    [getApiUrl],
  );

  // Process incoming transcript chunk
  const processTranscriptChunk = useCallback(
    async (
      transcript: string,
      durationSeconds: number,
      lectureType?: LectureType,
      userNotes?: string,
    ): Promise<void> => {
      if (!isEnabled || !isRecording) return;

      // Calculate new chunk
      const newChunk = transcript.slice(transcriptBufferRef.current.length);
      if (!newChunk.trim()) return;

      // Limit buffer size to prevent unbounded growth
      // Keep only the most recent portion if it exceeds max size
      if (transcript.length > MAX_BUFFER_SIZE) {
        transcriptBufferRef.current = transcript.slice(-MAX_BUFFER_SIZE);
      } else {
        transcriptBufferRef.current = transcript;
      }
      const wordCount = newChunk
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      let currentContext = context;

      // Check if we should update context (Haiku - every ~2 min)
      if (shouldUpdateContext(wordCount)) {
        currentContext = await updateContext(transcript, lectureType, userNotes);
      }

      // Check if we should generate notes (see DEFAULT_CONFIG for the cadence)
      if (shouldGenerateNotes(wordCount)) {
        // Size the window from what was actually said since the last generation,
        // not a fixed tail — a fixed tail silently drops the overflow.
        const { windows, consumedWordCount } = buildUnprocessedWindows(
          transcriptBufferRef.current,
          wordsSinceNoteRef.current,
          LIVE_MAX_WINDOWS,
        );

        let allSucceeded = windows.length > 0;
        for (const window of windows) {
          if (!isRecordingRef.current) break;
          const result = await generateNotes(
            window,
            currentContext,
            durationSeconds,
            lectureType,
            userNotes,
          );
          recordNoteResult(result);
          if (!result.ok) {
            allSucceeded = false;
            break;
          }
        }

        // Credit only what actually went out. Words beyond the live cap — and
        // everything after a failure — stay on the counter for the next cycle
        // rather than being dropped.
        if (allSucceeded) {
          wordsSinceNoteRef.current = Math.max(0, wordsSinceNoteRef.current - consumedWordCount);
        }
      }

      // Check if we should scrub transcript (Haiku - every ~2 min, sliding 800-word window)
      if (shouldScrub(wordCount)) {
        await scrubTranscriptWindow(transcript, currentContext);
      }
    },
    [
      isEnabled,
      isRecording,
      context,
      shouldUpdateContext,
      shouldGenerateNotes,
      shouldScrub,
      updateContext,
      generateNotes,
      recordNoteResult,
      scrubTranscriptWindow,
    ],
  );

  // Start recording
  const startRecording = useCallback(() => {
    isRecordingRef.current = true;
    setIsRecording(true);
    setIsScrubbing(false);
    setNoteError(null);
    noteFailureCountRef.current = 0;
    setLastScrubAt(null);
    setScrubbedText('');
    setScrubBoundaryAt(0);
    lastScrubbedRawLengthRef.current = 0;
    recordingStartTimeRef.current = Date.now();
    transcriptBufferRef.current = '';
    lastNoteTimeRef.current = 0;
    lastContextTimeRef.current = 0;
    lastScrubTimeRef.current = 0;
    wordsSinceNoteRef.current = 0;
    wordsSinceContextRef.current = 0;
    wordsSinceScrubRef.current = 0;
    console.log('🎙️ Nugget Notes recording started');
  }, []);

  // Stop recording — process all remaining unprocessed transcript into notes
  const stopRecording = useCallback(
    async (finalTranscript?: string): Promise<void> => {
      if (!isRecording) return;

      console.log('⏹️ Nugget Notes stopping, processing remaining transcript...');

      // Mark as not recording to prevent processTranscriptChunk from firing
      isRecordingRef.current = false;

      // Abort any pending fetch requests
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      // Process all unprocessed transcript content into notes
      const hasUnprocessedWords = wordsSinceNoteRef.current > 0;
      if (finalTranscript && isEnabled && hasUnprocessedWords) {
        setIsProcessing(true);

        // Update buffer with final transcript
        if (finalTranscript.length > MAX_BUFFER_SIZE) {
          transcriptBufferRef.current = finalTranscript.slice(-MAX_BUFFER_SIZE);
        } else {
          transcriptBufferRef.current = finalTranscript;
        }

        const recordingTimeSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;

        // Temporarily re-enable so generateNotes doesn't bail out
        isRecordingRef.current = true;

        // Uncapped — the final flush should drain the whole backlog.
        const { windows } = buildUnprocessedWindows(
          transcriptBufferRef.current,
          wordsSinceNoteRef.current,
        );

        for (const window of windows) {
          if (!isRecordingRef.current) break;
          const result = await generateNotes(window, context, recordingTimeSeconds);
          recordNoteResult(result);
        }

        isRecordingRef.current = false;
        setIsProcessing(false);
      }

      // Clear the buffer to free memory
      transcriptBufferRef.current = '';

      setIsRecording(false);
      console.log('⏹️ Nugget Notes recording stopped');
    },
    [isRecording, isEnabled, context, generateNotes, recordNoteResult],
  );

  /**
   * Drops a note the user judged wrong. Because the dedup context, the chat
   * payload, and the persisted array all read `notesRef`/`notes`, removing it
   * here removes it from every downstream consumer too.
   */
  const dismissNote = useCallback((id: string): DismissedNote | null => {
    const index = notesRef.current.findIndex((n) => n.id === id);
    if (index === -1) return null;

    const note = notesRef.current[index];
    const updated = notesRef.current.filter((n) => n.id !== id);
    notesRef.current = updated;
    setNotes(updated);
    return { note, index };
  }, []);

  /** Reinserts a dismissed note at its original index so undo preserves order. */
  const restoreNote = useCallback(({ note, index }: DismissedNote) => {
    if (notesRef.current.some((n) => n.id === note.id)) return;

    const updated = [...notesRef.current];
    updated.splice(Math.min(index, updated.length), 0, note);
    notesRef.current = updated;
    setNotes(updated);
  }, []);

  // Clear all notes
  const clearNotes = useCallback(() => {
    // Abort any pending fetch requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    notesRef.current = [];
    setNotes([]);
    setContext(EMPTY_CONTEXT);
    setNoteError(null);
    noteFailureCountRef.current = 0;
    setIsScrubbing(false);
    setLastScrubAt(null);
    setScrubbedText('');
    setScrubBoundaryAt(0);
    lastScrubbedRawLengthRef.current = 0;
    transcriptBufferRef.current = '';
    lastNoteTimeRef.current = 0;
    lastContextTimeRef.current = 0;
    lastScrubTimeRef.current = 0;
    wordsSinceNoteRef.current = 0;
    wordsSinceContextRef.current = 0;
    wordsSinceScrubRef.current = 0;
    noteCounterRef.current = 0;
    console.log('🔄 Nugget Notes cleared');
  }, []);

  // Toggle enabled
  const handleSetEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    console.log(`📝 Nugget Notes ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any pending fetch requests
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isRecordingRef.current = false;

      // Clear the buffer to free memory
      transcriptBufferRef.current = '';

      console.log('🧹 Nugget Notes cleanup complete');
    };
  }, []);

  return {
    notes,
    context,
    noteError,
    isEnabled,
    isRecording,
    isProcessing,
    isScrubbing,
    lastScrubAt,
    scrubbedText,
    scrubBoundaryAt,
    setEnabled: handleSetEnabled,
    startRecording,
    stopRecording,
    processTranscriptChunk,
    clearNotes,
    dismissNote,
    restoreNote,
    getLatestNotes: useCallback(() => notesRef.current, []),
  };
}
