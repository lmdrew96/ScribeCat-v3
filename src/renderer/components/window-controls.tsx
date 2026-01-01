import { Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = window.electronAPI?.platform === 'darwin';

  // macOS uses native traffic lights, so don't render custom controls
  if (isMac) {
    return null;
  }

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    await window.electronAPI?.maximizeWindow();
    const maximized = await window.electronAPI?.isMaximized();
    setIsMaximized(maximized ?? false);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="flex items-center gap-0.5 -webkit-app-region-no-drag">
      <button
        type="button"
        onClick={handleMinimize}
        className="flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Minimize"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleMaximize}
        className="flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        <Square className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
