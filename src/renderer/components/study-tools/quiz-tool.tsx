/**
 * Quiz Tool — AI-generated multiple choice quiz with scoring
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { QuizResult } from '@/types/study-tools';
import { useMutation } from 'convex/react';
import { CheckCircle2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface QuizToolProps {
  sessionId: Id<'sessions'>;
}

interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
  correct: boolean;
}

type QuizState = 'setup' | 'active' | 'review' | 'results';

export function QuizTool({ sessionId }: QuizToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<QuizResult>(
    sessionId,
    'quiz',
  );
  const saveAttempt = useMutation(api.studyTools.saveQuizAttempt);

  const [state, setState] = useState<QuizState>('active');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(10);

  const handleSelectAnswer = useCallback(
    (optionIndex: number) => {
      if (!data || selectedAnswer !== null) return;
      const question = data.questions[currentQuestion];
      const correct = optionIndex === question.correctIndex;

      setSelectedAnswer(optionIndex);
      setAnswers((prev) => [
        ...prev,
        { questionIndex: currentQuestion, selectedAnswer: optionIndex, correct },
      ]);

      // Auto-advance to review state to show explanation
      setState('review');
    },
    [data, currentQuestion, selectedAnswer],
  );

  const handleNext = useCallback(async () => {
    if (!data) return;

    if (currentQuestion + 1 >= data.questions.length) {
      // Quiz complete
      const finalAnswers = [...answers];
      const score = Math.round(
        (finalAnswers.filter((a) => a.correct).length / data.questions.length) * 100,
      );
      await saveAttempt({
        sessionId,
        answers: finalAnswers,
        score,
        totalQuestions: data.questions.length,
      });
      setState('results');
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setState('active');
    }
  }, [data, currentQuestion, answers, sessionId, saveAttempt]);

  const handleRetake = useCallback(() => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setState('active');
  }, []);

  const handleNewQuiz = useCallback(() => {
    handleRetake();
    generate({ questionCount });
  }, [generate, questionCount, handleRetake]);

  if (!data || isGenerating || error) {
    return (
      <div className="space-y-2">
        {!isGenerating && !error && !hasData && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-[10px] text-muted-foreground">Questions:</span>
            {[5, 10, 15, 20].map((count) => (
              <Button
                key={count}
                variant={questionCount === count ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setQuestionCount(count)}
              >
                {count}
              </Button>
            ))}
          </div>
        )}
        <GenerateButton
          onGenerate={() => generate({ questionCount })}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
          label={`Generate ${questionCount}-Question Quiz`}
          description="Test your knowledge with a multiple choice quiz."
        />
      </div>
    );
  }

  // Results screen
  if (state === 'results') {
    const correctCount = answers.filter((a) => a.correct).length;
    const score = Math.round((correctCount / data.questions.length) * 100);

    return (
      <div className="space-y-2">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">{score}%</p>
          <p className="text-xs text-muted-foreground">
            {correctCount} of {data.questions.length} correct
          </p>
          <Progress value={score} className="mt-2 h-1.5" />
        </Card>

        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={handleRetake}
          >
            <RotateCcw className="h-3 w-3" />
            Retake
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={handleNewQuiz}
          >
            <RefreshCw className="h-3 w-3" />
            New Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Active quiz / Review
  const question = data.questions[currentQuestion];
  const progress = ((currentQuestion + (state === 'review' ? 1 : 0)) / data.questions.length) * 100;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="flex-1 h-1" />
        <span className="text-[10px] text-muted-foreground shrink-0">
          {currentQuestion + 1}/{data.questions.length}
        </span>
      </div>

      {/* Question */}
      <Card className="p-2">
        <p className="text-xs font-medium text-foreground mb-2">{question.question}</p>
        <div className="grid grid-cols-2 gap-1">
          {question.options.map((option, i) => {
            let variant: 'secondary' | 'default' | 'destructive' = 'secondary';
            let icon = null;

            if (selectedAnswer !== null) {
              if (i === question.correctIndex) {
                variant = 'default';
                icon = <CheckCircle2 className="h-3 w-3 shrink-0" />;
              } else if (i === selectedAnswer) {
                variant = 'destructive';
                icon = <XCircle className="h-3 w-3 shrink-0" />;
              }
            }

            return (
              <Button
                key={option}
                variant={variant}
                className="justify-start h-auto min-h-[28px] text-xs px-2 py-1 gap-1 whitespace-normal text-left"
                onClick={() => handleSelectAnswer(i)}
                disabled={selectedAnswer !== null}
              >
                {icon}
                {option}
              </Button>
            );
          })}
        </div>

        {/* Explanation */}
        {state === 'review' && (
          <div className="mt-2 pt-2 border-t border-[var(--glass-border)]">
            <p className="text-[10px] text-muted-foreground">{question.explanation}</p>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[10px] text-muted-foreground">{question.topic}</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={handleNext}
              >
                {currentQuestion + 1 >= data.questions.length ? 'See Results' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
