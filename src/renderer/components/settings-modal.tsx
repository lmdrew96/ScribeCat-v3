import { useNyanUnlocked } from '@/components/easter-eggs/use-nyan-unlock';
import { LegalDocModal } from '@/components/legal-doc-modal';
import { AboutTab } from '@/components/settings/about-tab';
import { AccountTab } from '@/components/settings/account-tab';
import { AppearanceTab } from '@/components/settings/appearance-tab';
import { AudioTab } from '@/components/settings/audio-tab';
import { NotificationsTab } from '@/components/settings/notifications-tab';
import { StudyTab } from '@/components/settings/study-tab';
import { WhatsNewTab } from '@/components/settings/whats-new-tab';
import { type Theme, useTheme } from '@/components/theme-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiKeys } from '@/hooks/use-api-keys';
import { readChangelogSeenVersion, useChangelog } from '@/hooks/use-changelog';
import { useAchievements, useStudySettings, useStudyStats } from '@/hooks/use-productivity';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getPermissionStatus, requestNotificationPermission } from '@/lib/push-notifications';
import { cn } from '@/lib/utils';
import { useClerk, useUser } from '@clerk/clerk-react';
import { Bell, BookOpen, Info, Mic, Palette, Sparkles, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';
import privacyContent from '../../../docs/PRIVACY_POLICY.md?raw';
import tosContent from '../../../docs/TERMS_OF_SERVICE.md?raw';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory =
  | 'appearance'
  | 'audio'
  | 'study'
  | 'notifications'
  | 'account'
  | 'whats-new'
  | 'about';

const categories = [
  { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  { id: 'audio' as const, label: 'Audio', icon: Mic },
  { id: 'study' as const, label: 'Study', icon: BookOpen },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'account' as const, label: 'Account', icon: User },
  { id: 'whats-new' as const, label: "What's New", icon: Sparkles },
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
    colors: ['#00062e', '#0b1547', '#ffea00', '#ff6ec7'],
    secret: true,
  },
  {
    id: 'nyan-cat-light',
    name: 'Nyan Cat Light 🌈',
    colors: ['#fff0ff', '#ffe0ff', '#ff00aa', '#330033'],
    secret: true,
  },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const { hasUnseen: hasUnseenChanges, markSeen: markChangelogRead } = useChangelog();
  // Snapshot of the last-read version, taken as the tab opens. `markChangelogRead`
  // immediately advances the stored value, so without this the "previously read"
  // divider would vanish the instant the user looked at it.
  const [changelogSeenSnapshot, setChangelogSeenSnapshot] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const nyanUnlocked = useNyanUnlocked();
  // Hide secret (unlockable) themes from the picker until their trigger has fired —
  // BUT keep the currently-selected theme visible so users aren't stranded on a
  // theme they can no longer re-select.
  const visibleThemes = themes.filter((t) => !t.secret || nyanUnlocked || t.id === theme);
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

  // Opening What's New counts as reading it.
  useEffect(() => {
    if (activeCategory !== 'whats-new') return;
    setChangelogSeenSnapshot(readChangelogSeenVersion());
    markChangelogRead();
  }, [activeCategory, markChangelogRead]);

  const handleNavigateToFriends = () => {
    onOpenChange(false);
    window.location.hash = '';
    window.location.pathname = '/friends';
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

  // API keys
  const { keys: apiKeys, generateKey, revokeKey } = useApiKeys();
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const { apiKey } = await generateKey({ label: newKeyLabel.trim() || undefined });
      setGeneratedKey(apiKey);
      setNewKeyLabel('');
      toast.success('API key generated');
    } catch {
      toast.error('Failed to generate key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = (id: Id<'apiKeys'>) => {
    void revokeKey({ id });
  };

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

  const handleTimezoneChange = (value: string) => {
    const resolved = value === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : value;
    setTimezone(resolved);
    saveSettings({ timezone: resolved });
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

  const handleAddCourse = () => {
    if (!newCourse.trim()) return;
    const current = settings && '_id' in settings ? (settings.courses ?? []) : [];
    if (!current.includes(newCourse.trim())) {
      saveSettings({ courses: [...current, newCourse.trim()] });
    }
    setNewCourse('');
  };

  const handleRemoveCourse = (course: string) => {
    const current = settings && '_id' in settings ? (settings.courses ?? []) : [];
    saveSettings({ courses: current.filter((c) => c !== course) });
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
                  {category.id === 'whats-new' && hasUnseenChanges && (
                    <span
                      className="ml-auto h-2 w-2 shrink-0 rounded-full bg-destructive"
                      aria-label="Unread updates"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory === 'appearance' && (
              <AppearanceTab
                visibleThemes={visibleThemes}
                activeTheme={theme}
                onSelectTheme={handleThemeChange}
              />
            )}

            {activeCategory === 'audio' && (
              <AudioTab
                settings={settings}
                updateSettings={updateSettings}
                showWaveform={showWaveform}
                setShowWaveform={setShowWaveform}
                micLevel={micLevel}
                isTesting={isTesting}
                testMicrophone={testMicrophone}
              />
            )}

            {activeCategory === 'study' && (
              <StudyTab
                settings={settings}
                stats={stats}
                achievements={achievements}
                timezone={timezone}
                onTimezoneChange={handleTimezoneChange}
                breakReminders={breakReminders}
                onBreakRemindersChange={handleBreakRemindersChange}
                breakInterval={breakInterval}
                onBreakIntervalChange={handleBreakIntervalChange}
                dailyGoalHours={dailyGoalHours}
                dailyGoalMinutes={dailyGoalMinutes}
                onDailyGoalChange={handleDailyGoalChange}
                weeklyGoal={weeklyGoal}
                onWeeklyGoalChange={handleWeeklyGoalChange}
                nuggetNotesEnabled={nuggetNotesEnabled}
                onNuggetNotesEnabledChange={(checked) => {
                  setNuggetNotesEnabled(checked);
                  saveSettings({ nuggetNotesEnabled: checked });
                }}
                newCourse={newCourse}
                onNewCourseChange={setNewCourse}
                onAddCourse={handleAddCourse}
                onRemoveCourse={handleRemoveCourse}
              />
            )}

            {activeCategory === 'notifications' && (
              <NotificationsTab
                soundEnabled={soundEnabled}
                onSoundEnabledChange={handleSoundEnabledChange}
                pushPermission={pushPermission}
                onEnablePushNotifications={() => void handleEnablePushNotifications()}
              />
            )}

            {activeCategory === 'account' && (
              <AccountTab
                profile={profile}
                user={user}
                onNavigateToFriends={handleNavigateToFriends}
                displayNameInput={displayNameInput}
                onDisplayNameInputChange={(value) => {
                  setDisplayNameInput(value);
                  setDisplayNameError(null);
                }}
                displayNameError={displayNameError}
                isSavingDisplayName={isSavingDisplayName}
                canSaveDisplayName={canSaveDisplayName}
                onSaveDisplayName={() => void handleSaveDisplayName()}
                apiKeys={apiKeys}
                generatedKey={generatedKey}
                onDoneWithGeneratedKey={() => setGeneratedKey(null)}
                newKeyLabel={newKeyLabel}
                onNewKeyLabelChange={setNewKeyLabel}
                isGeneratingKey={isGeneratingKey}
                onGenerateKey={() => void handleGenerateKey()}
                onRevokeKey={handleRevokeKey}
                onSignOut={() => signOut()}
              />
            )}

            {activeCategory === 'whats-new' && (
              <WhatsNewTab previouslySeenVersion={changelogSeenSnapshot} />
            )}

            {activeCategory === 'about' && (
              <AboutTab
                onShowTos={() => setShowTos(true)}
                onShowPrivacy={() => setShowPrivacy(true)}
                onShowWhatsNew={() => setActiveCategory('whats-new')}
              />
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
