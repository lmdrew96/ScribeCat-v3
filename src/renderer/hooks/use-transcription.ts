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
  const startTimeRef = useRef<number>(0);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Track connection state with ref to avoid stale closure in cleanup
  const isConnectedRef = useRef(false);

  /**
   * Start transcription
   */
  const start = useCallback(
    async (stream: MediaStream) => {
      try {
        // Get AssemblyAI API key from main process
        const tokenResponse = await window.electronAPI?.getAssemblyAIToken();

        if (!tokenResponse?.success || !tokenResponse.token) {
          throw new Error(tokenResponse?.error || 'Failed to get AssemblyAI token');
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
          isConnectedRef.current = false;
          setIsConnected(false);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle different message types
            if (message.type === 'Begin') {
              console.log('Session started:', message.id);
            } else if (message.type === 'Turn') {
              const segment: TranscriptSegment = {
                text: message.transcript || '',
                timestamp: Date.now() - startTimeRef.current,
                isFinal: message.turn_is_formatted === true,
              };

              setSegments((prev) => {
                if (segment.isFinal) {
                  // Final transcript: remove all partial transcripts and add the final one
                  const finalSegments = prev.filter((s) => s.isFinal);
                  return [...finalSegments, segment];
                }
                // Partial transcript: replace the last partial if exists, otherwise append
                const finalSegments = prev.filter((s) => s.isFinal);
                return [...finalSegments, segment];
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

        // Set up audio processing
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          const audioData = event.inputBuffer.getChannelData(0);

          // Convert Float32Array to Int16Array (AssemblyAI expects 16-bit PCM)
          const int16Data = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Send audio data to AssemblyAI via WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(int16Data.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
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
      // Mark as disconnected immediately
      isConnectedRef.current = false;

      // Disconnect source node first
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // Ignore - may already be disconnected
        }
        sourceNodeRef.current = null;
      }

      // Clean up audio processing
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch (e) {
          // Ignore - may already be disconnected
        }
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          // Ignore - may already be closed
        }
        audioContextRef.current = null;
      }

      // Stop media stream tracks
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
        mediaStreamRef.current = null;
      }

      // Close WebSocket
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
      // Use ref to check connection state to avoid stale closure
      if (isConnectedRef.current || wsRef.current || audioContextRef.current) {
        // Inline cleanup to avoid calling stop() with stale closure
        isConnectedRef.current = false;

        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect();
          } catch (e) {
            /* ignore */
          }
          sourceNodeRef.current = null;
        }

        if (processorRef.current) {
          try {
            processorRef.current.disconnect();
          } catch (e) {
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
