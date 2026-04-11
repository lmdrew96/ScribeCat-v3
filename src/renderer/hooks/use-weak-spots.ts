/**
 * Hook for weak spots tracking and targeted review generation.
 */

import type { WeakSpotTopic } from '@/types/exam';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useWeakSpots(examRoomId: Id<'examRooms'> | null) {
  const weakSpots = useQuery(api.weakSpots.getWeakSpots, examRoomId ? { examRoomId } : 'skip');
  const recordPerformance = useMutation(api.weakSpots.recordPerformance);
  const resetWeakSpots = useMutation(api.weakSpots.resetWeakSpots);
  const generateReview = useAction(api.weakSpots.generateTargetedReview);

  // Targeted review result
  const targetedReview = useQuery(
    api.examTools.getExamToolResult,
    examRoomId ? { examRoomId, toolType: 'targeted_review' } : 'skip',
  );

  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTargetedReview = useCallback(async () => {
    if (!examRoomId) return;
    setIsGeneratingReview(true);
    setError(null);
    try {
      await generateReview({ examRoomId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate review');
    } finally {
      setIsGeneratingReview(false);
    }
  }, [examRoomId, generateReview]);

  const reset = useCallback(async () => {
    if (!examRoomId) return;
    await resetWeakSpots({ examRoomId });
  }, [examRoomId, resetWeakSpots]);

  const targetedReviewData = targetedReview?.result
    ? (() => {
        try {
          return JSON.parse(targetedReview.result);
        } catch {
          return null;
        }
      })()
    : null;

  return {
    weakSpots: (weakSpots ?? []) as WeakSpotTopic[],
    hasWeakSpots: (weakSpots?.length ?? 0) > 0,
    recordPerformance,
    resetWeakSpots: reset,
    generateTargetedReview,
    isGeneratingReview,
    error,
    targetedReview: targetedReviewData,
  };
}
