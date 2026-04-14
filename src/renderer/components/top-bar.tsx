import { SettingsModal } from '@/components/settings-modal';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSessionContext } from '@/contexts/session-context';
import { usePendingExamRoomCount } from '@/hooks/use-exam-room';
import { useFriends } from '@/hooks/use-friends';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useUnreadCount } from '@/hooks/use-messaging';
import { usePendingRoomCount } from '@/hooks/use-study-rooms';
import { cn } from '@/lib/utils';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  Cat,
  DoorOpen,
  GraduationCap,
  Home,
  Menu,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
}

export function TopBar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { setChatOpen } = useSessionContext();
  const { pendingCount } = useFriends();
  const unreadCount = useUnreadCount();
  const pendingRoomCount = usePendingRoomCount();
  const pendingExamRoomCount = usePendingExamRoomCount();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isHome = currentPath === '/';
  const isStudy = currentPath.startsWith('/study');
  const isFriends = currentPath === '/friends';
  const isMessages = currentPath.startsWith('/messages');
  const isRooms = currentPath.startsWith('/rooms');
  const isExam = currentPath.startsWith('/exam');

  const totalBadgeCount = (pendingCount || 0) + (unreadCount || 0)
    + (pendingRoomCount || 0) + (pendingExamRoomCount || 0);

  const navItems: NavItem[] = [
    { to: '/', icon: <Home className="h-4 w-4" />, label: 'Home', isActive: isHome },
    { to: '/study', icon: <BookOpen className="h-4 w-4" />, label: 'Study', isActive: isStudy },
    {
      to: '/friends',
      icon: <Users className="h-4 w-4" />,
      label: 'Friends',
      isActive: isFriends,
      badge: pendingCount,
    },
    {
      to: '/messages',
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Messages',
      isActive: isMessages,
      badge: unreadCount,
    },
    {
      to: '/rooms',
      icon: <DoorOpen className="h-4 w-4" />,
      label: 'Rooms',
      isActive: isRooms,
      badge: pendingRoomCount,
    },
    {
      to: '/exam',
      icon: <GraduationCap className="h-4 w-4" />,
      label: 'Exam',
      isActive: isExam,
      badge: pendingExamRoomCount,
    },
  ];

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

        {/* Center - Navigation (desktop) */}
        {!isMobile && (
          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.to}
                variant={item.isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('gap-2', item.badge && item.badge > 0 && 'relative')}
                asChild
              >
                <Link to={item.to}>
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </nav>
        )}

        {/* Center - Hamburger menu (mobile) */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => setSheetOpen(true)}
          >
            <Menu className="h-5 w-5" />
            {totalBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
              </span>
            )}
            <span className="sr-only">Navigation menu</span>
          </Button>
        )}

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

      {/* Mobile navigation drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="left"
          className="glass-heavy border-[var(--glass-border)] p-0"
          showCloseButton={false}
        >
          <SheetHeader className="border-b border-[var(--glass-border)] px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <img
                src="/nuggy-baby-boy.png"
                alt="ScribeCat logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
              ScribeCat
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <SheetClose key={item.to} asChild>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors',
                    item.isActive
                      ? 'bg-[var(--glass-bg)] text-primary'
                      : 'text-muted-foreground hover:bg-[var(--glass-bg)] hover:text-foreground',
                  )}
                  onClick={() => {
                    navigate({ to: item.to });
                    setSheetOpen(false);
                  }}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
