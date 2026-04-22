/**
 * useSessionRecovery — detects orphaned audio recovery data from a
 * crashed/interrupted recording and offers to recover it.
 */

import { clearRecoveryData, getRecoverySessionId, recoverAudio } from '@/lib/audio-recovery';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface UseSessionRecoveryReturn {
  hasRecoveryData: boolean;
  recoverySessionId: string | null;
  isRecovering: boolean;
  recover: () => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useSessionRecovery(
  currentRecordingSessionId: Id<'sessions'> | null,
): UseSessionRecoveryReturn {
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const generateUploadUrl = useMutation(api.audioStorage.generateUploadUrl);
  const appendAudioChunk = useMutation(api.sessions.appendAudioChunk);

  // Check for orphaned recovery data on mount
  useEffect(() => {
    const storedId = getRecoverySessionId();
    // Only show recovery if the stored session is NOT the one currently recording
    if (storedId && storedId !== currentRecordingSessionId) {
      setRecoverySessionId(storedId);
    } else {
      setRecoverySessionId(null);
    }
  }, [currentRecordingSessionId]);

  const recover = useCallback(async () => {
    if (!recoverySessionId) return;

    setIsRecovering(true);
    try {
      const audioBlob = await recoverAudio(recoverySessionId);
      if (!audioBlob || audioBlob.size === 0) {
        // No actual audio chunks found — clean up and tell the user
        await clearRecoveryData(recoverySessionId);
        setRecoverySessionId(null);
        toast.info('No audio chunks were saved — nothing to recover.', {
          description:
            'The recording was interrupted before any audio could be written to local storage.',
        });
        return;
      }

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body: audioBlob,
      });
      if (!uploadResult.ok) {
        const body = await uploadResult.text().catch(() => '');
        throw new Error(
          `Upload failed (${uploadResult.status} ${uploadResult.statusText}): ${
            body.slice(0, 200) || 'no response body'
          }`,
        );
      }
      const { storageId } = (await uploadResult.json()) as { storageId?: string };
      if (!storageId) {
        throw new Error('Upload response missing storageId');
      }

      // Append to the session's audioStorageIds array. This preserves any
      // chunks that were successfully uploaded by the progressive uploader
      // during the original recording — the recovered blob is just the tail
      // that didn't make it before the crash/tab-close.
      await appendAudioChunk({
        id: recoverySessionId as Id<'sessions'>,
        storageId,
      });

      // Clean up IndexedDB
      await clearRecoveryData(recoverySessionId);
      setRecoverySessionId(null);
      toast.success('Audio recovered and saved.');
    } catch (error) {
      console.error('Audio recovery failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Audio recovery failed', {
        description: message,
        duration: 15000,
      });
    } finally {
      setIsRecovering(false);
    }
  }, [recoverySessionId, generateUploadUrl, appendAudioChunk]);

  const dismiss = useCallback(async () => {
    if (!recoverySessionId) return;
    await clearRecoveryData(recoverySessionId);
    setRecoverySessionId(null);
  }, [recoverySessionId]);

  return {
    hasRecoveryData: !!recoverySessionId,
    recoverySessionId,
    isRecovering,
    recover,
    dismiss,
  };
}
