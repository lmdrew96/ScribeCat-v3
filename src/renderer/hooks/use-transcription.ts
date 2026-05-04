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

export function useTranscription(options?: UseTranscriptionOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);

  // Track connection state with ref to avoid stale closure in cleanup
  const isConnectedRef = useRef(false);

  /**
   * Start transcription
   */
  const start = useCallback(
    async (stream: MediaStream) => {
      try {
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

        const token = tokenResponse.token;

        // Build WebSocket URL for v3 API with token as query parameter
        const params = new URLSearchParams({
          sample_rate: '16000',
          format_turns: 'true',
          token: token,
        });
        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`;

        // Create WebSocket connection
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        mediaStreamRef.current = stream;
        startTimeRef.current = Date.now();

        // Set up WebSocket event handlers
        ws.onopen = () => {
          console.log('AssemblyAI v3 connection opened');
          isConnectedRef.current = true;
          setIsConnected(true);
          setError(null);
        };

        ws.onerror = (event) => {
          console.error('AssemblyAI WebSocket error:', event);
          const errorMessage = 'WebSocket connection error';
          setError(errorMessage);
          options?.onError?.(new Error(errorMessage));
        };

        ws.onclose = (event) => {
          console.log('AssemblyAI connection closed:', event.code, event.reason);
          const wasActivelyTranscribing = isConnectedRef.current;
          isConnectedRef.current = false;
          setIsConnected(false);

          // If the WS died while we were still actively transcribing, the
          // session is unrecoverable — AssemblyAI v3 sessions can't be
          // continued. Surface an error so the UI can prompt the user to
          // stop and start over instead of trusting a dead pipeline. The
          // most common trigger is an iPadOS audio session interruption
          // (Split View / Stage Manager) starving the WS of audio frames
          // until AssemblyAI's idle timeout closes the session.
          if (wasActivelyTranscribing && mediaStreamRef.current) {
            const errorMessage =
              'Recording interrupted — transcription stopped. Stop and start a new recording to continue capturing.';
            setError(errorMessage);
            options?.onError?.(new Error(errorMessage));
          }
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

              options?.onSegment?.(segment);
            } else if (message.type === 'Termination') {
              console.log('Session terminated:', message);
            } else if (message.type === 'Error') {
              console.error('AssemblyAI error:', message.error);
              setError(message.error);
              options?.onError?.(new Error(message.error));
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        // Set up audio processing.
        //
        // Do NOT pass sampleRate: 16000 here — mobile browsers (iOS Safari,
        // Android Chrome) silently ignore the hint and use their native rate
        // (44100 or 48000 Hz). We detect the actual rate and downsample ourselves.
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        // Auto-resume if iPadOS suspends the context during a multi-window
        // transition. Without this, the AudioWorklet stops emitting frames
        // and AssemblyAI silently times out the session.
        audioContext.addEventListener('statechange', () => {
          if (
            audioContext.state === 'suspended' &&
            isConnectedRef.current &&
            audioContextRef.current === audioContext
          ) {
            audioContext.resume().catch((err) => {
              console.warn('Failed to resume transcription AudioContext:', err);
            });
          }
        });

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
        console.error('Error starting transcription:', error);
        setError((error as Error).message);
        options?.onError?.(error as Error);
      }
    },
    [options],
  );

  /**
   * Stop transcription
   */
  const stop = useCallback(async () => {
    try {
      isConnectedRef.current = false;

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {
          // already disconnected
        }
        sourceNodeRef.current = null;
      }

      if (workletNodeRef.current) {
        try {
          workletNodeRef.current.disconnect();
        } catch {
          // already disconnected
        }
        workletNodeRef.current = null;
      }

      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {
          // already disconnected
        }
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch {
          // already closed
        }
        audioContextRef.current = null;
      }

      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
        mediaStreamRef.current = null;
      }

      if (wsRef.current) {
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }

      setIsConnected(false);
      console.log('🧹 Transcription cleanup complete');
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }, []);

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
        isConnectedRef.current = false;

        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect();
          } catch {
            /* ignore */
          }
          sourceNodeRef.current = null;
        }

        if (workletNodeRef.current) {
          try {
            workletNodeRef.current.disconnect();
          } catch {
            /* ignore */
          }
          workletNodeRef.current = null;
        }

        if (processorRef.current) {
          try {
            processorRef.current.disconnect();
          } catch {
            /* ignore */
          }
          processorRef.current = null;
        }

        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {
            /* ignore */
          });
          audioContextRef.current = null;
        }

        if (mediaStreamRef.current) {
          for (const track of mediaStreamRef.current.getTracks()) {
            track.stop();
          }
          mediaStreamRef.current = null;
        }

        if (wsRef.current) {
          if (
            wsRef.current.readyState === WebSocket.OPEN ||
            wsRef.current.readyState === WebSocket.CONNECTING
          ) {
            wsRef.current.close();
          }
          wsRef.current = null;
        }

        console.log('🧹 Transcription unmount cleanup complete');
      }
    };
  }, []);

  return {
    isConnected,
    error,
    segments,
    start,
    stop,
    reset,
    getFullTranscript,
  };
}
