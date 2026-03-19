import { Button } from '@/components/ui/button';
import { useNotificationSounds } from '@/hooks/use-notification-sounds';
import { useStudyQuest } from '@/hooks/use-study-quest';
import { ChevronDown, Palette, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CatDisplay } from './cat-display';
import { CatNameEditor } from './cat-name-editor';
import { CAT_VARIANTS, type CatVariant } from './cat-sprites';
import { XpProgress } from './xp-progress';

const MOOD_LABELS: Record<string, string> = {
  idle: "Chillin'",
  happy: 'Happy!',
  studying: 'Studying...',
  sleepy: 'Sleepy...',
  excited: 'Level up!!',
};

export function StudyQuestWidget() {
  const {
    isAdopted,
    isLoading,
    name,
    variant,
    totalXp,
    level,
    xpProgress,
    mood,
    recentGains,
    adoptCat,
    renameCat,
    changeVariant,
  } = useStudyQuest();

  const [expanded, setExpanded] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [adoptName, setAdoptName] = useState('');
  const [adoptVariant, setAdoptVariant] = useState<CatVariant>('grey');
  const prevLevelRef = useRef(level);
  const { playSound } = useNotificationSounds();

  // Level-up toast + sound
  useEffect(() => {
    if (prevLevelRef.current > 0 && level > prevLevelRef.current) {
      playSound('levelup');
      toast.success(`${name} reached Level ${level}!`, {
        description: 'Keep studying to level up more!',
        duration: 4000,
      });
    }
    prevLevelRef.current = level;
  }, [level, name, playSound]);

  if (isLoading) return null;

  // ─── Adopt flow ─────────────────────────────────────────────
  if (!isAdopted) {
    if (!expanded) {
      return (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="fixed bottom-4 left-4 z-40 h-12 w-12 rounded-full glass-heavy glass-hover flex items-center justify-center cursor-pointer transition-all duration-200"
          title="Adopt your study cat!"
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </button>
      );
    }

    return (
      <div className="fixed bottom-4 left-4 z-40 w-64 glass rounded-xl glass-slide-up overflow-hidden">
        <div className="p-4 flex flex-col items-center gap-3">
          {/* Preview selected cat */}
          <CatDisplay mood="idle" variant={adoptVariant} size="large" />

          <p className="text-sm font-medium text-foreground text-center">
            Adopt a study companion!
          </p>

          {/* Variant picker */}
          <div className="w-full">
            <p className="text-[10px] text-muted-foreground mb-1.5">Choose your cat:</p>
            <div className="flex flex-wrap gap-1">
              {CAT_VARIANTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setAdoptVariant(v.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                    adoptVariant === v.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[var(--glass-bg-light)] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <input
            value={adoptName}
            onChange={(e) => setAdoptName(e.target.value)}
            placeholder="Name your cat (default: Nugget)"
            maxLength={20}
            className="w-full bg-[var(--glass-bg-light)] border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--glass-border-strong)]"
          />

          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => setExpanded(false)}
            >
              Later
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => {
                adoptCat({
                  name: adoptName.trim() || undefined,
                  variant: adoptVariant,
                });
                setExpanded(false);
              }}
            >
              Adopt!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Collapsed state ────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 left-4 z-40 group cursor-pointer"
        title={`${name} — Lv.${level}`}
      >
        <div className="relative rounded-2xl glass-heavy glass-hover p-1.5 transition-all duration-200">
          <CatDisplay mood={mood} variant={variant} size="small" />
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {level}
          </span>
        </div>
      </button>
    );
  }

  // ─── Expanded state ─────────────────────────────────────────
  return (
    <div className="fixed bottom-4 left-4 z-40 w-60 glass rounded-xl glass-slide-up overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--glass-border)]">
        <CatNameEditor name={name} onRename={(n) => renameCat({ name: n })} />
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowVariants(!showVariants)}
            title="Change cat style"
          >
            <Palette className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setExpanded(false);
              setShowVariants(false);
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Variant picker (toggled) */}
      {showVariants && (
        <div className="px-3 py-2 border-b border-[var(--glass-border)]">
          <div className="flex flex-wrap gap-1">
            {CAT_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  changeVariant({ variant: v.id });
                  setShowVariants(false);
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                  variant === v.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[var(--glass-bg-light)] text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cat display */}
      <div className="flex flex-col items-center py-3">
        <CatDisplay mood={mood} variant={variant} size="large" />
        <span className="text-[11px] text-muted-foreground mt-1.5 capitalize">
          {MOOD_LABELS[mood] ?? mood}
        </span>
      </div>

      {/* XP Progress */}
      <XpProgress
        level={xpProgress.level}
        current={xpProgress.current}
        needed={xpProgress.needed}
        percent={xpProgress.percent}
        recentGains={recentGains}
      />

      {/* Total XP footer */}
      <div className="px-3 pb-2 flex justify-center">
        <span className="text-[10px] text-muted-foreground">
          {totalXp.toLocaleString()} total XP
        </span>
      </div>
    </div>
  );
}
