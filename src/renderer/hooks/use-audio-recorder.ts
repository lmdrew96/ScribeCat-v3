import { keepAudioContextAwake } from '@/lib/audio-context-keepalive';
import {
  type RecordingClock,
  createRecordingClock,
  elapsedSeconds,
  pauseClock,
  resumeClock,
  startClock,
} from '@/lib/recording-clock';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface UseAudioRecorderOptions {
  /** Called for every chunk with (chunk, absoluteIndex) — use for IndexedDB recovery save. */
  onChunkAvailable?: (chunk: Blob, index: number) => void;
  onError?: (error: Error) => void;
}

/** Snapshot of chunks waiting to be uploaded. */
export interface PendingChunks {
  blob: Blob;
  /** How many chunks the blob contains. Pass this to markChunksUploaded. */
  count: number;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // In-memory buffer of un-uploaded chunks. Shifts as chunks are uploaded,
  // so memory stays bounded for long recordings.
  const chunksRef = useRef<Blob[]>([]);
  // Monotonic per-session counter so IndexedDB records have stable indices
  // even after in-memory chunks are shifted away.
  const chunkIndexCounterRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Wall-clock bookkeeping for the elapsed-time display. See lib/recording-clock.
  const clockRef = useRef<RecordingClock>(createRecordingClock());
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const releaseAudioKeepaliveRef = useRef<(() => void) | null>(null);

  // Track recording state with ref to avoid stale closure in cleanup
  const isRecordingRef = useRef(false);

  // Stable ref for options to avoid re-running effects on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Push the current elapsed time to state. Called on each tick and whenever
   * the tab becomes visible again, so a throttled timer snaps back to the
   * true value immediately instead of catching up a second at a time.
   */
  const syncRecordingTime = useCallback(() => {
    setRecordingTime(elapsedSeconds(clockRef.current, Date.now()));
  }, []);

  /**
   * Current elapsed seconds straight from the clock, bypassing React state.
   * Callers that persist a duration (session length, study-time XP) should
   * use this rather than the `recordingTime` state, which can lag behind by
   * however long the browser throttled our tick.
   */
  const getElapsedSeconds = useCallback(() => elapsedSeconds(clockRef.current, Date.now()), []);

