import { type LectureType, LectureTypeSelect } from '@/components/lecture-type-select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessions } from '@/hooks/use-sessions';
import { FileAudio, Loader2, Upload, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
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
  const userId = 'anonymous-user'; // TODO: Get from authenticated user
  const { createSession, updateSession } = useSessions(userId);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState('');
  const [lectureType, setLectureType] = useState<LectureType>('general');
  const [speakerLabels, setSpeakerLabels] = useState(false);

  const handleUpload = useCallback(async () => {
    if (!window.electronAPI?.showOpenDialog) return;

    try {
      const result = await window.electronAPI.showOpenDialog({
        filters: [
          {
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'webm', 'ogg', 'm4a', 'flac', 'mp4', 'aac'],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) return;

      const filePath = result.filePaths[0];
      const fileName = filePath.split(/[/\\]/).pop() || 'Uploaded Recording';

      setIsTranscribing(true);
      setProgress('Uploading audio file...');

      // Create session
      const sessionId = await createSession({
        userId,
        title: fileName.replace(/\.[^.]+$/, ''), // Remove extension
        lectureType,
      });

      setProgress('Transcribing with AssemblyAI...');

      // Transcribe via main process
      const transcribeResult: TranscribeResult = await window.electronAPI.transcribeFile(
        filePath,
        speakerLabels,
      );

      if (!transcribeResult.success) {
        throw new Error(transcribeResult.error || 'Transcription failed');
      }

      setProgress('Saving transcript...');

      // Build transcript with speaker labels if available
      let formattedTranscript = transcribeResult.transcript || '';
      const segments: Array<{ text: string; timestamp: number; isFinal: boolean }> = [];

      if (speakerLabels && transcribeResult.utterances && transcribeResult.utterances.length > 0) {
        // Use utterances for speaker-labeled transcript
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
        // Group words into sentence-like segments (~50 words each)
        const words = transcribeResult.words;
        let currentSegment = '';
        let segmentStart = words[0].start;

        for (let i = 0; i < words.length; i++) {
          currentSegment += `${words[i].text} `;

          // Create a segment every ~50 words or at sentence boundaries
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

      // Save to session
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
    }
  }, [createSession, updateSession, lectureType, speakerLabels, onSessionCreated]);

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

      <Button
        onClick={handleUpload}
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
