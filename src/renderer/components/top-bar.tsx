import { SettingsModal } from '@/components/settings-modal';
import { Button } from '@/components/ui/button';
import { WindowControls } from '@/components/window-controls';
import { BookOpen, Home, Moon, Settings, Sun } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  currentView: 'home' | 'study';
  onViewChange: (view: 'home' | 'study') => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const [isDark, setIsDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMac = window.electronAPI?.platform === 'darwin';

  return (
    <>
      <header
        className="relative flex h-14 items-center justify-between border-b border-border bg-card px-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left side - Logo (with macOS traffic light offset) */}
        <div className="flex items-center gap-3" style={{ marginLeft: isMac ? '70px' : '0' }}>
          <div
            className="flex items-center gap-2"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <img
              src="/images/untitled-20design.png"
              alt="ScribeCat logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="text-lg font-semibold text-foreground">ScribeCat</span>
          </div>
        </div>

        {/* Center - Navigation */}
        <nav
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
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

        {/* Right side - Theme, Settings, Window Controls */}
        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="h-8 w-8"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
          <WindowControls />
        </div>
      </header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
