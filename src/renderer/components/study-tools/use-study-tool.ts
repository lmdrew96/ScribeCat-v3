/**
 * Shared hook for AI study tool generation + caching via Convex reactivity.
 * Each tool uses this to check for cached results and trigger generation.
 */

import type { StudyToolType } from '@/types/study-tools';
import { useAction, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

type GenerateAction =
  | typeof api.studyTools.generateSummary
  | typeof api.studyTools.generateKeyConcepts
  | typeof api.studyTools.generateFlashcards
  | typeof api.studyTools.generateQuiz
  | typeof api.studyTools.generateConceptMap
  | typeof api.studyTools.generateEli5;

const ACTION_MAP: Record<StudyToolType, GenerateAction> = {
  summary: api.studyTools.generateSummary,
  keyConcepts: api.studyTools.generateKeyConcepts,
  flashcards: api.studyTools.generateFlashcards,
  quiz: api.studyTools.generateQuiz,
  conceptMap: api.studyTools.generateConceptMap,
  eli5: api.studyTools.generateEli5,
};

export function useStudyTool<T>(sessionId: Id<'sessions'>, toolType: StudyToolType) {
  const cachedResult = useQuery(api.studyTools.getToolResult, {
    sessionId,
    toolType,
  });

  const generateAction = useAction(ACTION_MAP[toolType]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (extraArgs?: Record<string, unknown>) => {
      setIsGenerating(true);
      setError(null);
      try {
        await (generateAction as (args: Record<string, unknown>) => Promise<unknown>)({
          sessionId,
          ...extraArgs,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Generation failed';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [sessionId, generateAction],
  );

  const data: T | null = cachedResult?.result ? JSON.parse(cachedResult.result) : null;

  return {
    data,
    isGenerating,
    error,
    generate,
    hasData: data !== null,
    createdAt: cachedResult?.createdAt,
  };
}
