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
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Stabilize callbacks so load/play don't depend on options identity
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Simulate audio level from playback state for waveform visualization.
   * Real frequency analysis via createMediaElementSource requires CORS
   * headers that Convex storage URLs don't provide, so we simulate instead.
   */
  const simulateAudioLevel = useCallback(() => {
    if (!audioRef.current || audioRef.current.paused) {
      setAudioLevel(0);
      return;
    }
    // Generate a smooth pseudo-random level between 0.3–0.8
    const t = performance.now() / 200;
    const level = 0.45 + 0.25 * Math.sin(t) + 0.1 * Math.sin(t * 2.7);
    setAudioLevel(level);
    animationFrameRef.current = requestAnimationFrame(simulateAudioLevel);
  }, []);

  /**
   * Load audio from a URL (Convex storage URL or any audio URL)
   */
  const load = useCallback(async (audioUrl: string) => {
    try {
      if (!audioUrl) {
        throw new Error('No audio URL provided');
      }

      // Clean up previous resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioLevel(0);

      // Create audio element directly from URL
      const audio = new Audio();
      audio.src = audioUrl;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        const time = audio.currentTime;
        setCurrentTime(time);
        optionsRef.current?.onTimeUpdate?.(time);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);
        optionsRef.current?.onEnded?.();
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        optionsRef.current?.onError?.(new Error('Audio playback error'));
      });

      audioRef.current = audio;
      await audio.load();
    } catch (error) {
      console.error('Error loading audio:', error);
      optionsRef.current?.onError?.(error as Error);
    }
  }, []);

  /**
   * Play audio
   */
  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      simulateAudioLevel();
    } catch (error) {
      console.error('Error playing audio:', error);
      optionsRef.current?.onError?.(error as Error);
    }
  }, [simulateAudioLevel]);

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
