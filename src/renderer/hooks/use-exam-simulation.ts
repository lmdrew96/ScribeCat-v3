/**
 * Hook for exam simulation — timer management, question navigation, submission.
 */

import type { ExamSimAttempt, ExamSimQuestion } from '@/types/exam';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface SimulationAnswer {
  questionIndex: number;
  selectedAnswer: number;
  correct: boolean;
  topic: string;
}

export function useExamSimulation(examRoomId: Id<'examRooms'> | null) {
  const simResult = useQuery(
    api.examSimulation.getExamSimulation,
    examRoomId ? { examRoomId } : 'skip',
  );
  const attempts = useQuery(
    api.examSimulation.getExamSimulationAttempts,
    examRoomId ? { examRoomId } : 'skip',
  );

  const generateAction = useAction(api.examSimulation.generateExamSimulation);
  const saveAttemptMutation = useMutation(api.examSimulation.saveExamSimulationAttempt);
  const recordPerformance = useMutation(api.weakSpots.recordPerformance);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation state
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SimulationAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0); // milliseconds
  const [timeLimitMs, setTimeLimitMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse questions from result
  const questions: ExamSimQuestion[] = simResult?.result
    ? (() => {
        try {
          return JSON.parse(simResult.result).questions ?? [];
        } catch {
          return [];
        }
      })()
    : [];

  const generate = useCallback(
    async (questionCount?: number) => {
      if (!examRoomId) return;
      setIsGenerating(true);
      setError(null);
      try {
        await generateAction({ examRoomId, questionCount });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed');
      } finally {
        setIsGenerating(false);
      }
    },
    [examRoomId, generateAction],
  );

  const startSimulation = useCallback(
    (timeLimitMinutes: number) => {
      if (questions.length === 0) return;
      const limitMs = timeLimitMinutes * 60 * 1000;
      setTimeLimitMs(limitMs);
      setTimeRemaining(limitMs);
      setCurrentIndex(0);
      setAnswers([]);
      setIsActive(true);
      startTimeRef.current = Date.now();
    },
    [questions.length],
  );

  // Timer
  useEffect(() => {
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, timeLimitMs - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Time's up — auto-submit
        setIsActive(false);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLimitMs]);

  const submitAnswer = useCallback(
    (answerIndex: number) => {
      if (!isActive || currentIndex >= questions.length) return;
      const question = questions[currentIndex];
      const correct = answerIndex === question.correctIndex;

      setAnswers((prev) => [
        ...prev,
        {
          questionIndex: currentIndex,
          selectedAnswer: answerIndex,
          correct,
          topic: question.topic,
        },
      ]);

      // Auto-advance to next question
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    },
    [isActive, currentIndex, questions],
  );

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentIndex(index);
      }
    },
    [questions.length],
  );

  const finishSimulation = useCallback(async () => {
    if (!examRoomId || answers.length === 0) return;
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const score = answers.filter((a) => a.correct).length;
    const timeUsed = Date.now() - startTimeRef.current;

    try {
      await saveAttemptMutation({
        examRoomId,
        answers,
        score,
        totalQuestions: questions.length,
        timeUsed,
      });

      // Record weak spots for each answer
      for (const answer of answers) {
        await recordPerformance({
          examRoomId,
          topic: answer.topic,
          correct: answer.correct,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save attempt');
    }
  }, [examRoomId, answers, questions.length, saveAttemptMutation, recordPerformance]);

  return {
    // Generation
    questions,
    hasQuestions: questions.length > 0,
    isGenerating,
    error,
    generate,

    // Simulation state
    isActive,
    currentIndex,
    currentQuestion: questions[currentIndex] ?? null,
    answers,
    timeRemaining,
    timeLimitMs,
    answeredCount: answers.length,

    // Actions
    startSimulation,
    submitAnswer,
    goToQuestion,
    finishSimulation,

    // History
    attempts: (attempts ?? []) as ExamSimAttempt[],
  };
}
