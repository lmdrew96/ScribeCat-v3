import { Button } from '@/components/ui/button';
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
import type { useAchievements, useStudySettings, useStudyStats } from '@/hooks/use-productivity';
import { cn } from '@/lib/utils';
import { Award, Check, Clock, Lock } from 'lucide-react';
import { ACHIEVEMENT_DEFINITIONS } from '../../../shared/achievements';

type Settings = ReturnType<typeof useStudySettings>['settings'];
type Stats = ReturnType<typeof useStudyStats>;
type Achievements = ReturnType<typeof useAchievements>;

interface StudyTabProps {
  settings: Settings;
  stats: Stats;
  achievements: Achievements;
  timezone: string;
  onTimezoneChange: (value: string) => void;
  breakReminders: boolean;
  onBreakRemindersChange: (checked: boolean) => void;
  breakInterval: string;
  onBreakIntervalChange: (value: string) => void;
  dailyGoalHours: string;
  dailyGoalMinutes: string;
  onDailyGoalChange: (hours: string, minutes: string) => void;
  weeklyGoal: string;
  onWeeklyGoalChange: (hours: string) => void;
  nuggetNotesEnabled: boolean;
  onNuggetNotesEnabledChange: (checked: boolean) => void;
  newCourse: string;
  onNewCourseChange: (value: string) => void;
  onAddCourse: () => void;
  onRemoveCourse: (course: string) => void;
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function StudyTab({
  settings,
  stats,
  achievements,
  timezone,
  onTimezoneChange,
  breakReminders,
  onBreakRemindersChange,
  breakInterval,
  onBreakIntervalChange,
  dailyGoalHours,
  dailyGoalMinutes,
  onDailyGoalChange,
  weeklyGoal,
  onWeeklyGoalChange,
  nuggetNotesEnabled,
  onNuggetNotesEnabledChange,
  newCourse,
  onNewCourseChange,
  onAddCourse,
  onRemoveCourse,
}: StudyTabProps) {
  const unlockedIds = new Set(achievements?.map((a) => a.achievementId) ?? []);
  const courses = (settings && '_id' in settings ? settings.courses : undefined) ?? [];

  return (
    <div className="space-y-5">
      {/* Timezone */}
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Timezone</Label>
        <p className="text-xs text-muted-foreground">
          Used for daily study stats, streaks, and AI time awareness
        </p>
        <Select value={timezone} onValueChange={onTimezoneChange}>
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
        <Switch checked={breakReminders} onCheckedChange={onBreakRemindersChange} />
      </div>

      {breakReminders && (
        <div className="space-y-2">
          <Label className="text-sm text-foreground">Break Interval</Label>
          <Select value={breakInterval} onValueChange={onBreakIntervalChange}>
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
            onChange={(e) => onDailyGoalChange(e.target.value, dailyGoalMinutes)}
            className="w-20 bg-background border-border"
          />
          <span className="text-xs text-muted-foreground">hours</span>
          <Input
            type="number"
            min="0"
            max="59"
            value={dailyGoalMinutes}
            onChange={(e) => onDailyGoalChange(dailyGoalHours, e.target.value)}
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
            onChange={(e) => onWeeklyGoalChange(e.target.value)}
            className="w-20 bg-background border-border"
          />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>
      </div>

      {/* Nugget's Notes */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm text-foreground">Nugget&apos;s Notes</Label>
          <p className="text-xs text-muted-foreground">Auto-generate AI notes during recording</p>
        </div>
        <Switch checked={nuggetNotesEnabled} onCheckedChange={onNuggetNotesEnabledChange} />
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
            onChange={(e) => onNewCourseChange(e.target.value)}
            placeholder="e.g. CISC 108"
            className="flex-1 bg-background border-border"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCourse.trim()) {
                e.preventDefault();
                onAddCourse();
              }
            }}
          />
          <Button variant="secondary" size="sm" onClick={onAddCourse}>
            Add
          </Button>
        </div>
        {courses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {courses.map((course) => (
              <span
                key={course}
                className="inline-flex items-center gap-1 rounded-full glass-light px-2.5 py-1 text-xs text-foreground"
              >
                {course}
                <button
                  type="button"
                  className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => onRemoveCourse(course)}
                >
                  &times;
                </button>
              </span>
            ))}
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
                {formatMinutes(stats.today.studyMinutes)} / {formatMinutes(stats.today.goalMinutes)}
              </span>
            </div>
            <Progress
              value={Math.min((stats.today.studyMinutes / stats.today.goalMinutes) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>This Week</span>
              <span>
                {formatMinutes(stats.weeklyMinutes)} /{' '}
                {formatMinutes(settings && '_id' in settings ? settings.weeklyGoalMinutes : 600)}
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
                  <p className="font-medium text-foreground truncate">{achievement.name}</p>
                  <p className="text-muted-foreground truncate">{achievement.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
