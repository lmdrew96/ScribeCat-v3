import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGameActions } from '@/hooks/use-study-games';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, SkipForward, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ActiveGame } from './game-view';

interface QuizBattleProps {
  game: ActiveGame;
  currentUserId: string;
  isHost: boolean;
}

export function QuizBattle({ game, currentUserId, isHost }: QuizBattleProps) {
  const { submitAnswer, advanceRound, skipRound } = useGameActions();
  const [submitting, setSubmitting] = useState(false);

  const settings = JSON.parse(game.settings) as { questionCount: number };
  const totalQuestions = settings.questionCount;
  const currentPlayer = game.players.find((p) => p.userId === currentUserId);
  const hasAnswered = currentPlayer?.hasAnsweredCurrentRound ?? false;
  const isRevealing = game.roundPhase === 'reveal';

  const progress = ((game.currentRound + (isRevealing ? 1 : 0)) / totalQuestions) * 100;

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

  const question = game.currentQuestion;
  if (!question) return null;

  return (
    <div className="flex flex-1 flex-col p-4 gap-3 overflow-auto">
      {/* Progress + scoreboard strip */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-[10px] text-muted-foreground shrink-0">
          {game.currentRound + 1}/{totalQuestions}
        </span>
      </div>

      {/* Player status row */}
      <div className="flex items-center gap-2 flex-wrap">
        {game.players
          .sort((a, b) => b.score - a.score)
          .map((player) => {
            const isMe = player.userId === currentUserId;
            return (
              <div
                key={player.userId}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]',
                  isMe
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
                {game.roundPhase === 'answering' &&
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

      {/* Question card */}
      <Card className="p-3">
        <p className="text-sm font-medium text-foreground mb-3">{question.question}</p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((option, i) => {
            let variant: 'secondary' | 'default' | 'destructive' = 'secondary';
            let icon = null;

            if (isRevealing) {
              if (i === question.correctIndex) {
                variant = 'default';
                icon = <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
              } else if (i === currentPlayer?.lastAnswerIndex) {
                variant = 'destructive';
                icon = <XCircle className="h-3.5 w-3.5 shrink-0" />;
              }
            } else if (hasAnswered && i === currentPlayer?.lastAnswerIndex) {
              // Waiting for others — highlight selected
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

        {/* Reveal phase: explanation + actions */}
        {isRevealing && (
          <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
            {question.explanation && (
              <p className="text-[11px] text-muted-foreground mb-2">{question.explanation}</p>
            )}
            <div className="flex items-center justify-between">
              {question.topic && (
                <span className="text-[10px] text-muted-foreground">{question.topic}</span>
              )}
              <Button size="sm" className="h-7 px-3 text-xs" onClick={() => void handleAdvance()}>
                {game.currentRound + 1 >= totalQuestions ? 'See Results' : 'Next'}
              </Button>
            </div>
          </div>
        )}

        {/* Answering phase: waiting + skip */}
        {!isRevealing && hasAnswered && (
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
    </div>
  );
}
