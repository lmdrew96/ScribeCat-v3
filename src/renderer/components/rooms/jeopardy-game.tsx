import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGameActions } from '@/hooks/use-study-games';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, SkipForward, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ActiveGame } from './game-view';

interface JeopardyGameProps {
  game: ActiveGame;
  currentUserId: string;
  isHost: boolean;
}

const POINT_VALUES = [100, 200, 300, 400, 500];

export function JeopardyGame({ game, currentUserId, isHost }: JeopardyGameProps) {
  const { selectJeopardyCell, submitAnswer, advanceRound, skipRound } = useGameActions();
  const [submitting, setSubmitting] = useState(false);

  const isSelecting = game.roundPhase === 'selecting';
  const isAnswering = game.roundPhase === 'answering';
  const isRevealing = game.roundPhase === 'reveal';
  const isMyTurn = game.currentTurnUserId === currentUserId;

  const currentPlayer = game.players.find((p) => p.userId === currentUserId);
  const hasAnswered = currentPlayer?.hasAnsweredCurrentRound ?? false;
  const turnPlayer = game.players.find((p) => p.userId === game.currentTurnUserId);

  const revealed: number[][] = game.revealedCells ? JSON.parse(game.revealedCells) : [];
  const isCellRevealed = (catIdx: number, qIdx: number) =>
    revealed.some((c) => c[0] === catIdx && c[1] === qIdx);

  const handleSelectCell = async (catIdx: number, qIdx: number) => {
    if (!isSelecting || !isMyTurn) return;
    try {
      await selectJeopardyCell({
        gameId: game._id,
        categoryIndex: catIdx,
        questionIndex: qIdx,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select cell';
      toast.error(message);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (hasAnswered || submitting || isRevealing) return;
    setSubmitting(true);
    try {
      await submitAnswer({ gameId: game._id, answerIndex });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit answer';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    try {
      await advanceRound({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to advance';
      toast.error(message);
    }
  };

  const handleSkip = async () => {
    try {
      await skipRound({ gameId: game._id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip';
      toast.error(message);
    }
  };

  // Current point value for the active question
  const currentQIdx = game.currentRound % 5;
  const currentPointValue = POINT_VALUES[currentQIdx];

  return (
    <div className="flex flex-1 flex-col p-4 gap-3 overflow-auto">
      {/* Player scoreboard */}
      <div className="flex items-center gap-2 flex-wrap">
        {game.players
          .sort((a, b) => b.score - a.score)
          .map((player) => {
            const isMe = player.userId === currentUserId;
            const isTurn = player.userId === game.currentTurnUserId;
            return (
              <div
                key={player.userId}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]',
                  isTurn
                    ? 'bg-accent/20 border border-accent/50'
                    : isMe
                      ? 'glass-light border border-accent/30'
                      : 'glass-light border border-[var(--glass-border)]',
                )}
              >
                {player.catVariant ? (
                  <div className="h-5 w-5 shrink-0 overflow-hidden">
                    <CatDisplay
                      mood="idle"
                      variant={player.catVariant as CatVariant}
                      size="xsmall"
                    />
                  </div>
                ) : (
                  <span className="font-medium">{player.displayName.charAt(0)}</span>
                )}
                <span className="font-medium text-foreground">{player.score}</span>
                {isAnswering &&
                  (player.hasAnsweredCurrentRound ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                  ))}
                {isRevealing &&
                  player.lastAnswerCorrect !== undefined &&
                  (player.lastAnswerCorrect ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  ))}
              </div>
            );
          })}
      </div>

      {/* Selecting phase: Jeopardy board */}
      {isSelecting && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {isMyTurn
                ? 'Your turn — pick a category!'
                : `${turnPlayer?.displayName ?? 'Player'}'s turn to pick`}
            </p>
            <p className="text-[10px] text-muted-foreground">{revealed.length}/25 revealed</p>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {/* Category headers */}
            {(game.categoryNames ?? []).map((name) => (
              <div
                key={name}
                className="text-center text-[9px] font-medium text-accent truncate px-1 py-1"
              >
                {name}
              </div>
            ))}
            {/* Cells */}
            {POINT_VALUES.map((value, qIdx) =>
              (game.categoryNames ?? []).map((_, catIdx) => {
                const isRevealed = isCellRevealed(catIdx, qIdx);
                return (
                  <button
                    key={`${catIdx}-${qIdx}`}
                    type="button"
                    className={cn(
                      'rounded-lg py-2 text-xs font-bold transition-all',
                      isRevealed
                        ? 'bg-muted/30 text-muted-foreground/30 cursor-default'
                        : isMyTurn
                          ? 'glass-light border border-accent/30 text-accent hover:bg-accent/20 cursor-pointer'
                          : 'glass-light border border-[var(--glass-border)] text-foreground/60 cursor-default',
                    )}
                    disabled={isRevealed || !isMyTurn}
                    onClick={() => void handleSelectCell(catIdx, qIdx)}
                  >
                    {isRevealed ? '' : value}
                  </button>
                );
              }),
            )}
          </div>
        </>
      )}

      {/* Answering / Reveal phase */}
      {(isAnswering || isRevealing) && game.currentQuestion && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium text-accent">
              {game.currentQuestion.topic}
            </span>
            <span className="text-[10px] font-bold text-foreground">{currentPointValue} pts</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-3">
            {game.currentQuestion.question}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {game.currentQuestion.options.map((option, i) => {
              let variant: 'secondary' | 'default' | 'destructive' = 'secondary';
              let icon = null;

              if (isRevealing) {
                if (i === game.currentQuestion!.correctIndex) {
                  variant = 'default';
                  icon = <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
                } else if (i === currentPlayer?.lastAnswerIndex) {
                  variant = 'destructive';
                  icon = <XCircle className="h-3.5 w-3.5 shrink-0" />;
                }
              } else if (hasAnswered && i === currentPlayer?.lastAnswerIndex) {
                variant = 'default';
              }

              return (
                <Button
                  key={option}
                  variant={variant}
                  className="justify-start h-auto min-h-[36px] text-xs px-3 py-2 gap-1.5 whitespace-normal text-left"
                  onClick={() => void handleAnswer(i)}
                  disabled={hasAnswered || isRevealing || submitting}
                >
                  {icon}
                  {option}
                </Button>
              );
            })}
          </div>

          {/* Reveal explanation + advance */}
          {isRevealing && (
            <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
              {game.currentQuestion.explanation && (
                <p className="text-[11px] text-muted-foreground mb-2">
                  {game.currentQuestion.explanation}
                </p>
              )}
              <div className="flex justify-end">
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => void handleAdvance()}>
                  {revealed.length >= 25 ? 'See Results' : 'Next'}
                </Button>
              </div>
            </div>
          )}

          {/* Waiting + skip */}
          {isAnswering && hasAnswered && (
            <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Waiting for others...</p>
              {isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => void handleSkip()}
                >
                  <SkipForward className="h-3 w-3" />
                  Skip
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
