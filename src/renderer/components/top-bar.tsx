import { SettingsModal } from '@/components/settings-modal';
import { Button } from '@/components/ui/button';
import { useStudyStats } from '@/hooks/use-productivity';
import { BookOpen, Flame, Home, Settings } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  currentView: 'home' | 'study';
  onViewChange: (view: 'home' | 'study') => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const stats = useStudyStats();

  return (
    <>
      <header className="glass relative z-40 flex h-[4.5rem] items-center justify-between border-b border-[var(--glass-border)] px-3 sm:px-6">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/nuggy-baby-boy.png"
              alt="ScribeCat logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="hidden sm:inline text-lg font-semibold text-foreground">
              ScribeCat
            </span>
          </div>
        </div>

        {/* Center - Navigation */}
        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
          <Button
            variant={currentView === 'home' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('home')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <Button
            variant={currentView === 'study' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('study')}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Study</span>
          </Button>
        </nav>

        {/* Right side - Streak + Settings */}
        <div className="flex items-center gap-2">
          {stats && stats.streak > 0 && (
            <div className="glass-light flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-orange-500">
              <Flame className="h-3.5 w-3.5" />
              <span>{stats.streak}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
