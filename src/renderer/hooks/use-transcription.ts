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
      // Clean up audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsConnected(false);
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
      if (isConnected) {
        stop();
      }
    };
  }, [isConnected, stop]);

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
