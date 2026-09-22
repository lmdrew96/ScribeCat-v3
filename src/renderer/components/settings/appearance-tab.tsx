import type { Theme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ThemeOption {
  id: string;
  name: string;
  colors: string[];
  secret?: boolean;
}

interface AppearanceTabProps {
  visibleThemes: ThemeOption[];
  activeTheme: string;
  onSelectTheme: (theme: Theme) => void;
}

export function AppearanceTab({ visibleThemes, activeTheme, onSelectTheme }: AppearanceTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">Theme</h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]">
          {visibleThemes.map((themeOption) => (
            <button
              type="button"
              key={themeOption.id}
              onClick={() => onSelectTheme(themeOption.id as Theme)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                activeTheme === themeOption.id
                  ? 'border-[var(--glass-border-strong)] bg-[var(--glass-bg)] shadow-[0_0_12px_var(--glass-glow)]'
                  : 'border-[var(--glass-border)] glass-light hover:bg-[var(--glass-bg)]',
              )}
            >
              <div className="flex gap-1">
                {themeOption.colors.map((color) => (
                  <div
                    key={color}
                    className="h-4 w-4 shrink-0 rounded-sm border border-card-foreground"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="flex w-full items-center justify-center gap-1 text-xs text-foreground">
                {activeTheme === themeOption.id && (
                  <Check className="h-3 w-3 shrink-0 text-accent" aria-hidden />
                )}
                <span className="truncate">{themeOption.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
