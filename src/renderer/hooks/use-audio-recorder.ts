import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface UseAudioRecorderOptions {
  onDataAvailable?: (data: Blob) => void;
  onError?: (error: Error) => void;
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
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Track recording state with ref to avoid stale closure in cleanup
  const isRecordingRef = useRef(false);

  /**
   * Load available audio input devices
   */
  const loadDevices = useCallback(async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceInfos
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
        }));
      setDevices(audioInputs);
    } catch (error) {
      console.error('Error loading audio devices:', error);
      options?.onError?.(error as Error);
    }
  }, [options]);

  /**
   * Update audio level visualization
   */
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
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

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        options?.onDataAvailable?.(audioBlob);
        chunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        options?.onError?.(new Error('Recording error'));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Start timer
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
        setRecordingTime(Math.floor(elapsed / 1000));
      }, 100);

      // Start audio level monitoring
      updateAudioLevel();

      isRecordingRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      options?.onError?.(error as Error);
    }
  }, [selectedDeviceId, options, updateAudioLevel]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    // Mark as not recording immediately
    isRecordingRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    // Disconnect source node first
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore - may already be disconnected
      }
      sourceNodeRef.current = null;
    }

    // Disconnect analyser
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        // Ignore - may already be disconnected
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

    // Clear chunks to free memory
    chunksRef.current = [];

    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);

    console.log('🧹 Audio recorder cleanup complete');
  }, []);

  /**
   * Pause/Resume recording
   */
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      // Resume
      mediaRecorderRef.current.resume();
      const pauseDuration = Date.now() - (pausedTimeRef.current || 0);
      pausedTimeRef.current += pauseDuration;
      updateAudioLevel();
      setIsPaused(false);
    } else {
      // Pause
      mediaRecorderRef.current.pause();
      pausedTimeRef.current = Date.now();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      setIsPaused(true);
    }
  }, [isPaused, updateAudioLevel]);

  /**
   * Reset recording state
   */
  const reset = useCallback(() => {
    setRecordingTime(0);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  /**
   * Load devices on mount and when permissions change
   */
  useEffect(() => {
    loadDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [loadDevices]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Use ref to check recording state to avoid stale closure
      if (isRecordingRef.current || mediaRecorderRef.current || audioContextRef.current) {
        // Inline cleanup to avoid calling stopRecording() with stale closure
        isRecordingRef.current = false;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
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
          } catch (e) {
            /* ignore */
          }
          sourceNodeRef.current = null;
        }

        if (analyserRef.current) {
          try {
            analyserRef.current.disconnect();
          } catch (e) {
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

        chunksRef.current = [];

        console.log('🧹 Audio recorder unmount cleanup complete');
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
    startRecording,
    stopRecording,
    togglePause,
    setSelectedDeviceId,
    reset,
    getStream,
  };
}
