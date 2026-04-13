import { type LectureType, LectureTypeSelect } from '@/components/lecture-type-select';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentUpload } from '@/hooks/use-document-upload';
import { useSessions } from '@/hooks/use-sessions';
import { cn } from '@/lib/utils';
import { FileImage, FileText, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = 'image/*,.png,.jpg,.jpeg,.webp,.heic,application/pdf,.pdf';

interface UploadedFile {
  file: File;
  preview: string;
}

interface DocumentUploadProps {
  /** Callback when a new session is created from the upload */
  onSessionCreated?: (sessionId: Id<'sessions'>) => void;
  /** Callback when upload completes (new or existing session) */
  onComplete?: (sessionId: Id<'sessions'>) => void;
  /** If true, hides the session target picker (always creates new session) */
  newSessionOnly?: boolean;
}

export function DocumentUpload({
  onSessionCreated,
  onComplete,
  newSessionOnly,
}: DocumentUploadProps) {
  const { upload, isProcessing, progress } = useDocumentUpload();
  const { sessions } = useSessions();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [lectureType, setLectureType] = useState<LectureType>('general');
  const [targetSession, setTargetSession] = useState<string>('new');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files;
      if (!selected) return;

      const newFiles: UploadedFile[] = [];
      const remaining = MAX_FILES - files.length;

      for (let i = 0; i < Math.min(selected.length, remaining); i++) {
        const file = selected[i];
        if (file.size > MAX_FILE_SIZE) {
          continue; // Skip oversized files silently (UI shows limit)
        }
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
        newFiles.push({ file, preview });
      }

      setFiles((prev) => [...prev, ...newFiles]);

      // Reset input so the same file can be re-added
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [files.length],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    const targetSessionId =
      !newSessionOnly && targetSession !== 'new' ? (targetSession as Id<'sessions'>) : null;

    await upload(files, {
      targetSessionId,
      lectureType,
      onSessionCreated,
      onComplete,
    });

    // Clean up previews and reset
    for (const f of files) {
      if (f.preview) URL.revokeObjectURL(f.preview);
    }
    setFiles([]);
  }, [files, targetSession, newSessionOnly, lectureType, upload, onSessionCreated, onComplete]);

  const isPdf = (file: File) => file.type === 'application/pdf' || file.name.endsWith('.pdf');

  return (
    <div className="flex flex-col gap-3 rounded-xl glass p-3">
      <div className="flex items-center gap-2">
        <FileImage className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Upload Documents</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload photos of handwritten notes, diagrams, or PDFs. AI will extract the text content.
      </p>

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={f.file.name + i}
              className="relative group rounded-lg overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)]"
            >
              {isPdf(f.file) ? (
                <div className="flex h-16 w-16 items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : (
                <img src={f.preview} alt={f.file.name} className="h-16 w-16 object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-[8px] text-white truncate px-1">
                {f.file.name}
              </p>
            </div>
          ))}
          {files.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed',
                'border-[var(--glass-border)] text-muted-foreground hover:border-accent hover:text-accent transition-colors',
                isProcessing && 'opacity-50 pointer-events-none',
              )}
            >
              <Upload className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <LectureTypeSelect
            value={lectureType}
            onChange={setLectureType}
            disabled={isProcessing}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Max {MAX_FILES} files, 20MB each</p>
      </div>

      {/* Session target picker */}
      {!newSessionOnly && sessions.length > 0 && (
        <Select value={targetSession} onValueChange={setTargetSession} disabled={isProcessing}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Create new session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new" className="text-xs">
              Create new session
            </SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s._id} value={s._id} className="text-xs">
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      {files.length === 0 ? (
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          variant="secondary"
          size="sm"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Choose Files
        </Button>
      ) : (
        <Button
          onClick={() => void handleUpload()}
          disabled={isProcessing || files.length === 0}
          variant="default"
          size="sm"
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </>
          ) : (
            <>
              <FileImage className="h-4 w-4" />
              Upload & Parse {files.length} file{files.length > 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
