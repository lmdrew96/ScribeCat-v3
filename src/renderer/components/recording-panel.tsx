import { AudioWaveform } from '@/components/audio-waveform';
import { HandwritingCanvas } from '@/components/handwriting-canvas';
import { LectureTypeSelect } from '@/components/lecture-type-select';
import { LiveTranscript } from '@/components/live-transcript';
import { NuggetNotesPanel } from '@/components/nugget-notes-panel';
import { RecordingConsentModal } from '@/components/recording-consent-modal';
import { RecordingContinueModal } from '@/components/recording-continue-modal';
import { useUploadFile } from '@convex-dev/r2/react';
import { useAction, useMutation } from 'convex/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecordingContext } from '@/contexts/recording-context';
import { Loader2, Mic, Pause, Play, Square } from 'lucide-react';

interface RecordingPanelProps {
  onInsertNote?: (noteText: string) => void;
}

export function RecordingPanel({ onInsertNote }: RecordingPanelProps) {
  const {
    isRecording,
    isPaused,
    audioLevel,
    recordingTime,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    lectureType,
    setLectureType,
    selectedCourse,
    setSelectedCourse,
    sessionTitle,
    setSessionTitle,
    courses,
    segments,
    transcriptionError,
    nuggetNotes,
    handleRecord,
    handleStop,
    handlePauseResume,
    showConsentModal,
    setShowConsentModal,
    requestRecord,
    currentSessionId,
    showContinuePrompt,
    continuePromptRemaining,
    confirmContinuePrompt,
    cancelContinuePrompt,
  } = useRecordingContext();

  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [isProcessingDrawing, setIsProcessingDrawing] = useState(false);
  const uploadFile = useUploadFile(api.r2);
  const parseDocument = useAction(api.parseDocument.parseDocumentImages);
  const updateSessionMutation = useMutation(api.sessions.update);

  const handleDrawingSave = async (file: File) => {
    if (!currentSessionId) {
      toast.error('No active session');
      return;
    }
    setIsProcessingDrawing(true);
    try {
      const storageId = await uploadFile(file);

      // Parse the image with Claude Vision
      const parseResult = await parseDocument({
        storageIds: [storageId],
        mimeTypes: [file.type],
      });

      if (!parseResult.success || !parseResult.text) {
        toast.error('Failed to extract text from handwriting');
        return;
      }

      // Append the extracted text to the session notes
      await updateSessionMutation({
        id: currentSessionId,
        notesPlainText: parseResult.text,
      });

      toast.success('Handwritten notes added');
      setShowDrawingCanvas(false);
    } catch (err) {
      console.error('Error processing handwritten notes:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to process handwriting: ${message}`);
    } finally {
      setIsProcessingDrawing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col p-4 gap-3">
      {/* Live transcript - takes most space */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <LiveTranscript
          isRecording={isRecording}
          segments={segments}
          isScrubbing={nuggetNotes.isScrubbing}
          lastScrubAt={nuggetNotes.lastScrubAt}
          scrubbedText={nuggetNotes.scrubbedText}
          scrubBoundaryAt={nuggetNotes.scrubBoundaryAt}
        />
      </div>

      {/* Nugget's Notes panel */}
      <NuggetNotesPanel
        notes={nuggetNotes.notes}
        isRecording={isRecording}
        isProcessing={nuggetNotes.isProcessing}
        isEnabled={nuggetNotes.isEnabled}
        onInsertNote={onInsertNote ?? (() => {})}
        onToggleEnabled={nuggetNotes.setEnabled}
      />

      {/* Waveform visualizer - compact */}
      <AudioWaveform isActive={isRecording && !isPaused} audioLevel={audioLevel} />

      {/* Recording controls - compact bottom bar */}
      <div className="flex items-center gap-4 rounded-xl glass p-3">
        {/* Device selector + Note type - only show when not recording */}
        {!isRecording && (
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-2">
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <LectureTypeSelect value={lectureType} onChange={setLectureType} />
              {courses.length > 0 && (
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select course (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course} className="text-xs">
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={
                selectedCourse && selectedCourse !== 'none'
                  ? `${selectedCourse} — Recording title...`
                  : 'Recording title (optional)'
              }
              className="h-8 text-xs bg-background border-border"
            />
          </div>
        )}

        {/* Recording timer - show when recording */}
        {isRecording && (
          <div className="flex-1 min-w-0">
            <div className="font-mono text-lg font-medium text-foreground">
              {formatTime(recordingTime)}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {isPaused ? 'Paused' : 'Recording...'}
            </div>
          </div>
        )}

        {/* Record/Stop button */}
        <button
          type="button"
          onClick={isRecording ? handleStop : requestRecord}
          disabled={false}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? 'recording-pulse bg-[var(--record)]'
              : 'bg-[var(--record)] hover:scale-105 hover:bg-[var(--record)]/90'
          }`}
        >
          {isRecording ? (
            <Square className="h-5 w-5 text-white" fill="white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Pause/Resume button */}
        {isRecording && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePauseResume}
            className="gap-1.5 h-8 px-2 text-xs"
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                Pause
              </>
            )}
          </Button>
        )}

        {/* Draw note button (iPad pencil support) */}
        {isRecording && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDrawingCanvas(true)}
            disabled={isProcessingDrawing}
            className="gap-1.5 h-8 px-2 text-xs"
          >
            {isProcessingDrawing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </>
            ) : (
              <>✏️ Draw Note</>
            )}
          </Button>
        )}
      </div>

      {/* Error display */}
      {transcriptionError && (
        <div className="rounded-xl glass-light bg-destructive/10 p-3 text-xs text-destructive">
          Transcription error: {transcriptionError}
        </div>
      )}

      <RecordingConsentModal
        open={showConsentModal}
        onConfirm={() => {
          setShowConsentModal(false);
          handleRecord();
        }}
        onCancel={() => setShowConsentModal(false)}
      />
      <RecordingContinueModal
        open={Boolean(showContinuePrompt)}
        remainingSeconds={continuePromptRemaining}
        onContinue={confirmContinuePrompt}
        onStop={cancelContinuePrompt}
      />

      <HandwritingCanvas
        open={showDrawingCanvas}
        onClose={() => setShowDrawingCanvas(false)}
        onSave={handleDrawingSave}
      />
    </div>
  );
}
