import { keepAudioContextAwake } from '@/lib/audio-context-keepalive';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface UseTranscriptionOptions {
  onSegment?: (segment: TranscriptSegment) => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
}

/**
 * Backoff schedule for re-establishing a dropped AssemblyAI session. The
 * length of this array is also the retry cap before we give up and tell the
 * user.
 */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000];

export function useTranscription(options?: UseTranscriptionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const releaseAudioKeepaliveRef = useRef<(() => void) | null>(null);

  // Track connection state with ref to avoid stale closure in cleanup
  const isConnectedRef = useRef(false);

  // True from start() until stop() — "the user still wants a live transcript".
  // Distinguishes a deliberate teardown from a socket we lost underneath us.
  const shouldStreamRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  // True while a connect attempt is in flight (the token fetch is async, so
  // two overlapping attempts would leave an orphaned socket behind).
  const isConnectingRef = useRef(false);
  // Set below — breaks the connect <-> reconnect callback cycle.
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // Stable ref for options so socket handlers never hold stale callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  /**
   * True while the captured mic stream still has a live track. If the track
   * has ended (device unplugged, permission revoked) a new AssemblyAI session
   * would just idle out again, so we stop retrying.
   */
  const hasLiveAudioTrack = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) return false;
    return stream.getAudioTracks().some((track) => track.readyState === 'live');
  }, []);

  /**
   * Open an AssemblyAI v3 streaming session and point wsRef at it.
   *
   * Used for both the initial connect and every reconnect: the audio graph
   * sends through `wsRef.current`, so swapping the socket is all it takes to
   * resume streaming into a fresh session. Accumulated segments and the
   * recording-relative timestamp origin are deliberately left untouched.
   */
  const openSocketInner = useCallback(async () => {
    // Retire any socket still hanging around so we never leave one orphaned.
    const stale = wsRef.current;
    if (stale && stale.readyState !== WebSocket.CLOSED) {
      stale.onclose = null;
      stale.onmessage = null;
      stale.onerror = null;
      try {
        stale.close();
      } catch {
        /* already closing */
      }
    }

    // Get AssemblyAI streaming token from Convex backend
    const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
    const httpBase = convexUrl.replace('.cloud', '.site');
    const tokenRes = await fetch(`${httpBase}/assemblyai/token`);
    const tokenResponse = (await tokenRes.json()) as {
      success: boolean;
      token?: string;
      error?: string;
    };

    if (!tokenResponse.success || !tokenResponse.token) {
      throw new Error(tokenResponse.error || 'Failed to get AssemblyAI token');
    }

    // Build WebSocket URL for v3 API with token as query parameter
    const params = new URLSearchParams({
      sample_rate: '16000',
      format_turns: 'true',
      token: tokenResponse.token,
    });
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('AssemblyAI v3 connection opened');
      isConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
    };

    ws.onerror = (event) => {
      // Don't surface this directly — onclose follows and drives recovery.
      console.error('AssemblyAI WebSocket error:', event);
    };

    ws.onclose = (event) => {
      console.log('AssemblyAI connection closed:', event.code, event.reason);
      isConnectedRef.current = false;
      setIsConnected(false);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      // Deliberate teardown from stop()/unmount — nothing to recover.
      if (!shouldStreamRef.current) return;

      // The socket died while we were still recording. The usual cause is a
      // page-visibility interruption (an occluded Safari window, iPadOS Split
      // View) suspending the AudioContext until AssemblyAI's idle timeout
      // closes the session. v3 sessions can't be continued, but a fresh
      // session can — reconnect and keep appending to the same transcript.
      scheduleReconnectRef.current();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'Begin') {
          console.log('Session started:', message.id);
        } else if (message.type === 'Turn') {
          const segment: TranscriptSegment = {
            text: message.transcript || '',
            timestamp: Date.now() - startTimeRef.current,
            isFinal: message.end_of_turn === true,
          };

          setSegments((prev) => {
            // Keep all finals; always replace the single pending partial
            const finals = prev.filter((s) => s.isFinal);
            return [...finals, segment];
          });

          optionsRef.current?.onSegment?.(segment);
        } else if (message.type === 'Termination') {
          console.log('Session terminated:', message);
        } else if (message.type === 'Error') {
          console.error('AssemblyAI error:', message.error);
          setError(message.error);
          optionsRef.current?.onError?.(new Error(message.error));
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };
  }, []);

  /**
   * Open a session, flagging the attempt so overlapping connects can't race.
   */
  const openSocket = useCallback(async () => {
    isConnectingRef.current = true;
    try {
      await openSocketInner();
    } finally {
      isConnectingRef.current = false;
    }
  }, [openSocketInner]);

  /**
   * Give up on reconnecting and tell the caller. The audio recording itself
   * is unaffected — only the live transcript stops here.
   */
  const failReconnect = useCallback(
    (reason: string) => {
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setError(reason);
      optionsRef.current?.onError?.(new Error(reason));
    },
    [clearReconnectTimer],
  );

  const scheduleReconnect = useCallback(() => {
    if (!shouldStreamRef.current) return;
    if (reconnectTimerRef.current !== null) return; // one attempt already queued
    if (isConnectingRef.current) return; // one attempt already in flight

    if (!hasLiveAudioTrack()) {
      failReconnect(
        'Microphone stopped delivering audio, so transcription ended. Stop the recording and start a new one to resume.',
      );
      return;
    }

    const attempt = reconnectAttemptsRef.current;
    if (attempt >= RECONNECT_DELAYS_MS.length) {
      failReconnect(
        'Transcription disconnected and could not reconnect. Your audio is still being recorded — stop and start a new recording to resume live transcription.',
      );
      return;
    }

    reconnectAttemptsRef.current = attempt + 1;
    setIsReconnecting(true);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!shouldStreamRef.current) return;

      // A suspended context would starve the new session exactly like the old
      // one, so nudge it awake before spending a token.
      audioContextRef.current?.resume().catch(() => {
        /* rejected while hidden — the keepalive retries on visibility */
      });

      openSocket().catch((err) => {
        console.warn('Transcription reconnect failed:', err);
        scheduleReconnectRef.current();
      });
    }, RECONNECT_DELAYS_MS[attempt]);
  }, [failReconnect, hasLiveAudioTrack, openSocket]);

  scheduleReconnectRef.current = scheduleReconnect;

  /**
   * Reconnect immediately when the user comes back to the tab. WebKit
   * suspends the AudioContext for a hidden page, so any attempt made while
   * away was likely doomed — reset the backoff and try again now that audio
   * can actually flow.
   */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      if (!shouldStreamRef.current) return;
      if (isConnectingRef.current) return;
      const state = wsRef.current?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      scheduleReconnectRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [clearReconnectTimer]);

  /**
   * Tear down the streaming pipeline: reconnect state, audio graph, context,
   * and socket. Shared by stop(), the failed-start path, and unmount so a
   * half-built pipeline can never leave an AssemblyAI session open.
   *
   * `stopTracks` is false when the recorder still owns the mic stream — a
   * failed transcription start must not kill an otherwise healthy recording.
   * Returns the AudioContext close promise so callers can await it.
   */
  const teardownPipeline = useCallback(
    ({ stopTracks }: { stopTracks: boolean }): Promise<void> => {
      shouldStreamRef.current = false;
      isConnectedRef.current = false;
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;

      releaseAudioKeepaliveRef.current?.();
      releaseAudioKeepaliveRef.current = null;

      for (const node of [sourceNodeRef, workletNodeRef, processorRef]) {
        try {
          node.current?.disconnect();
        } catch {
          // already disconnected
        }
        node.current = null;
      }

      const closing =
        audioContextRef.current?.close().catch(() => {
          // already closed
        }) ?? Promise.resolve();
      audioContextRef.current = null;

      if (stopTracks && mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
        mediaStreamRef.current = null;
      }

      const ws = wsRef.current;
      if (ws) {
        // Detach first — onclose must not schedule a reconnect or touch state
        // for a pipeline we are deliberately dismantling.
        ws.onclose = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onopen = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          try {
            ws.close();
          } catch {
            // already closing
          }
        }
        wsRef.current = null;
      }

      return closing;
    },
    [clearReconnectTimer],
  );

  /**
   * Start transcription
   */
  const start = useCallback(
    async (stream: MediaStream) => {
      try {
        mediaStreamRef.current = stream;
        startTimeRef.current = Date.now();
        shouldStreamRef.current = true;
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);

        await openSocket();

        // Set up audio processing.
        //
        // Do NOT pass sampleRate: 16000 here — mobile browsers (iOS Safari,
        // Android Chrome) silently ignore the hint and use their native rate
        // (44100 or 48000 Hz). We detect the actual rate and downsample ourselves.
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        // Keep the context running across visibility changes. Without this the
        // AudioWorklet stops emitting frames the moment the window is occluded
        // and AssemblyAI times the session out.
        releaseAudioKeepaliveRef.current?.();
        releaseAudioKeepaliveRef.current = keepAudioContextAwake(
          audioContext,
          () => shouldStreamRef.current && audioContextRef.current === audioContext,
          'transcription',
        );

        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Prefer AudioWorkletNode — off-main-thread, reliable on all modern
        // mobile browsers (iOS 14.5+, Android Chrome 64+).
        let workletLoaded = false;

        if (typeof AudioWorkletNode !== 'undefined' && audioContext.audioWorklet) {
          try {
            await audioContext.audioWorklet.addModule('/audio-processor.js');
            const workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
              processorOptions: { targetSampleRate: 16000 },
            });
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(event.data);
              }
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);
            workletLoaded = true;
            console.log(
              `AudioWorklet ready — context rate: ${audioContext.sampleRate} Hz → 16000 Hz`,
            );
          } catch (workletErr) {
            console.warn(
              'AudioWorklet unavailable, falling back to ScriptProcessorNode:',
              workletErr,
            );
          }
        }

        if (!workletLoaded) {
          // Fallback: ScriptProcessorNode with manual downsampling.
          // Capture the actual context rate at setup time to avoid stale closure.
          const nativeRate = audioContext.sampleRate;
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);

            // Downsample to 16000 Hz if the browser ignored our rate hint
            let audioData: Float32Array;
            if (nativeRate !== 16000) {
              const ratio = nativeRate / 16000;
              const outputLen = Math.floor(inputData.length / ratio);
              audioData = new Float32Array(outputLen);
              for (let i = 0; i < outputLen; i++) {
                audioData[i] = inputData[Math.floor(i * ratio)];
              }
            } else {
              audioData = inputData;
            }

            const int16Data = new Int16Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              const s = Math.max(-1, Math.min(1, audioData[i]));
              int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(int16Data.buffer);
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
          console.log(`ScriptProcessorNode fallback — context rate: ${nativeRate} Hz → 16000 Hz`);
        }
      } catch (error) {
        // Nothing is reliably streaming. Dismantle whatever got built — an
        // opened socket here would otherwise hold an unused AssemblyAI
        // session until the user stops recording. The mic stream belongs to
        // the recorder, which is still using it, so leave the tracks running.
        teardownPipeline({ stopTracks: false });
        setIsConnected(false);
        setIsReconnecting(false);
        console.error('Error starting transcription:', error);
        setError((error as Error).message);
        optionsRef.current?.onError?.(error as Error);
      }
    },
    [openSocket, teardownPipeline],
  );

  /**
   * Stop transcription
   */
  const stop = useCallback(async () => {
    try {
      await teardownPipeline({ stopTracks: true });
      setIsConnected(false);
      setIsReconnecting(false);
      console.log('🧹 Transcription cleanup complete');
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }, [teardownPipeline]);

  /**
   * Reset segments
   */
  const reset = useCallback(() => {
    setSegments([]);
    setError(null);
  }, []);

  /**
   * Get full transcript text
   */
  const getFullTranscript = useCallback(() => {
    return segments
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');
  }, [segments]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isConnectedRef.current || wsRef.current || audioContextRef.current) {
        teardownPipeline({ stopTracks: true });
        console.log('🧹 Transcription unmount cleanup complete');
      } else {
        // Nothing was built, but a queued reconnect or keepalive listener may
        // still be outstanding.
        teardownPipeline({ stopTracks: false });
      }
    };
  }, [teardownPipeline]);

  return {
    isConnected,
    isReconnecting,
    error,
    segments,
    start,
    stop,
    reset,
    getFullTranscript,
  };
}
