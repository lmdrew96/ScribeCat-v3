/**
 * Hook for exam room study tools — multi-session AI generation + caching.
 */

import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export type ExamToolType =
  | 'summary'
  | 'keyConcepts'
  | 'flashcards'
  | 'quiz'
  | 'conceptMap'
  | 'eli5';

export function useExamTool<T>(examRoomId: Id<'examRooms'> | null, toolType: ExamToolType) {
  const cachedResult = useQuery(
    api.examTools.getExamToolResult,
    examRoomId ? { examRoomId, toolType } : 'skip',
  );

  const generateAction = useAction(api.examTools.generateExamTool);
  const deleteResult = useMutation(api.examTools.deleteExamToolResult);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (count?: number) => {
      if (!examRoomId) return;
      setIsGenerating(true);
      setError(null);
      try {
        await generateAction({ examRoomId, toolType, count });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Generation failed';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [examRoomId, toolType, generateAction],
  );

  const regenerate = useCallback(async () => {
    if (!examRoomId) return;
    await deleteResult({ examRoomId, toolType });
    await generate();
  }, [examRoomId, toolType, deleteResult, generate]);

  const data: T | null = cachedResult?.result ? JSON.parse(cachedResult.result) : null;

  return {
    data,
    isGenerating,
    error,
    generate,
    regenerate,
    hasData: data !== null,
    createdAt: cachedResult?.createdAt,
  };
}
