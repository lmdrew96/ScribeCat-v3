import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { previewAllSounds } from '@/lib/notification-sounds';
import { Bell, CheckCircle2, Volume2, VolumeX, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationsTabProps {
  soundEnabled: boolean;
  onSoundEnabledChange: (checked: boolean) => void;
  pushPermission: NotificationPermission;
  onEnablePushNotifications: () => void;
}

export function NotificationsTab({
  soundEnabled,
  onSoundEnabledChange,
  pushPermission,
  onEnablePushNotifications,
}: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Sound Effects */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Sound Effects</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-foreground flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-accent" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              Notification Sounds
            </Label>
            <p className="text-xs text-muted-foreground">
              Play sounds for new messages, friend requests, and cat level-ups
            </p>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={onSoundEnabledChange} />
        </div>

        {soundEnabled && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              try {
                previewAllSounds();
              } catch {
                toast.error('Could not play sounds — check your browser audio settings.');
              }
            }}
          >
            Preview Sounds
          </Button>
        )}

        {soundEnabled && (
          <div className="rounded-lg border border-[var(--glass-border)] glass-light p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-[11px] uppercase tracking-wide mb-2">
              Sound Guide
            </p>
            <p>💬 Short ping — new message</p>
            <p>👋 Two-note chime — friend request</p>
            <p>⬆️ Ascending arpeggio — cat level-up</p>
          </div>
        )}
      </div>

      {/* Browser Push Notifications */}
      <div className="border-t border-[var(--glass-border)] pt-5 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Browser Notifications</h3>
        <p className="text-xs text-muted-foreground">
          Get OS-level alerts for new messages and friend requests, even when the tab is in the
          background.
        </p>

        {pushPermission === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-accent font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Active — browser notifications are enabled
          </div>
        )}

        {pushPermission === 'denied' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Blocked by your browser
            </div>
            <p className="text-xs text-muted-foreground">
              To enable: open your browser settings, find Site Permissions, and allow notifications
              for this site.
            </p>
          </div>
        )}

        {pushPermission === 'default' && (
          <Button variant="secondary" size="sm" onClick={onEnablePushNotifications}>
            <Bell className="h-4 w-4 mr-1.5" />
            Enable Browser Notifications
          </Button>
        )}
      </div>
    </div>
  );
}
