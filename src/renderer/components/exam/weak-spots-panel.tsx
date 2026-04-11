import { Button } from '@/components/ui/button';
import { useWeakSpots } from '@/hooks/use-weak-spots';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface WeakSpotsPanelProps {
  examRoomId: Id<'examRooms'>;
}

export function WeakSpotsPanel({ examRoomId }: WeakSpotsPanelProps) {
  const {
    weakSpots,
    hasWeakSpots,
    resetWeakSpots,
    generateTargetedReview,
    isGeneratingReview,
    error,
    targetedReview,
  } = useWeakSpots(examRoomId);

  const [showReview, setShowReview] = useState(false);

  if (!hasWeakSpots && !targetedReview) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Target className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">No weak spots yet</p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Answer quiz questions or flashcards in Study Tools or Exam Simulation to start tracking
          your performance by topic
        </p>
      </div>
    );
  }

  if (showReview && targetedReview) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Targeted Review</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowReview(false)}
          >
            Back to Weak Spots
          </Button>
        </div>

        {/* Targeted flashcards */}
        {targetedReview.cards?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review Flashcards
            </h4>
            {targetedReview.cards.map(
              (card: { front: string; back: string; topic: string }, i: number) => (
                <ReviewCard key={i} card={card} />
              ),
            )}
          </div>
        )}

        {/* Targeted quiz questions */}
        {targetedReview.questions?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review Quiz
            </h4>
            {targetedReview.questions.map(
              (
                q: {
                  question: string;
                  options: string[];
                  correctIndex: number;
                  explanation: string;
                  topic: string;
                },
                i: number,
              ) => (
                <ReviewQuestion key={i} question={q} index={i} />
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Weak Spots</h3>
          <p className="text-xs text-muted-foreground">Topics ranked by accuracy — weakest first</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => void resetWeakSpots()}
          >
            <Trash2 className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Topic bars */}
      <div className="space-y-3">
        {weakSpots.map((topic, i) => {
          const pct = Math.round(topic.accuracy * 100);
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate">{topic.topic}</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400',
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--glass-bg)]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {topic.correctCount}/{topic.totalCount} correct
              </p>
            </div>
          );
        })}
      </div>

      {/* Targeted review */}
      <div className="glass-light rounded-lg p-4 border border-[var(--glass-border)] space-y-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Targeted Review</h4>
          <p className="text-xs text-muted-foreground">
            AI generates focused flashcards and quiz questions for your weakest topics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => void generateTargetedReview()}
            disabled={isGeneratingReview}
          >
            {isGeneratingReview ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Generate Review
              </>
            )}
          </Button>
          {targetedReview && (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => setShowReview(true)}
            >
              View Review
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────

function ReviewCard({ card }: { card: { front: string; back: string; topic: string } }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped(!flipped)}
      className="w-full text-left rounded-lg p-3 glass-light border border-[var(--glass-border)] transition-all hover:border-accent/30"
    >
      <span className="text-[10px] text-muted-foreground">{card.topic}</span>
      <p className="text-sm text-foreground mt-1">{flipped ? card.back : card.front}</p>
      <p className="text-[10px] text-muted-foreground mt-1">
        {flipped ? 'Click for question' : 'Click for answer'}
      </p>
    </button>
  );
}

function ReviewQuestion({
  question,
  index,
}: {
  question: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
  };
  index: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="rounded-lg p-3 glass-light border border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium text-accent">Q{index + 1}</span>
        <span className="text-[10px] text-muted-foreground">{question.topic}</span>
      </div>
      <p className="text-sm font-medium text-foreground mb-2">{question.question}</p>
      <div className="space-y-1">
        {question.options.map((opt, j) => (
          <button
            type="button"
            key={j}
            onClick={() => setSelected(j)}
            disabled={selected !== null}
            className={cn(
              'w-full text-left rounded-md px-3 py-1.5 text-xs transition-colors',
              selected !== null && j === question.correctIndex && 'bg-green-500/20 text-green-400',
              selected === j && j !== question.correctIndex && 'bg-red-500/20 text-red-400',
              selected === null && 'hover:bg-[var(--glass-bg-light)] text-foreground',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="text-xs text-muted-foreground mt-2 italic">{question.explanation}</p>
      )}
    </div>
  );
}
