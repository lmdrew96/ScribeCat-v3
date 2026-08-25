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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleThemes.map((themeOption) => (
            <button
              type="button"
              key={themeOption.id}
              onClick={() => onSelectTheme(themeOption.id as Theme)}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                activeTheme === themeOption.id
                  ? 'border-[var(--glass-border-strong)] bg-[var(--glass-bg)] shadow-[0_0_12px_var(--glass-glow)]'
                  : 'border-[var(--glass-border)] glass-light hover:bg-[var(--glass-bg)]',
              )}
            >
              {activeTheme === themeOption.id && (
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
  );
}
