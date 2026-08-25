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
import type { useStudySettings } from '@/hooks/use-productivity';
import { cn } from '@/lib/utils';

type Settings = ReturnType<typeof useStudySettings>['settings'];
type UpdateSettings = ReturnType<typeof useStudySettings>['updateSettings'];

interface AudioTabProps {
  settings: Settings;
  updateSettings: UpdateSettings;
  showWaveform: boolean;
  setShowWaveform: (show: boolean) => void;
  micLevel: number;
  isTesting: boolean;
  testMicrophone: () => void;
}

export function AudioTab({
  settings,
  updateSettings,
  showWaveform,
  setShowWaveform,
  micLevel,
  isTesting,
  testMicrophone,
}: AudioTabProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Input Device</Label>
        <Select defaultValue="macbook">
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Select microphone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="macbook">MacBook Pro Microphone</SelectItem>
            <SelectItem value="airpods">AirPods Pro</SelectItem>
            <SelectItem value="external">External USB Microphone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-foreground">Test Microphone</Label>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={testMicrophone} disabled={isTesting}>
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
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground">Show waveform while recording</Label>
        <Switch checked={showWaveform} onCheckedChange={setShowWaveform} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-foreground">Audio Retention Period</Label>
        <Select
          value={String(settings && '_id' in settings ? (settings.audioRetentionMonths ?? 6) : 6)}
          onValueChange={(val) => updateSettings({ audioRetentionMonths: Number(val) })}
        >
          <SelectTrigger className="bg-background border-border">
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
