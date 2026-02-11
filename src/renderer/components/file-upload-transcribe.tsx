import { type LectureType, LectureTypeSelect } from '@/components/lecture-type-select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessions } from '@/hooks/use-sessions';
import { useMutation } from 'convex/react';
import { FileAudio, Loader2, Upload, Users } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface FileUploadTranscribeProps {
  onSessionCreated?: (sessionId: Id<'sessions'>) => void;
}

interface TranscribeResult {
  success: boolean;
  transcript?: string;
  utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
  words?: Array<{ text: string; start: number; end: number; speaker?: string }>;
  error?: string;
}

export function FileUploadTranscribe({ onSessionCreated }: FileUploadTranscribeProps) {
  const { createSession, updateSession } = useSessions();
  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);
  const getAudioUrl = useMutation(api.audioStorage.getAudioUrlMutation);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState('');
  const [lectureType, setLectureType] = useState<LectureType>('general');
  const [speakerLabels, setSpeakerLabels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileName = file.name.replace(/\.[^.]+$/, '') || 'Uploaded Recording';

      try {
        setIsTranscribing(true);
        setProgress('Uploading audio file...');

        // Step 1: Upload audio to Convex storage
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        const { storageId } = await uploadResult.json();

        // Step 2: Create session and save audio reference
        const sessionId = await createSession({
          title: fileName,
          lectureType,
        });

        await updateSession({
          id: sessionId,
          audioStorageId: storageId,
        });

        setProgress('Transcribing with AssemblyAI...');

        // Step 3: Get the public Convex storage URL
        const audioUrl = await getAudioUrl({ storageId });
        if (!audioUrl) {
          throw new Error('Failed to get audio URL from storage');
        }

        // Step 4: Send to Convex transcription endpoint
        const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
        const httpBase = convexUrl.replace('.cloud', '.site');

        const transcribeRes = await fetch(`${httpBase}/assemblyai/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl, speakerLabels }),
        });

        const transcribeResult = (await transcribeRes.json()) as TranscribeResult;

        if (!transcribeResult.success) {
          throw new Error(transcribeResult.error || 'Transcription failed');
        }

        setProgress('Saving transcript...');

        // Build transcript with speaker labels if available
        let formattedTranscript = transcribeResult.transcript || '';
        const segments: Array<{ text: string; timestamp: number; isFinal: boolean }> = [];

        if (
          speakerLabels &&
          transcribeResult.utterances &&
          transcribeResult.utterances.length > 0
        ) {
          formattedTranscript = transcribeResult.utterances
            .map((u) => `[Speaker ${u.speaker}]: ${u.text}`)
            .join('\n\n');

          for (const utterance of transcribeResult.utterances) {
            segments.push({
              text: `[Speaker ${utterance.speaker}]: ${utterance.text}`,
              timestamp: utterance.start,
              isFinal: true,
            });
          }
        } else if (transcribeResult.words && transcribeResult.words.length > 0) {
          const words = transcribeResult.words;
          let currentSegment = '';
          let segmentStart = words[0].start;

          for (let i = 0; i < words.length; i++) {
            currentSegment += `${words[i].text} `;
            const isEndOfSentence = words[i].text.match(/[.!?]$/);
            const isLongEnough = currentSegment.split(/\s+/).length >= 40;

            if ((isEndOfSentence && isLongEnough) || i === words.length - 1) {
              segments.push({
                text: currentSegment.trim(),
                timestamp: segmentStart,
                isFinal: true,
              });
              if (i < words.length - 1) {
                segmentStart = words[i + 1].start;
              }
              currentSegment = '';
            }
          }
        }

        await updateSession({
          id: sessionId,
          transcript: formattedTranscript,
          transcriptSegments: segments.length > 0 ? segments : undefined,
          duration: segments.length > 0 ? segments[segments.length - 1].timestamp : 0,
        });

        setProgress('Done!');
        onSessionCreated?.(sessionId);
      } catch (error) {
        console.error('File upload transcription error:', error);
        setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setTimeout(() => {
          setIsTranscribing(false);
          setProgress('');
        }, 2000);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      createSession,
      updateSession,
      generateUploadUrl,
      getAudioUrl,
      lectureType,
      speakerLabels,
      onSessionCreated,
    ],
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <FileAudio className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Upload Audio</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload a recorded lecture file for batch transcription. Supports MP3, WAV, M4A, and more.
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <LectureTypeSelect
            value={lectureType}
            onChange={setLectureType}
            disabled={isTranscribing}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={speakerLabels}
            onCheckedChange={setSpeakerLabels}
            disabled={isTranscribing}
            aria-label="Enable speaker diarization"
          />
          <Users className="h-3.5 w-3.5" />
          <span>Speakers</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a,.flac,.mp4,.aac"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isTranscribing}
        variant="secondary"
        size="sm"
        className="gap-2"
      >
        {isTranscribing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Choose Audio File
          </>
        )}
      </Button>
    </div>
  );
}
