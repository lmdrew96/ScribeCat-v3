import { type Theme, useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BookOpen, Bug, Check, ExternalLink, Github, Info, Mic, Palette, User } from 'lucide-react';
import { useState } from 'react';
import packageJson from '../../../package.json';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsCategory = 'appearance' | 'audio' | 'study' | 'account' | 'about';

const categories = [
  { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  { id: 'audio' as const, label: 'Audio', icon: Mic },
  { id: 'study' as const, label: 'Study', icon: BookOpen },
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
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const { theme, setTheme } = useTheme();
  const [showWaveform, setShowWaveform] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [breakInterval, setBreakInterval] = useState('25');
  const [dailyGoalHours, setDailyGoalHours] = useState('2');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState('0');
  const [weeklyGoal, setWeeklyGoal] = useState('10');
  const [displayName, setDisplayName] = useState('Student');
  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  const testMicrophone = () => {
    setIsTesting(true);
    // Simulate mic level changes
    const interval = setInterval(() => {
      setMicLevel(Math.random() * 100);
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setIsTesting(false);
      setMicLevel(0);
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[600px] max-h-[90vh] w-[800px] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 bg-card border-border">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-semibold text-foreground">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="flex w-48 flex-col gap-1 border-r border-border bg-background/50 p-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    activeCategory === category.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Appearance */}
            {activeCategory === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((themeOption) => (
                      <button
                        type="button"
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id as Theme)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                          theme === themeOption.id
                            ? 'border-accent bg-accent/10 ring-1 ring-accent'
                            : 'border-border bg-background hover:border-muted-foreground/50',
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
                    <div className="flex h-6 flex-1 items-center gap-0.5 rounded bg-background px-2">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={`mic-level-${i}`}
                          className={cn(
                            'h-3 w-1 rounded-sm transition-all',
                            i < micLevel / 5 ? 'bg-success' : 'bg-border',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Show waveform while recording</Label>
                  <Switch checked={showWaveform} onCheckedChange={setShowWaveform} />
                </div>
              </div>
            )}

            {/* Study */}
            {activeCategory === 'study' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm text-foreground">Break Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get reminded to take breaks</p>
                  </div>
                  <Switch checked={breakReminders} onCheckedChange={setBreakReminders} />
                </div>

                {breakReminders && (
                  <div className="space-y-2">
                    <Label className="text-sm text-foreground">Break Interval</Label>
                    <Select value={breakInterval} onValueChange={setBreakInterval}>
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

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Daily Study Goal</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={dailyGoalHours}
                      onChange={(e) => setDailyGoalHours(e.target.value)}
                      className="w-20 bg-background border-border"
                    />
                    <span className="text-xs text-muted-foreground">hours</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={dailyGoalMinutes}
                      onChange={(e) => setDailyGoalMinutes(e.target.value)}
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
                      onChange={(e) => setWeeklyGoal(e.target.value)}
                      className="w-20 bg-background border-border"
                    />
                    <span className="text-xs text-muted-foreground">hours</span>
                  </div>
                </div>
              </div>
            )}

            {/* Account */}
            {activeCategory === 'account' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Email</Label>
                  <p className="text-sm text-muted-foreground">student@university.edu</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button variant="destructive" size="sm">
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
                  Your ADHD-friendly lecture companion. Take notes, record lectures, and study
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
                    onClick={() => window.open('https://adhdesigns.co', '_blank')}
                  >
                    <Palette className="h-4 w-4" />
                    ADHDesigns
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Made with love for distracted minds everywhere.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
