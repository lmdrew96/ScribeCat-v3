import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGameActions } from '@/hooks/use-study-games';
import { Gamepad2, Swords, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface GameLauncherProps {
  roomId: Id<'studyRooms'>;
  hasPinnedSession: boolean;
}

export function GameLauncher({ roomId, hasPinnedSession }: GameLauncherProps) {
  const { createGame } = useGameActions();

  const handleCreate = async (gameType: 'quiz_battle' | 'jeopardy') => {
    try {
      await createGame({ roomId, gameType });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      toast.error(message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={!hasPinnedSession}
        >
          <Gamepad2 className="h-3 w-3" />
          <span className="hidden sm:inline">Games</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleCreate('quiz_battle')}>
          <Swords className="mr-2 h-3.5 w-3.5" />
          Quiz Battle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleCreate('jeopardy')}>
          <Trophy className="mr-2 h-3.5 w-3.5" />
          Jeopardy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
