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
  const prevLevelRef = useRef(0);

  // Stabilize callbacks so load/play don't depend on options identity
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Simulate audio level with natural-looking variation.
   * Uses smoothed noise instead of sine waves for a more organic look.
   */
  const simulateAudioLevel = useCallback(() => {
    if (!audioRef.current || audioRef.current.paused) {
      setAudioLevel(0);
      prevLevelRef.current = 0;
      return;
    }
    // Random target smoothed toward previous value for organic movement
    const target = 0.3 + Math.random() * 0.5;
    const smoothed = prevLevelRef.current * 0.6 + target * 0.4;
    prevLevelRef.current = smoothed;
    setAudioLevel(smoothed);
    animationFrameRef.current = requestAnimationFrame(simulateAudioLevel);
  }, []);

  /**
   * Resolve the real duration for WebM files that report Infinity.
   * Seeks to a huge time to force the browser to calculate duration,
   * then seeks back to the start.
   */
  const resolveDuration = useCallback((audio: HTMLAudioElement) => {
    const onSeeked = () => {
      audio.removeEventListener('seeked', onSeeked);
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      audio.currentTime = 0;
    };
    audio.addEventListener('seeked', onSeeked);
    audio.currentTime = 1e10;
  }, []);

  /**
   * Load audio from a URL (Convex storage URL or any audio URL)
   */
  const load = useCallback(
    async (audioUrl: string) => {
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
        prevLevelRef.current = 0;

        // Create audio element directly from URL
        const audio = new Audio();
        audio.src = audioUrl;

        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(audio.duration)) {
            setDuration(audio.duration);
          } else {
            // WebM from MediaRecorder often has Infinity duration — resolve it
            resolveDuration(audio);
          }
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

        audio.addEventListener('error', () => {
          const mediaError = audio.error;
          console.error('Audio error:', mediaError?.code, mediaError?.message);
          optionsRef.current?.onError?.(new Error('Audio playback error'));
        });

        audioRef.current = audio;
        await audio.load();
      } catch (error) {
        console.error('Error loading audio:', error);
        optionsRef.current?.onError?.(error as Error);
      }
    },
    [resolveDuration],
  );

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