  /**
   * Load available audio input devices
   */
  const loadDevices = useCallback(async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceInfos
        .filter((device) => device.kind === 'audioinput' && device.deviceId !== '')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
        }));
      setDevices(audioInputs);
    } catch (error) {
      console.error('Error loading audio devices:', error);
      optionsRef.current?.onError?.(error as Error);
    }
  }, []);

  /**
   * Update audio level visualization. Bails when the tab is hidden — no UI is
   * reading audioLevel in that case, so the analyser sample is wasted CPU.
   * The visibilitychange effect below restarts the loop when the tab is
   * visible again.
   */
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    if (document.hidden) {
      animationFrameRef.current = undefined;
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  /**
   * Disconnect audio processing graph, stop stream tracks, and close context.
   * Does NOT touch chunksRef — callers may still need it for upload.
   */
  const cleanupAudioGraph = useCallback(() => {
    releaseAudioKeepaliveRef.current?.();
    releaseAudioKeepaliveRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
      sourceNodeRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        /* ignore */
      });
      audioContextRef.current = null;
    }

    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    if (timerIntervalRef.current !== undefined) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = undefined;
    }
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      // On iPadOS 17+ / iOS 17+ Safari, declare this as a recording session so
      // the OS doesn't auto-interrupt the AudioContext when the user enters
      // Split View / Stage Manager. No-op everywhere else.
      try {
        const audioSession = (navigator as Navigator & { audioSession?: { type: string } })
          .audioSession;
        if (audioSession) {
          audioSession.type = 'play-and-record';
        }
      } catch {
        /* feature-detect failure is fine — older browsers just lack the API */
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId === 'default' ? undefined : { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Permission was just granted — populate the device list so the selector
      // shows proper labels. Safe to call enumerateDevices now.
      await loadDevices();

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Keep the analyser context alive across visibility changes — an
      // occluded Safari window or an iPadOS Split View transition otherwise
      // suspends it and freezes the level meter for the rest of the session.
      releaseAudioKeepaliveRef.current?.();
      releaseAudioKeepaliveRef.current = keepAudioContextAwake(
        audioContext,
        () => isRecordingRef.current && audioContextRef.current === audioContext,
        'visualization',
      );

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];
      chunkIndexCounterRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          const absoluteIndex = chunkIndexCounterRef.current++;
          optionsRef.current?.onChunkAvailable?.(event.data, absoluteIndex);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        optionsRef.current?.onError?.(new Error('Recording error'));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Start timer
      clockRef.current = startClock(Date.now());
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(syncRecordingTime, 1000);

      // Start audio level monitoring
      updateAudioLevel();

      isRecordingRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      optionsRef.current?.onError?.(error as Error);
    }
  }, [selectedDeviceId, updateAudioLevel, loadDevices, syncRecordingTime]);

  /**
   * Stop recording. Resolves after `onstop` fires and any final buffered
   * data has been pushed into chunksRef — callers can then read pending
   * chunks via getUnuploadedChunks() to upload the remainder.
   */
  const stopRecording = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      isRecordingRef.current = false;

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupAudioGraph();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        setAudioLevel(0);
        console.log('🧹 Audio recorder cleanup complete');
        resolve();
        return;
      }

      // Hook onstop — fires after any final `ondataavailable` has flushed,
      // so chunksRef is guaranteed up-to-date when we resolve.
      recorder.onstop = () => {
        cleanupAudioGraph();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        setAudioLevel(0);
        console.log('🧹 Audio recorder cleanup complete');
        resolve();
      };

      try {
        recorder.stop();
      } catch (err) {
        console.warn('MediaRecorder.stop() threw:', err);
        cleanupAudioGraph();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        setAudioLevel(0);
        resolve();
      }
    });
  }, [cleanupAudioGraph]);

  /**
   * Pause/Resume recording
   */
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      // Resume — bank the duration of the pause we're ending, then let the
      // clock run again from the current wall-clock time.
      mediaRecorderRef.current.resume();
      clockRef.current = resumeClock(clockRef.current, Date.now());
      syncRecordingTime();
      updateAudioLevel();
      setIsPaused(false);
    } else {
      // Pause — freeze the clock at this instant so the display holds steady
      // while the tick keeps running.
      mediaRecorderRef.current.pause();
      clockRef.current = pauseClock(clockRef.current, Date.now());
      syncRecordingTime();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      setAudioLevel(0);
      setIsPaused(true);
    }
  }, [isPaused, updateAudioLevel, syncRecordingTime]);

  /**
   * Reset recording state (timer + in-memory chunk buffer).
   * Call after a successful full stop-and-upload cycle.
   */
  const reset = useCallback(() => {
    setRecordingTime(0);
    clockRef.current = createRecordingClock();
    chunksRef.current = [];
    chunkIndexCounterRef.current = 0;
  }, []);

  /**
   * Snapshot of chunks currently in-memory waiting to be uploaded.
   * Returns null if nothing pending.
   */
  const getUnuploadedChunks = useCallback((): PendingChunks | null => {
    const count = chunksRef.current.length;
    if (count === 0) return null;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    return { blob, count };
  }, []);

  /**
   * Mark the first `count` chunks as uploaded and drop them from memory.
   * Use the count returned by getUnuploadedChunks — captured at snapshot
   * time, so any chunks that arrived during the upload are preserved.
   */
  const markChunksUploaded = useCallback((count: number) => {
    chunksRef.current = chunksRef.current.slice(count);
  }, []);

  /**
   * Load devices only if permission was already granted.
   * Don't request permission on mount — only on explicit startRecording().
   */
  useEffect(() => {
    let cancelled = false;

    async function checkPermissionAndLoadDevices() {
      try {
        // Check if permission was already granted (non-intrusive)
        const permissionStatus = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        if (permissionStatus.state === 'granted') {
          // Permission already granted, safe to load devices
          if (!cancelled) {
            await loadDevices();
          }
        }
        // If 'denied' or 'prompt', don't do anything — let startRecording() request permission
      } catch (error) {
        // Permissions API may not be supported, try loading devices anyway
        console.debug('Permissions API not available, loading devices on demand');
      }
    }

    checkPermissionAndLoadDevices();

    return () => {
      cancelled = true;
    };
  }, [loadDevices]);

  /**
   * Listen for device changes (e.g. plugging in a new mic)
   */
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [loadDevices]);

  /**
   * On returning to the tab: snap the timer back to the true elapsed value
   * (Safari throttles our 1s tick to a crawl while the window is occluded)
   * and restart the audio level rAF loop if we're actively recording (and
   * not paused) and the loop has bailed.
   */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;

      if (isRecordingRef.current) {
        syncRecordingTime();
      }

      if (
        isRecordingRef.current &&
        !isPaused &&
        analyserRef.current &&
        animationFrameRef.current === undefined
      ) {
        updateAudioLevel();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isPaused, updateAudioLevel, syncRecordingTime]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      releaseAudioKeepaliveRef.current?.();
      releaseAudioKeepaliveRef.current = null;

      // Use ref to check recording state to avoid stale closure
      if (isRecordingRef.current || mediaRecorderRef.current || audioContextRef.current) {
        isRecordingRef.current = false;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            /* ignore */
          }
        }
        mediaRecorderRef.current = null;

        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) {
            track.stop();
          }
          streamRef.current = null;
        }

        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect();
          } catch {
            /* ignore */
          }
          sourceNodeRef.current = null;
        }

        if (analyserRef.current) {
          try {
            analyserRef.current.disconnect();
          } catch {
            /* ignore */
          }
          analyserRef.current = null;
        }

        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {
            /* ignore */
          });
          audioContextRef.current = null;
        }

        if (animationFrameRef.current !== undefined) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }

        if (timerIntervalRef.current !== undefined) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = undefined;
        }

        // Don't clear chunks — onstop may still fire and the recovery
        // flow may need them for retry.
      }
    };
  }, []);

  /**
   * Get the current media stream (for sharing with other hooks like transcription)
   */
  const getStream = useCallback(() => {
    return streamRef.current;
  }, []);

  return {
    isRecording,
    isPaused,
    devices,
    selectedDeviceId,
    audioLevel,
    recordingTime,
    getElapsedSeconds,
    startRecording,
    stopRecording,
    togglePause,
    setSelectedDeviceId,
    reset,
    getStream,
    getUnuploadedChunks,
    markChunksUploaded,
  };
}
