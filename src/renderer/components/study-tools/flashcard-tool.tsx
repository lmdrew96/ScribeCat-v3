/**
 * Flashcard Tool — AI-generated flashcards with Browse and Learn modes
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { renderInline } from '@/lib/render-markdown';
import type { FlashcardResult } from '@/types/study-tools';
import { useMutation, useQuery } from 'convex/react';
import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface FlashcardToolProps {
  sessionId: Id<'sessions'>;
}

type Mode = 'browse' | 'learn';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-red-500',
};

function formatTimeUntil(ms: number): string {
  if (ms <= 0) return 'now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function FlashcardTool({ sessionId }: FlashcardToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<FlashcardResult>(
    sessionId,
    'flashcards',
  );
  const progress = useQuery(api.studyTools.getFlashcardProgress, { sessionId });
  const saveProgress = useMutation(api.studyTools.saveFlashcardProgress);

  const [browseIndex, setBrowseIndex] = useState(0);
  const [learnPos, setLearnPos] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');

  const cardCount = data?.cards.length ?? 0;

  const dueIndices = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.cards
      .map((_, idx) => idx)
      .filter((idx) => {
        const p = progress?.find((pp) => pp.cardIndex === idx);
        return !p || (p.nextReview ?? 0) <= now;
      });
  }, [data, progress]);

  const nextDueAt = useMemo(() => {
    if (!progress || progress.length === 0) return null;
    const now = Date.now();
    const futureReviews = progress
      .map((p) => p.nextReview)
      .filter((t): t is number => t !== undefined && t > now);
    return futureReviews.length > 0 ? Math.min(...futureReviews) : null;
  }, [progress]);

  const currentIndex =
    mode === 'learn' ? (dueIndices[learnPos] ?? dueIndices[0] ?? 0) : browseIndex;

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (mode === 'learn') {
      if (dueIndices.length === 0) return;
      setLearnPos((prev) => (prev + 1) % dueIndices.length);
    } else {
      if (cardCount === 0) return;
      setBrowseIndex((prev) => (prev + 1) % cardCount);
    }
  }, [mode, dueIndices.length, cardCount]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    if (mode === 'learn') {
      if (dueIndices.length === 0) return;
      setLearnPos((prev) => (prev - 1 + dueIndices.length) % dueIndices.length);
    } else {
      if (cardCount === 0) return;
      setBrowseIndex((prev) => (prev - 1 + cardCount) % cardCount);
    }
  }, [mode, dueIndices.length, cardCount]);

  const handleSetMode = useCallback((next: Mode) => {
    setMode(next);
    setIsFlipped(false);
    if (next === 'learn') setLearnPos(0);
  }, []);

  const handleConfidence = useCallback(
    async (confidence: string) => {
      await saveProgress({ sessionId, cardIndex: currentIndex, confidence });
      setIsFlipped(false);
      // After rating, the current card leaves dueIndices. Clamp learnPos
      // to stay within the new (smaller) list. The reactive progress query
      // re-runs, so dueIndices updates on the next render.
      setLearnPos((prev) => {
        const nextLen = Math.max(0, dueIndices.length - 1);
        if (nextLen === 0) return 0;
        return prev >= nextLen ? 0 : prev;
      });
    },
    [sessionId, currentIndex, saveProgress, dueIndices.length],
  );

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={() => generate({ count: 10 })}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Generate Flashcards"
        description="Create study flashcards from your session content."
      />
    );
  }

  // Learn mode with nothing due: show caught-up state
  if (mode === 'learn' && dueIndices.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-6 px-2 text-[10px]"
              onClick={() => handleSetMode('browse')}
            >
              <BookOpen className="h-3 w-3" />
              Browse
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1 h-6 px-2 text-[10px]"
              onClick={() => handleSetMode('learn')}
            >
              <GraduationCap className="h-3 w-3" />
              Learn
            </Button>
          </div>
          <GenerateButton
            onGenerate={() => generate({ count: 10 })}
            isGenerating={isGenerating}
            hasData={hasData}
            error={error}
          />
        </div>
        <Card className="flex flex-col items-center justify-center p-4 min-h-[80px] text-center">
          <p className="text-xs font-medium text-foreground">All caught up!</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {nextDueAt
              ? `Next card due in ${formatTimeUntil(nextDueAt - Date.now())}`
              : 'Switch to Browse to review any card.'}
          </p>
        </Card>
      </div>
    );
  }

  const card = data.cards[currentIndex];
  const cardProgress = progress?.find((p: { cardIndex: number }) => p.cardIndex === currentIndex);

  return (
    <div className="space-y-2">
      {/* Header: mode toggle + regenerate */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button
            variant={mode === 'browse' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1 h-6 px-2 text-[10px]"
            onClick={() => handleSetMode('browse')}
          >
            <BookOpen className="h-3 w-3" />
            Browse
          </Button>
          <Button
            variant={mode === 'learn' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1 h-6 px-2 text-[10px]"
            onClick={() => handleSetMode('learn')}
          >
            <GraduationCap className="h-3 w-3" />
            Learn
          </Button>
        </div>
        <GenerateButton
          onGenerate={() => generate({ count: 10 })}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>

      {/* Card display */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Card
          className="flex-1 min-h-[80px] cursor-pointer p-3 transition-all hover:bg-[var(--glass-bg-light)] relative"
          style={{ perspective: '600px' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div
            className="flex flex-col items-center justify-center min-h-[56px] transition-transform duration-300"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
            }}
          >
            <div
              className="text-center w-full"
              style={{
                backfaceVisibility: 'hidden',
                display: isFlipped ? 'none' : 'block',
              }}
            >
              <p className="text-xs font-medium text-foreground">{renderInline(card.front)}</p>
              <span className={`text-[10px] ${DIFFICULTY_COLORS[card.difficulty] || ''}`}>
                {card.difficulty}
              </span>
            </div>
            <div
              className="text-center w-full"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                display: isFlipped ? 'block' : 'none',
              }}
            >
              <p className="text-xs text-foreground/90">{renderInline(card.back)}</p>
              <span className="text-[10px] text-muted-foreground">{card.topic}</span>
            </div>
          </div>

          {/* Progress badge */}
          {cardProgress && (
            <span className="absolute top-1 right-1 text-[9px] px-1 py-0.5 rounded glass-light text-muted-foreground">
              {cardProgress.confidence}
            </span>
          )}
        </Card>

        <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 shrink-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Footer: counter or confidence buttons */}
      <div className="flex items-center justify-center gap-2">
        {mode === 'browse' && (
          <span className="text-[10px] text-muted-foreground">
            {currentIndex + 1} / {data.cards.length}
          </span>
        )}
        {mode === 'learn' && !isFlipped && (
          <span className="text-[10px] text-muted-foreground">
            Tap card to reveal &middot; {learnPos + 1} / {dueIndices.length} due
          </span>
        )}
        {mode === 'learn' && isFlipped && (
          <div className="flex gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => handleConfidence('again')}
            >
              <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
              Again
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => handleConfidence('hard')}
            >
              Hard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => handleConfidence('good')}
            >
              Good
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => handleConfidence('easy')}
            >
              Easy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
