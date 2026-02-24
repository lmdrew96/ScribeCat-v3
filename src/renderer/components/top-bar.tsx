import { SettingsModal } from '@/components/settings-modal';
import { Button } from '@/components/ui/button';
import { useSessionContext } from '@/contexts/session-context';
import { useFriends } from '@/hooks/use-friends';
import { useUnreadCount } from '@/hooks/use-messaging';
import { usePendingRoomCount } from '@/hooks/use-study-rooms';
import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpen, Cat, DoorOpen, Home, MessageSquare, Settings, Users } from 'lucide-react';
import { useState } from 'react';

export function TopBar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setChatOpen } = useSessionContext();
  const { pendingCount } = useFriends();
  const unreadCount = useUnreadCount();
  const pendingRoomCount = usePendingRoomCount();

  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isHome = currentPath === '/';
  const isStudy = currentPath.startsWith('/study');
  const isFriends = currentPath === '/friends';
  const isMessages = currentPath.startsWith('/messages');
  const isRooms = currentPath.startsWith('/rooms');

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
          <Button variant={isHome ? 'secondary' : 'ghost'} size="sm" className="gap-2" asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
          <Button variant={isStudy ? 'secondary' : 'ghost'} size="sm" className="gap-2" asChild>
            <Link to="/study">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Study</span>
            </Link>
          </Button>
          <Button
            variant={isFriends ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 relative"
            asChild
          >
            <Link to="/friends">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant={isMessages ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 relative"
            asChild
          >
            <Link to="/messages">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant={isRooms ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 relative"
            asChild
          >
            <Link to="/rooms">
              <DoorOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rooms</span>
              {pendingRoomCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {pendingRoomCount}
                </span>
              )}
            </Link>
          </Button>
        </nav>

        {/* Right side - Settings */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary"
            onClick={() => setChatOpen(true)}
            title="Chat with Nugget"
          >
            <Cat className="h-4 w-4" />
            <span className="sr-only">Chat with Nugget</span>
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
        </div>
      </header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
