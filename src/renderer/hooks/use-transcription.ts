import { RealtimeTranscriber } from 'assemblyai';
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

  const transcriberRef = useRef<RealtimeTranscriber | null>(null);
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
        // Get AssemblyAI token from main process
        const tokenResponse = await window.electronAPI?.getAssemblyAIToken();

        if (!tokenResponse?.success || !tokenResponse.token) {
          throw new Error(tokenResponse?.error || 'Failed to get AssemblyAI token');
        }

        // Create real-time transcriber
        const transcriber = new RealtimeTranscriber({
          token: tokenResponse.token,
          sampleRate: 16000,
        });

        transcriberRef.current = transcriber;
        mediaStreamRef.current = stream;
        startTimeRef.current = Date.now();

        // Set up event handlers
        transcriber.on('open', () => {
          console.log('AssemblyAI connection opened');
          setIsConnected(true);
          setError(null);
        });

        transcriber.on('error', (error: Error) => {
          console.error('AssemblyAI error:', error);
          setError(error.message);
          options?.onError?.(error);
        });

        transcriber.on('close', () => {
          console.log('AssemblyAI connection closed');
          setIsConnected(false);
        });

        transcriber.on('transcript', (transcript: { text: string }) => {
          const segment: TranscriptSegment = {
            text: transcript.text,
            timestamp: Date.now() - startTimeRef.current,
            isFinal: transcript.message_type === 'FinalTranscript',
          };

          setSegments((prev) => {
            // If it's a final transcript, replace the last partial one
            if (segment.isFinal && prev.length > 0 && !prev[prev.length - 1].isFinal) {
              return [...prev.slice(0, -1), segment];
            }
            // Otherwise, append (partial) or add new final
            return [...prev, segment];
          });

          options?.onSegment?.(segment);
        });

        // Connect to AssemblyAI
        await transcriber.connect();

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

          // Send audio data to AssemblyAI
          if (transcriberRef.current) {
            transcriberRef.current.sendAudio(int16Data.buffer);
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

      // Close transcriber
      if (transcriberRef.current) {
        await transcriberRef.current.close();
        transcriberRef.current = null;
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
