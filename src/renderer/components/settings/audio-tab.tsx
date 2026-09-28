import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRecordingContext } from '@/contexts/recording-context';
import type { useStudySettings } from '@/hooks/use-productivity';
import { cn } from '@/lib/utils';
import { useEffect, useId, useRef, useState } from 'react';

type Settings = ReturnType<typeof useStudySettings>['settings'];
type UpdateSettings = ReturnType<typeof useStudySettings>['updateSettings'];

interface AudioTabProps {
  settings: Settings;
  updateSettings: UpdateSettings;
  showWaveform: boolean;
  setShowWaveform: (show: boolean) => void;
}

const MIC_TEST_MS = 3000;
/** Speech averages well under half of full scale; this gain makes a normal voice fill most bars. */
const MIC_TEST_GAIN = 300;

const micTestErrorMessage = (error: unknown): string => {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError')
    return 'Microphone access is blocked. Allow it in your browser settings.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'That microphone isn\u2019t connected. Pick another one.';
  return 'Couldn\u2019t open the microphone.';
};

export function AudioTab({
  settings,
  updateSettings,
  showWaveform,
  setShowWaveform,
}: AudioTabProps) {
  const id = useId();
  const { devices, selectedDeviceId, setSelectedDeviceId, loadDevices, isRecording } =
    useRecordingContext();
  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const stopTestRef = useRef<(() => void) | null>(null);

  // Closing settings mid-test must release the mic, or the browser's recording indicator stays on.
  useEffect(() => () => stopTestRef.current?.(), []);

  // Chrome lists a 'default' pseudo-device; Safari and Firefox don't, so add one there.
  const hasDefaultEntry = devices.some((device) => device.deviceId === 'default');

  const testMicrophone = async (): Promise<void> => {
    setTestError(null);
    setIsTesting(true);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId === 'default' ? true : { deviceId: { exact: selectedDeviceId } },
      });
    } catch (error) {
      setIsTesting(false);
      setTestError(micTestErrorMessage(error));
      return;
    }
    // Permission is granted now, so the list can show real mic names.
    void loadDevices();

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);

    let frame = 0;
    const tick = (): void => {
      analyser.getByteFrequencyData(bins);
      const average = bins.reduce((sum, value) => sum + value, 0) / bins.length;
      setMicLevel(Math.min(100, (average / 255) * MIC_TEST_GAIN));
      frame = requestAnimationFrame(tick);
    };
    tick();

    const stop = (): void => {
      stopTestRef.current = null;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
      void audioContext.close();
      setIsTesting(false);
      setMicLevel(0);
    };
    const timer = setTimeout(stop, MIC_TEST_MS);
    stopTestRef.current = stop;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${id}-device`} className="text-sm text-foreground">
          Input Device
        </Label>
        <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId} disabled={isRecording}>
          <SelectTrigger id={`${id}-device`} className="bg-background border-border">
            <SelectValue placeholder="Select microphone" />
          </SelectTrigger>
          <SelectContent>
            {!hasDefaultEntry && <SelectItem value="default">System default</SelectItem>}
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isRecording
            ? 'Stop recording to switch microphones.'
            : devices.length === 0
              ? 'Run a mic test (or start a recording) to list your microphones.'
              : 'Used for your next recording on this device.'}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm leading-none font-medium text-foreground">Test Microphone</p>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void testMicrophone()}
            disabled={isTesting}
          >
            {isTesting ? 'Listening...' : 'Test Mic'}
          </Button>
          <div className="flex h-6 flex-1 items-center gap-0.5 rounded glass-light px-2">
            {Array.from({ length: 20 }).map((_, i) => {
              const barKey = `mic-level-${String(i)}`;
              return (
                <div
                  key={barKey}
                  className={cn(
                    'h-3 w-1 rounded-sm transition-all',
                    i < micLevel / 5 ? 'bg-success' : 'bg-border',
                  )}
                />
              );
            })}
          </div>
        </div>
        {testError && <p className="text-xs text-destructive">{testError}</p>}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor={`${id}-waveform`} className="text-sm text-foreground">
          Show waveform while recording
        </Label>
        <Switch id={`${id}-waveform`} checked={showWaveform} onCheckedChange={setShowWaveform} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-retention`} className="text-sm text-foreground">
          Audio Retention Period
        </Label>
        <Select
          value={String(settings && '_id' in settings ? (settings.audioRetentionMonths ?? 6) : 6)}
          onValueChange={(val) => updateSettings({ audioRetentionMonths: Number(val) })}
        >
          <SelectTrigger id={`${id}-retention`} className="bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 month</SelectItem>
            <SelectItem value="3">3 months</SelectItem>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months</SelectItem>
            <SelectItem value="0">Never delete</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Audio files older than this are automatically deleted. Transcripts and notes are always
          kept.
        </p>
      </div>

      <div className="rounded-lg glass-light p-3 space-y-1">
        <p className="text-xs font-medium text-foreground/70">Transcription Privacy</p>
        <p className="text-xs text-muted-foreground">
          Audio is sent to AssemblyAI for real-time transcription. Only the text transcript is
          retained — audio is not stored by AssemblyAI after processing.
        </p>
      </div>
    </div>
  );
}
