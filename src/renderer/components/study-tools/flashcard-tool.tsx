/**
 * Flashcard Tool — AI-generated flashcards with Browse and Learn modes
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FlashcardResult } from '@/types/study-tools';
import { useMutation, useQuery } from 'convex/react';
import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, RotateCcw } from 'lucide-react';
import { useCallback, useState } from 'react';
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

export function FlashcardTool({ sessionId }: FlashcardToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<FlashcardResult>(
    sessionId,
    'flashcards',
  );
  const progress = useQuery(api.studyTools.getFlashcardProgress, { sessionId });
  const saveProgress = useMutation(api.studyTools.saveFlashcardProgress);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');

  const handleNext = useCallback(() => {
    if (!data) return;
    setCurrentIndex((prev) => (prev + 1) % data.cards.length);
    setIsFlipped(false);
  }, [data]);

  const handlePrev = useCallback(() => {
    if (!data) return;
    setCurrentIndex((prev) => (prev - 1 + data.cards.length) % data.cards.length);
    setIsFlipped(false);
  }, [data]);

  const handleConfidence = useCallback(
    async (confidence: string) => {
      await saveProgress({ sessionId, cardIndex: currentIndex, confidence });
      handleNext();
    },
    [sessionId, currentIndex, saveProgress, handleNext],
  );

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={() => generate({ count: 10 })}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Generate Flashcards"
        description="Create study flashcards from your lecture content."
      />
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
            onClick={() => setMode('browse')}
          >
            <BookOpen className="h-3 w-3" />
            Browse
          </Button>
          <Button
            variant={mode === 'learn' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1 h-6 px-2 text-[10px]"
            onClick={() => setMode('learn')}
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
              <p className="text-xs font-medium text-foreground">{card.front}</p>
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
              <p className="text-xs text-foreground/90">{card.back}</p>
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
        {mode === 'browse' ? (
          <span className="text-[10px] text-muted-foreground">
            {currentIndex + 1} / {data.cards.length}
          </span>
        ) : isFlipped ? (
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
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Tap card to reveal &middot; {currentIndex + 1} / {data.cards.length}
          </span>
        )}
      </div>
    </div>
  );
}
