import { LegalDocModal } from '@/components/legal-doc-modal';
import { type Theme, useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAchievements, useStudySettings, useStudyStats } from '@/hooks/use-productivity';
import { useUserProfile } from '@/hooks/use-user-profile';
import { previewAllSounds } from '@/lib/notification-sounds';
import { getPermissionStatus, requestNotificationPermission } from '@/lib/push-notifications';
import { cn } from '@/lib/utils';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  Award,
  Bell,
  BookOpen,
  Bug,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Github,
  Info,
  Lock,
  Mic,
  Palette,
  Shield,
  User,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import privacyContent from '../../../docs/PRIVACY_POLICY.md?raw';
import tosContent from '../../../docs/TERMS_OF_SERVICE.md?raw';
import packageJson from '../../../package.json';
import { ACHIEVEMENT_DEFINITIONS } from '../../shared/achievements';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory = 'appearance' | 'audio' | 'study' | 'notifications' | 'account' | 'about';

const categories = [
  { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  { id: 'audio' as const, label: 'Audio', icon: Mic },
  { id: 'study' as const, label: 'Study', icon: BookOpen },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'account' as const, label: 'Account', icon: User },
  { id: 'about' as const, label: 'About', icon: Info },
];

const themes = [
  { id: 'default', name: "Nugg's Favorite", colors: ['#244952', '#1A3338', '#88739E', '#DEA549'] },
  {
    id: 'soft-focus',
    name: 'Purring Pastels',
    colors: ['#F8F4FF', '#E7D1FF', '#E4FFDE', '#D4A5D2'],
  },
  { id: 'blackout', name: 'Void Kitty', colors: ['#000000', '#0D1A14', '#B580FF', '#00F2FF'] },
  { id: 'chaos-cat', name: 'Chaos Cat', colors: ['#1A0A1F', '#2D1235', '#FF5EE0', '#1FE1FD'] },
  {
    id: 'high-contrast-dark',
    name: 'HC Dark',
    colors: ['#000000', '#1A1A1A', '#FFFF00', '#00FFFF'],
  },
  {
    id: 'high-contrast-light',
    name: 'HC Light',
    colors: ['#FFFFFF', '#F0F0F0', '#0000CC', '#006600'],
  },
  {
    id: 'nyan-cat-dark',
    name: 'Nyan Cat 🌈',
    colors: ['#0a0a1a', '#12001f', '#ff00ff', '#00ffff'],
  },
  {
    id: 'nyan-cat-light',
    name: 'Nyan Cat Light 🌈',
    colors: ['#fff0ff', '#ffe0ff', '#ff00aa', '#330033'],
  },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const { theme, setTheme } = useTheme();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();

  // Editable display name (synced from profile)
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayNameInput(profile.displayName);
    }
  }, [profile?.displayName]);

  const trimmedDisplayName = displayNameInput.trim();
  const isDisplayNameDirty =
    !!profile && trimmedDisplayName.length > 0 && trimmedDisplayName !== profile.displayName;
  const canSaveDisplayName =
    isDisplayNameDirty && trimmedDisplayName.length <= 50 && !isSavingDisplayName;

  const handleSaveDisplayName = async () => {
    if (!canSaveDisplayName) return;
    setDisplayNameError(null);
    setIsSavingDisplayName(true);
    try {
      await updateProfile({ displayName: trimmedDisplayName });
      toast.success('Name updated');
    } catch (e) {
      setDisplayNameError(e instanceof Error ? e.message : 'Failed to update name');
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  // Study settings from Convex
  const { settings, updateSettings } = useStudySettings();
  const stats = useStudyStats();
  const achievements = useAchievements();

  // Local state synced from Convex settings
  const [breakReminders, setBreakReminders] = useState(true);
  const [breakInterval, setBreakInterval] = useState('25');
  const [dailyGoalHours, setDailyGoalHours] = useState('2');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState('0');
  const [weeklyGoal, setWeeklyGoal] = useState('10');
  const [nuggetNotesEnabled, setNuggetNotesEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Browser push permission (local only — derived from Notification API)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() =>
    getPermissionStatus(),
  );

  // Legal doc modals
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Audio settings (local only)
  const [showWaveform, setShowWaveform] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  // Sync Convex settings → local state when loaded
  useEffect(() => {
    if (!settings || !('_id' in settings)) return;
    setBreakReminders(settings.breakReminders);
    setBreakInterval(String(settings.breakIntervalMinutes));
    const hours = Math.floor(settings.dailyGoalMinutes / 60);
    const mins = settings.dailyGoalMinutes % 60;
    setDailyGoalHours(String(hours));
    setDailyGoalMinutes(String(mins));
    setWeeklyGoal(String(Math.floor(settings.weeklyGoalMinutes / 60)));
    setNuggetNotesEnabled(settings.nuggetNotesEnabled ?? true);
    setSoundEnabled(settings.soundEnabled ?? true);
    if (settings.timezone) {
      setTimezone(settings.timezone);
    } else {
      // Auto-backfill timezone for existing users
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
      void updateSettings({ timezone: detected });
    }
  }, [settings, updateSettings]);

  // Save settings to Convex
  const [newCourse, setNewCourse] = useState('');
  const [canvasImportOpen, setCanvasImportOpen] = useState(false);
  const [canvasJson, setCanvasJson] = useState('');

  const saveSettings = useCallback(
    (updates: {
      breakReminders?: boolean;
      breakIntervalMinutes?: number;
      dailyGoalMinutes?: number;
      weeklyGoalMinutes?: number;
      theme?: string;
      courses?: string[];
      nuggetNotesEnabled?: boolean;
      soundEnabled?: boolean;
      timezone?: string;
    }) => {
      void updateSettings(updates);
    },
    [updateSettings],
  );

  const handleBreakRemindersChange = (checked: boolean) => {
    setBreakReminders(checked);
    saveSettings({ breakReminders: checked });
  };

  const handleBreakIntervalChange = (value: string) => {
    setBreakInterval(value);
    saveSettings({ breakIntervalMinutes: Number(value) });
  };

  const handleDailyGoalChange = (hours: string, minutes: string) => {
    setDailyGoalHours(hours);
    setDailyGoalMinutes(minutes);
    saveSettings({ dailyGoalMinutes: Number(hours) * 60 + Number(minutes) });
  };

  const handleWeeklyGoalChange = (hours: string) => {
    setWeeklyGoal(hours);
    saveSettings({ weeklyGoalMinutes: Number(hours) * 60 });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveSettings({ theme: newTheme });
  };

  const handleSoundEnabledChange = (checked: boolean) => {
    setSoundEnabled(checked);
    saveSettings({ soundEnabled: checked });
  };

  const handleEnablePushNotifications = async () => {
    const permission = await requestNotificationPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      toast.success('Browser notifications enabled!');
    } else if (permission === 'denied') {
      toast.error('Notifications blocked. Enable them in your browser settings.');
    }
  };

  const testMicrophone = () => {
    setIsTesting(true);
    const interval = setInterval(() => {
      setMicLevel(Math.random() * 100);
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setIsTesting(false);
      setMicLevel(0);
    }, 3000);
  };

  // Achievement helpers
  const unlockedIds = new Set(achievements?.map((a) => a.achievementId) ?? []);

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[600px] max-h-[90vh] w-[60vw] sm:max-w-none max-w-[95vw] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--glass-border)] px-4 py-3">
          <DialogTitle className="text-base font-semibold text-foreground">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar — horizontal strip on mobile, vertical sidebar on desktop */}
          <nav className="flex w-full md:w-48 flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-[var(--glass-border)] glass-light p-2 overflow-x-auto md:overflow-x-visible shrink-0">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors whitespace-nowrap',
                    activeCategory === category.id
                      ? 'bg-[var(--glass-bg)] text-foreground font-medium border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                      : 'text-muted-foreground hover:bg-[var(--glass-bg-light)] hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Appearance */}
            {activeCategory === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Theme</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {themes.map((themeOption) => (
                      <button
                        type="button"
                        key={themeOption.id}
                        onClick={() => handleThemeChange(themeOption.id as Theme)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                          theme === themeOption.id
                            ? 'border-[var(--glass-border-strong)] bg-[var(--glass-bg)] shadow-[0_0_12px_var(--glass-glow)]'
                            : 'border-[var(--glass-border)] glass-light hover:bg-[var(--glass-bg)]',
                        )}
                      >
                        {theme === themeOption.id && (
                          <div className="absolute right-2 top-2">
                            <Check className="h-3.5 w-3.5 text-accent" />
                          </div>
                        )}
                        <div className="flex gap-1">
                          {themeOption.colors.map((color) => (
                            <div
                              key={color}
                              className="rounded-sm w-4 h-4 border border-card-foreground"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-foreground">{themeOption.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audio */}
            {activeCategory === 'audio' && (
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={testMicrophone}
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
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Show waveform while recording</Label>
                  <Switch checked={showWaveform} onCheckedChange={setShowWaveform} />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Audio Retention Period</Label>
                  <Select
                    value={String(
                      settings && '_id' in settings ? (settings.audioRetentionMonths ?? 6) : 6,
                    )}
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
                    Audio files older than this are automatically deleted. Transcripts and notes are
                    always kept.
                  </p>
                </div>

                <div className="rounded-lg glass-light p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground/70">Transcription Privacy</p>
                  <p className="text-xs text-muted-foreground">
                    Audio is sent to AssemblyAI for real-time transcription. Only the text
                    transcript is retained — audio is not stored by AssemblyAI after processing.
                  </p>
                </div>
              </div>
            )}

            {/* Study */}
            {activeCategory === 'study' && (
              <div className="space-y-5">
                {/* Timezone */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Timezone</Label>
                  <p className="text-xs text-muted-foreground">
                    Used for daily study stats, streaks, and AI time awareness
                  </p>
                  <Select
                    value={timezone}
                    onValueChange={(value) => {
                      const resolved =
                        value === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : value;
                      setTimezone(resolved);
                      saveSettings({ timezone: resolved });
                    }}
                  >
                    <SelectTrigger className="w-56 bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Break Reminders */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-foreground">Break Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get reminded to take breaks</p>
                  </div>
                  <Switch checked={breakReminders} onCheckedChange={handleBreakRemindersChange} />
                </div>

                {breakReminders && (
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Break Interval</Label>
                    <Select value={breakInterval} onValueChange={handleBreakIntervalChange}>
                      <SelectTrigger className="w-40 bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="25">25 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Goals */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Daily Study Goal</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={dailyGoalHours}
                      onChange={(e) => handleDailyGoalChange(e.target.value, dailyGoalMinutes)}
                      className="w-20 bg-background border-border"
                    />
                    <span className="text-xs text-muted-foreground">hours</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={dailyGoalMinutes}
                      onChange={(e) => handleDailyGoalChange(dailyGoalHours, e.target.value)}
                      className="w-20 bg-background border-border"
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Weekly Study Goal</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="168"
                      value={weeklyGoal}
                      onChange={(e) => handleWeeklyGoalChange(e.target.value)}
                      className="w-20 bg-background border-border"
                    />
                    <span className="text-xs text-muted-foreground">hours</span>
                  </div>
                </div>

                {/* Nugget's Notes */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-foreground">Nugget&apos;s Notes</Label>
                    <p className="text-xs text-muted-foreground">
                      Auto-generate AI notes during recording
                    </p>
                  </div>
                  <Switch
                    checked={nuggetNotesEnabled}
                    onCheckedChange={(checked) => {
                      setNuggetNotesEnabled(checked);
                      saveSettings({ nuggetNotesEnabled: checked });
                    }}
                  />
                </div>

                {/* Courses */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Courses</Label>
                  <p className="text-xs text-muted-foreground">
                    Add your courses to quickly label recordings
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      placeholder="e.g. CISC 108"
                      className="flex-1 bg-background border-border"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCourse.trim()) {
                          e.preventDefault();
                          const current =
                            settings && '_id' in settings ? (settings.courses ?? []) : [];
                          if (!current.includes(newCourse.trim())) {
                            saveSettings({
                              courses: [...current, newCourse.trim()],
                            });
                          }
                          setNewCourse('');
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!newCourse.trim()) return;
                        const current =
                          settings && '_id' in settings ? (settings.courses ?? []) : [];
                        if (!current.includes(newCourse.trim())) {
                          saveSettings({
                            courses: [...current, newCourse.trim()],
                          });
                        }
                        setNewCourse('');
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCanvasImportOpen(!canvasImportOpen)}
                      className="gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Canvas
                    </Button>
                  </div>

                  {/* Canvas Import Section */}
                  {canvasImportOpen && (
                    <div className="space-y-2 rounded-lg border border-[var(--glass-border)] glass-light p-3">
                      <p className="text-xs text-muted-foreground">
                        Install the ScribeCat browser extension, go to your Canvas dashboard, click
                        the extension icon, then paste the copied JSON below.
                      </p>
                      <textarea
                        value={canvasJson}
                        onChange={(e) => setCanvasJson(e.target.value)}
                        placeholder='["CISC 108", "MATH 241", ...]'
                        className="w-full h-20 rounded-md bg-background border border-border px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (!canvasJson.trim()) return;
                          try {
                            const parsed: unknown = JSON.parse(canvasJson.trim());
                            if (
                              !Array.isArray(parsed) ||
                              !parsed.every((item) => typeof item === 'string')
                            ) {
                              toast.error(
                                'Invalid format — expected a JSON array of course name strings',
                              );
                              return;
                            }
                            const courseNames = parsed as string[];
                            if (courseNames.length === 0) {
                              toast.error('No courses found in the JSON');
                              return;
                            }
                            const current =
                              settings && '_id' in settings ? (settings.courses ?? []) : [];
                            const merged = [
                              ...new Set([
                                ...current,
                                ...courseNames.map((c) => c.trim()).filter(Boolean),
                              ]),
                            ];
                            const added = merged.length - current.length;
                            saveSettings({ courses: merged });
                            setCanvasJson('');
                            setCanvasImportOpen(false);
                            toast.success(
                              added > 0
                                ? `Imported ${added} new course${added > 1 ? 's' : ''}`
                                : 'All courses already exist',
                            );
                          } catch {
                            toast.error(
                              'Invalid JSON — make sure you copied the full output from the extension',
                            );
                          }
                        }}
                      >
                        Import Courses
                      </Button>
                    </div>
                  )}
                  {((settings && '_id' in settings ? settings.courses : undefined) ?? []).length >
                    0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {((settings && '_id' in settings ? settings.courses : undefined) ?? []).map(
                        (course) => (
                          <span
                            key={course}
                            className="inline-flex items-center gap-1 rounded-full glass-light px-2.5 py-1 text-xs text-foreground"
                          >
                            {course}
                            <button
                              type="button"
                              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => {
                                const current =
                                  settings && '_id' in settings ? (settings.courses ?? []) : [];
                                saveSettings({
                                  courses: current.filter((c) => c !== course),
                                });
                              }}
                            >
                              &times;
                            </button>
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                {stats && (
                  <div className="border-t border-[var(--glass-border)] pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {formatMinutes(stats.totalMinutes)} all-time
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Today</span>
                        <span>
                          {formatMinutes(stats.today.studyMinutes)} /{' '}
                          {formatMinutes(stats.today.goalMinutes)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (stats.today.studyMinutes / stats.today.goalMinutes) * 100,
                          100,
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>This Week</span>
                        <span>
                          {formatMinutes(stats.weeklyMinutes)} /{' '}
                          {formatMinutes(
                            settings && '_id' in settings ? settings.weeklyGoalMinutes : 600,
                          )}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (stats.weeklyMinutes /
                            (settings && '_id' in settings ? settings.weeklyGoalMinutes : 600)) *
                            100,
                          100,
                        )}
                        className="h-2"
                      />
                    </div>
                  </div>
                )}

                {/* Achievements */}
                <div className="border-t border-[var(--glass-border)] pt-4">
                  <h3 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Achievements
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
                      const unlocked = unlockedIds.has(achievement.id);
                      return (
                        <div
                          key={achievement.id}
                          className={cn(
                            'flex items-center gap-2 rounded-md border p-2 text-xs',
                            unlocked
                              ? 'border-[var(--glass-border-strong)] glass-light shadow-[0_0_8px_var(--glass-glow)]'
                              : 'border-[var(--glass-border)] glass-light opacity-50',
                          )}
                        >
                          {unlocked ? (
                            <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {achievement.name}
                            </p>
                            <p className="text-muted-foreground truncate">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeCategory === 'notifications' && (
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
                    <Switch checked={soundEnabled} onCheckedChange={handleSoundEnabledChange} />
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
                    Get OS-level alerts for new messages and friend requests, even when the tab is
                    in the background.
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
                        To enable: open your browser settings, find Site Permissions, and allow
                        notifications for this site.
                      </p>
                    </div>
                  )}

                  {pushPermission === 'default' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleEnablePushNotifications()}
                    >
                      <Bell className="h-4 w-4 mr-1.5" />
                      Enable Browser Notifications
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Account */}
            {activeCategory === 'account' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Username</Label>
                  {profile ? (
                    <p className="text-sm text-accent font-medium">@{profile.username}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Visit the{' '}
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => {
                          onOpenChange(false);
                          window.location.hash = '';
                          window.location.pathname = '/friends';
                        }}
                      >
                        Friends page
                      </button>{' '}
                      to set up your @username
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Name</Label>
                  {profile ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={displayNameInput}
                          onChange={(e) => {
                            setDisplayNameInput(e.target.value);
                            setDisplayNameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSaveDisplayName) {
                              void handleSaveDisplayName();
                            }
                          }}
                          placeholder="Your name"
                          className="bg-background border-border"
                          maxLength={50}
                        />
                        <Button
                          size="sm"
                          onClick={() => void handleSaveDisplayName()}
                          disabled={!canSaveDisplayName}
                        >
                          {isSavingDisplayName ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                      {displayNameError && (
                        <p className="text-xs text-destructive">{displayNameError}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Shown to friends, in study rooms, and in messages.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Set your name when you create your profile on the{' '}
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => {
                          onOpenChange(false);
                          window.location.hash = '';
                          window.location.pathname = '/friends';
                        }}
                      >
                        Friends page
                      </button>
                      .
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress ?? 'No email'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <Button variant="destructive" size="sm" onClick={() => signOut()}>
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

            {/* About */}
            {activeCategory === 'about' && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/nuggy-baby-boy.png"
                    alt="ScribeCat logo"
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">ScribeCat</h3>
                    <p className="text-sm text-muted-foreground">v{packageJson.version}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Your ADHD-friendly study companion. Record voice notes, take notes, and study
                  smarter.
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                    onClick={() =>
                      window.open('https://github.com/lmdrew96/scribecat-v3', '_blank')
                    }
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                    onClick={() =>
                      window.open('https://github.com/lmdrew96/scribecat-v3/issues', '_blank')
                    }
                  >
                    <Bug className="h-4 w-4" />
                    Report a Bug
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                    onClick={() => window.open('https://adhdesigns.dev', '_blank')}
                  >
                    <Palette className="h-4 w-4" />
                    ADHDesigns
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Legal</h4>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                    onClick={() => setShowTos(true)}
                  >
                    <FileText className="h-4 w-4" />
                    Terms of Service
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                    onClick={() => setShowPrivacy(true)}
                  >
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </button>
                </div>

                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <p className="text-xs text-muted-foreground">
                    Made with love for distracted minds everywhere.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <LegalDocModal
        open={showTos}
        onOpenChange={setShowTos}
        title="Terms of Service"
        content={tosContent}
      />
      <LegalDocModal
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        title="Privacy Policy"
        content={privacyContent}
      />
    </Dialog>
  );
}
