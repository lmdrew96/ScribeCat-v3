import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { Button } from '@/components/ui/button';
import { useGameActions } from '@/hooks/use-study-games';
import { cn } from '@/lib/utils';
import { RotateCcw, Swords, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { ActiveGame } from './game-view';

interface GameResultsProps {
  game: ActiveGame;
  currentUserId: string;
  isHost: boolean;
}

export function GameResults({ game, currentUserId, isHost }: GameResultsProps) {
  const { createGame, cancelGame } = useGameActions();

  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const gameLabel = game.gameType === 'quiz_battle' ? 'Quiz Battle' : 'Jeopardy';
  const GameIcon = game.gameType === 'quiz_battle' ? Swords : Trophy;

  const handlePlayAgain = async () => {
    try {
      // Cancel/dismiss this finished game first, then create a new one
      await cancelGame({ gameId: game._id });
      await createGame({ roomId: game.roomId, gameType: game.gameType });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start new game';
      toast.error(message);
    }
  };

  const handleDismiss = async () => {
    try {
      await cancelGame({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to dismiss';
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <GameIcon className="h-5 w-5 text-accent" />
        <span className="text-lg font-bold text-foreground">{gameLabel} Results</span>
      </div>

      {/* Podium — top 3 */}
      <div className="flex items-end gap-4">
        {/* 2nd place */}
        {sorted[1] && <PodiumEntry player={sorted[1]} place={2} currentUserId={currentUserId} />}
        {/* 1st place */}
        {sorted[0] && <PodiumEntry player={sorted[0]} place={1} currentUserId={currentUserId} />}
        {/* 3rd place */}
        {sorted[2] && <PodiumEntry player={sorted[2]} place={3} currentUserId={currentUserId} />}
      </div>

      {/* Remaining players */}
      {sorted.length > 3 && (
        <div className="w-full max-w-xs space-y-1">
          {sorted.slice(3).map((player, i) => (
            <div
              key={player.userId}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 glass-light border border-[var(--glass-border)]"
            >
              <span className="text-[10px] text-muted-foreground w-4">{i + 4}.</span>
              <span className="flex-1 text-xs text-foreground truncate">{player.displayName}</span>
              <span className="text-xs font-medium text-foreground">{player.score}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        {isHost && (
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => void handlePlayAgain()}>
            <RotateCcw className="h-3 w-3" />
            Play Again
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs"
          onClick={() => void handleDismiss()}
        >
          {isHost ? 'Back to Room' : 'Dismiss'}
        </Button>
      </div>
    </div>
  );
}

// ─── Podium entry ───────────────────────────────────────────

interface PodiumEntryProps {
  player: ActiveGame['players'][number];
  place: 1 | 2 | 3;
  currentUserId: string;
}

const PLACE_STYLES = {
  1: { height: 'h-20', color: 'text-yellow-400', label: '1st' },
  2: { height: 'h-14', color: 'text-gray-300', label: '2nd' },
  3: { height: 'h-10', color: 'text-amber-600', label: '3rd' },
} as const;

function PodiumEntry({ player, place, currentUserId }: PodiumEntryProps) {
  const isMe = player.userId === currentUserId;
  const styles = PLACE_STYLES[place];

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Cat avatar */}
      <div
        className={cn(
          'rounded-full glass-light border-2',
          isMe ? 'border-accent' : 'border-[var(--glass-border)]',
        )}
      >
        {player.catVariant ? (
          <CatDisplay
            mood={place === 1 ? 'excited' : 'happy'}
            variant={player.catVariant as CatVariant}
            size={place === 1 ? 'large' : 'small'}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full',
              place === 1 ? 'h-16 w-16' : 'h-10 w-10',
            )}
          >
            <span className="text-sm font-bold text-foreground">
              {player.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-medium text-foreground truncate max-w-[80px]">
        {player.displayName}
      </p>
      <p className="text-xs font-bold text-foreground">{player.score}</p>
      {/* Podium bar */}
      <div
        className={cn(
          'w-16 rounded-t-md glass-light border border-[var(--glass-border)] flex items-center justify-center',
          styles.height,
        )}
      >
        <span className={cn('text-xs font-bold', styles.color)}>{styles.label}</span>
      </div>
    </div>
  );
}
