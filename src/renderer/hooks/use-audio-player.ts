import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAudioPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  /**
   * Update audio level visualization during playback
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
   * Load audio file
   */
  const load = useCallback(
    async (filename: string) => {
      try {
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        // Load audio file from disk
        const result = await window.electronAPI.loadAudio(filename);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to load audio');
        }

        // Create audio element
        const audio = new Audio();
        const blob = new Blob([result.data], { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audio.src = url;

        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          const time = audio.currentTime;
          setCurrentTime(time);
          options?.onTimeUpdate?.(time);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          setAudioLevel(0);
          options?.onEnded?.();
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          options?.onError?.(new Error('Audio playback error'));
        });

        audioRef.current = audio;

        // Set up audio context for visualization
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaElementSource(audio);
        sourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        await audio.load();
      } catch (error) {
        console.error('Error loading audio:', error);
        options?.onError?.(error as Error);
      }
    },
    [options],
  );

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      updateAudioLevel();
    } catch (error) {
      console.error('Error playing audio:', error);
      options?.onError?.(error as Error);
    }
  }, [options, updateAudioLevel]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Seek to specific time
   */
  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current) return;

      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
    },
    [duration],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    audioLevel,
    load,
    play,
    pause,
    togglePlay,
    seek,
  };
}
