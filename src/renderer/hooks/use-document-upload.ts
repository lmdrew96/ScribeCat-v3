import { useSessions } from '@/hooks/use-sessions';
import { useAction, useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface UploadedFile {
  file: File;
  preview: string;
}

interface DocumentUploadOptions {
  /** If set, saves extracted text to this session instead of creating a new one */
  targetSessionId?: Id<'sessions'> | null;
  lectureType?: string;
  onSessionCreated?: (sessionId: Id<'sessions'>) => void;
  onComplete?: (sessionId: Id<'sessions'>) => void;
}

interface DocumentUploadResult {
  upload: (files: UploadedFile[], options: DocumentUploadOptions) => Promise<void>;
  isProcessing: boolean;
  progress: string;
}

export function useDocumentUpload(): DocumentUploadResult {
  const { createSession, updateSession } = useSessions();
  const generateUploadUrl = useMutation(api.uploadImage.generateUploadUrl);
  const parseDocument = useAction(api.parseDocument.parseDocumentImages);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const upload = useCallback(
    async (files: UploadedFile[], options: DocumentUploadOptions) => {
      if (files.length === 0) return;

      try {
        setIsProcessing(true);
        setProgress(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);

        // Upload all files to Convex storage
        const storageIds: string[] = [];
        const mimeTypes: string[] = [];

        for (const { file } of files) {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          const { storageId } = await result.json();
          storageIds.push(storageId);
          mimeTypes.push(file.type || 'image/jpeg');
        }

        setProgress('Extracting text (this may take a moment)...');

        // Parse all files with Claude Vision
        const parseResult = await parseDocument({ storageIds, mimeTypes });

        if (!parseResult.success || !parseResult.text) {
          throw new Error('Failed to extract text from documents');
        }

        setProgress('Saving to session...');

        let sessionId: Id<'sessions'>;

        if (options.targetSessionId) {
          // Save to existing session
          sessionId = options.targetSessionId;
          await updateSession({
            id: sessionId,
            documentText: parseResult.text,
            documentStorageIds: storageIds,
          });
        } else {
          // Create new session
          const title =
            files.length === 1
              ? files[0].file.name.replace(/\.[^.]+$/, '')
              : `Uploaded Documents (${files.length} files)`;

          sessionId = await createSession({
            title,
            lectureType: options.lectureType || 'general',
          });

          await updateSession({
            id: sessionId,
            documentText: parseResult.text,
            documentStorageIds: storageIds,
          });

          options.onSessionCreated?.(sessionId);
        }

        setProgress('Done!');
        toast.success('Document parsed successfully');
        options.onComplete?.(sessionId);
      } catch (error) {
        console.error('Document upload error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Document upload failed: ${message}`);
        setProgress(`Error: ${message}`);
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProgress('');
        }, 3000);
      }
    },
    [createSession, updateSession, generateUploadUrl, parseDocument],
  );

  return { upload, isProcessing, progress };
}
