import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { Button } from '@/components/ui/button';
import { useGameActions } from '@/hooks/use-study-games';
import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, Swords, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ActiveGame } from './game-view';

interface GameLobbyProps {
  game: ActiveGame;
  currentUserId: string;
  isHost: boolean;
}

export function GameLobby({ game, currentUserId, isHost }: GameLobbyProps) {
  const { toggleReady, startGame, cancelGame } = useGameActions();

  const isGenerating = game.status === 'generating';
  const allReady = game.players.every((p) => p.isReady);
  const gameLabel = game.gameType === 'quiz_battle' ? 'Quiz Battle' : 'Jeopardy';
  const GameIcon = game.gameType === 'quiz_battle' ? Swords : Trophy;

  const handleToggleReady = async () => {
    try {
      await toggleReady({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle ready';
      toast.error(message);
    }
  };

  const handleStart = async () => {
    try {
      await startGame({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelGame({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel game';
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      {/* Game type badge */}
      <div className="flex items-center gap-2 rounded-full px-4 py-1.5 glass-light border border-[var(--glass-border)]">
        <GameIcon className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-foreground">{gameLabel}</span>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <p className="text-sm text-foreground font-medium">Generating questions...</p>
          <p className="text-xs text-muted-foreground">This takes a few seconds</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Waiting for all players to ready up</p>

          {/* Player list */}
          <div className="w-full max-w-xs space-y-2">
            {game.players.map((player) => {
              const isMe = player.userId === currentUserId;
              return (
                <div
                  key={player.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 glass-light border',
                    isMe ? 'border-accent/40' : 'border-[var(--glass-border)]',
                  )}
                >
                  {/* Cat avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full glass-light shrink-0">
                    {player.catVariant ? (
                      <CatDisplay
                        mood="idle"
                        variant={player.catVariant as CatVariant}
                        size="small"
                      />
                    ) : (
                      <span className="text-xs font-medium text-foreground">
                        {player.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {player.displayName}
                      {isMe && <span className="text-muted-foreground ml-1">(you)</span>}
                    </p>
                  </div>

                  {/* Ready indicator */}
                  {player.isReady ? (
                    <Check className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => void handleToggleReady()}
            >
              {game.players.find((p) => p.userId === currentUserId)?.isReady ? (
                <>
                  <X className="h-3 w-3" />
                  Unready
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Ready
                </>
              )}
            </Button>

            {isHost && (
              <>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!allReady}
                  onClick={() => void handleStart()}
                >
                  Start Game
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => void handleCancel()}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
