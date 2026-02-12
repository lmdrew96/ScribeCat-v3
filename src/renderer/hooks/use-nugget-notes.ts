/**
 * useNuggetNotes - React hook for real-time AI note generation
 * Orchestrates the two-model pipeline (Sonnet for context, Haiku for notes)
 * Lecture-type-aware for context-specific note generation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface UseNuggetNotesConfig {
  /** Minimum words before generating notes (default: 30) */
  minWordsForNotes?: number;
  /** Minimum interval between note generations in ms (default: 45000 = 45s) */
  noteIntervalMs?: number;
  /** Minimum words before updating context (default: 200) */
  minWordsForContext?: number;
  /** Minimum interval between context updates in ms (default: 120000 = 2 min) */
  contextIntervalMs?: number;
  /** Convex URL for API calls */
  convexUrl?: string;
}

const DEFAULT_CONFIG: Required<UseNuggetNotesConfig> = {
  minWordsForNotes: 30,
  noteIntervalMs: 45000,
  minWordsForContext: 200,
  contextIntervalMs: 120000,
  convexUrl: import.meta.env.VITE_CONVEX_URL || '',
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
  isEnabled: boolean;
  isRecording: boolean;
  isProcessing: boolean;
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
}

export function useNuggetNotes(config?: UseNuggetNotesConfig): UseNuggetNotesReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // State
  const [notes, setNotes] = useState<NuggetNote[]>([]);
  const [context, setContext] = useState<LectureContext>(EMPTY_CONTEXT);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for tracking timing/buffering
  const transcriptBufferRef = useRef('');
  const lastNoteTimeRef = useRef(0);
  const lastContextTimeRef = useRef(0);
  const wordsSinceNoteRef = useRef(0);
  const wordsSinceContextRef = useRef(0);
  const recordingStartTimeRef = useRef(0);
  const noteCounterRef = useRef(0);

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
    ): Promise<NuggetNote[]> => {
      // Don't start new requests if not recording
      if (!isRecordingRef.current) return [];

      // Cancel any pending request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

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
          }),
          signal: controller.signal,
        });

        // Check if we're still recording after await
        if (!isRecordingRef.current) return [];

        const data = await response.json();

        if (data.success && data.notes && data.notes.length > 0) {
          // Add unique IDs with our counter
          const newNotes = data.notes.map((note: NuggetNote) => {
            noteCounterRef.current++;
            return {
              ...note,
              id: `note-${Date.now()}-${noteCounterRef.current}`,
            };
          });

          setNotes((prev) => [...prev, ...newNotes]);
          lastNoteTimeRef.current = Date.now();
          wordsSinceNoteRef.current = 0;
          console.log(`📝 Generated ${newNotes.length} notes`);
          return newNotes;
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return [];
        console.warn('⚠️ Failed to generate notes:', error);
      }
      return [];
    },
    [getApiUrl],
  );

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

  // Get recent transcript (~100 words) for note generation
  const getRecentTranscript = useCallback((): string => {
    const words = transcriptBufferRef.current.trim().split(/\s+/);
    return words.slice(-100).join(' ');
  }, []);

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

      // Check if we should generate notes (Haiku - every ~45s)
      if (shouldGenerateNotes(wordCount)) {
        const recentTranscript = getRecentTranscript();
        await generateNotes(
          recentTranscript,
          currentContext,
          durationSeconds,
          lectureType,
          userNotes,
        );
      }
    },
    [
      isEnabled,
      isRecording,
      context,
      shouldUpdateContext,
      shouldGenerateNotes,
      updateContext,
      generateNotes,
      getRecentTranscript,
    ],
  );

  // Start recording
  const startRecording = useCallback(() => {
    isRecordingRef.current = true;
    setIsRecording(true);
    recordingStartTimeRef.current = Date.now();
    transcriptBufferRef.current = '';
    lastNoteTimeRef.current = 0;
    lastContextTimeRef.current = 0;
    wordsSinceNoteRef.current = 0;
    wordsSinceContextRef.current = 0;
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

        const words = transcriptBufferRef.current.trim().split(/\s+/);
        const totalWords = words.length;
        const unprocessedWordCount = wordsSinceNoteRef.current;

        // Where unprocessed content starts, with ~20 words of prior context
        const unprocessedStart = Math.max(0, totalWords - unprocessedWordCount);
        const contextStart = Math.max(0, unprocessedStart - 20);

        if (unprocessedWordCount <= 120) {
          // Small enough for a single generation
          const chunk = words.slice(contextStart).join(' ');
          if (chunk.trim()) {
            await generateNotes(chunk, context, recordingTimeSeconds);
          }
        } else {
          // Large amount of unprocessed content — process in overlapping windows
          const CHUNK_SIZE = 100;
          const STEP_SIZE = 80;
          let pos = contextStart;

          while (pos < totalWords && isRecordingRef.current) {
            const endPos = Math.min(pos + CHUNK_SIZE, totalWords);
            const chunk = words.slice(pos, endPos).join(' ');
            if (chunk.trim()) {
              await generateNotes(chunk, context, recordingTimeSeconds);
            }
            // If this chunk reached the end, we're done
            if (endPos >= totalWords) break;
            pos += STEP_SIZE;
          }
        }

        isRecordingRef.current = false;
        setIsProcessing(false);
      }

      // Clear the buffer to free memory
      transcriptBufferRef.current = '';

      setIsRecording(false);
      console.log('⏹️ Nugget Notes recording stopped');
    },
    [isRecording, isEnabled, context, generateNotes],
  );

  // Clear all notes
  const clearNotes = useCallback(() => {
    // Abort any pending fetch requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setNotes([]);
    setContext(EMPTY_CONTEXT);
    transcriptBufferRef.current = '';
    lastNoteTimeRef.current = 0;
    lastContextTimeRef.current = 0;
    wordsSinceNoteRef.current = 0;
    wordsSinceContextRef.current = 0;
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
    isEnabled,
    isRecording,
    isProcessing,
    setEnabled: handleSetEnabled,
    startRecording,
    stopRecording,
    processTranscriptChunk,
    clearNotes,
  };
}
