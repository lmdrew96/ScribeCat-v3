import { Progress } from '@/components/ui/progress';

interface XpGain {
  amount: number;
  source: string;
  label: string;
  timestamp: number;
}

interface XpProgressProps {
  level: number;
  current: number;
  needed: number;
  percent: number;
  recentGains: XpGain[];
}

export function XpProgress({ level, current, needed, percent, recentGains }: XpProgressProps) {
  return (
    <div className="px-3 pb-3 space-y-2">
      {/* Level + progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-primary">Lv.{level}</span>
        <Progress value={percent} className="flex-1 h-1.5" />
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {current}/{needed}
        </span>
      </div>

      {/* Recent XP gains */}
      {recentGains.length > 0 && (
        <div className="space-y-0.5">
          {recentGains.slice(0, 3).map((gain) => (
            <div
              key={gain.timestamp}
              className="flex items-center justify-between text-[10px] leading-tight"
            >
              <span className="text-muted-foreground truncate mr-2">{gain.label}</span>
              <span className="text-success font-medium shrink-0">+{gain.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
