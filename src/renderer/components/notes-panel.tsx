import { EditorToolbar } from '@/components/editor-toolbar';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useSession, useSessions } from '@/hooks/use-sessions';
import { DraggableImage } from '@/lib/draggable-image-extension';
import { ExcalidrawNode } from '@/lib/excalidraw-extension';
import { FontSize } from '@/lib/font-size-extension';
import { markdownToTipTap } from '@/lib/markdown-to-tiptap';
import { TextBox } from '@/lib/textbox-extension';
import CodeBlock from '@tiptap/extension-code-block';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useAction } from 'convex/react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface NotesPanelProps {
  sessionId?: Id<'sessions'> | null;
}

// Ref type for external access
export interface NotesPanelRef {
  insertNote: (noteText: string) => void;
}

export const NotesPanel = forwardRef<NotesPanelRef, NotesPanelProps>(function NotesPanel(
  { sessionId },
  ref,
) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const userId = 'anonymous-user'; // TODO: Get from authenticated user
  const { updateSession } = useSessions(userId);
  const session = useSession(sessionId || null);
  const generateNotesAction = useAction(api.ai.generateNotesFromTranscript);

  const saveToConvex = useCallback(
    async (json: string, plainText: string) => {
      if (!sessionId) return;

      try {
        setSaveState('saving');
        await updateSession({
          id: sessionId,
          notes: json,
          notesPlainText: plainText,
        });
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch (error) {
        console.error('Error saving notes:', error);
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    },
    [sessionId, updateSession],
  );

  const debouncedSave = useDebouncedCallback(saveToConvex, 750);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default, we'll add our own
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      CodeBlock,
      Color,
      TextStyle,
      FontFamily,
      FontSize,
      DraggableImage,
      TextBox,
      ExcalidrawNode,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none h-full p-3 text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const plainText = editor.getText();
      debouncedSave(json, plainText);
    },
  });

  // Expose insertNote method via ref for Nugget Notes integration
  const insertNote = useCallback(
    (noteText: string) => {
      if (!editor) return;

      // Insert as a bullet point at the end of the document
      editor.chain().focus('end').insertContent(`<p>• ${noteText}</p>`).run();

      console.log('📝 Inserted note from Nugget:', noteText.substring(0, 50));
    },
    [editor],
  );

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      insertNote,
    }),
    [insertNote],
  );

  const handleManualSave = useCallback(() => {
    if (editor) {
      const json = JSON.stringify(editor.getJSON());
      const plainText = editor.getText();
      saveToConvex(json, plainText);
    }
  }, [editor, saveToConvex]);

  // Keyboard shortcut for manual save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Load initial content from session
  useEffect(() => {
    if (editor && session?.notes) {
      try {
        const content = JSON.parse(session.notes);
        editor.commands.setContent(content);
      } catch (error) {
        console.error('Error parsing notes:', error);
      }
    }
  }, [editor, session]);

  const handleGenerateNotes = async () => {
    console.log('=== Generate Notes Clicked ===');
    console.log('sessionId:', sessionId);
    console.log('session:', session);
    console.log('session?.transcript:', session?.transcript);
    console.log('transcript length:', session?.transcript?.length);

    if (!sessionId) {
      console.error('No sessionId found');
      alert('No recording session found. Please start a recording first.');
      return;
    }

    if (!session) {
      console.error('No session object found');
      alert('Session not loaded yet. Please wait a moment and try again.');
      return;
    }

    if (!session.transcript || session.transcript.trim().length === 0) {
      console.error('Transcript is empty or undefined');
      alert(
        'No transcript available yet. Please speak during the recording to generate a transcript, then try again.',
      );
      return;
    }

    console.log('Starting AI generation with transcript:', session.transcript.substring(0, 100));
    setIsGenerating(true);

    try {
      console.log('Calling generateNotesAction...');
      const data = await generateNotesAction({
        transcript: session.transcript,
        sessionId: sessionId as string,
      });
      console.log('Response data:', data);

      if (data.success && data.notes && editor) {
        // Convert markdown to TipTap JSON
        console.log('Raw markdown notes:', data.notes);
        const tiptapContent = markdownToTipTap(data.notes);
        console.log('Converted TipTap content:', JSON.stringify(tiptapContent, null, 2));

        // Append to existing content
        const currentContent = editor.getJSON();
        console.log('Current editor content:', JSON.stringify(currentContent, null, 2));

        const newContent = {
          ...currentContent,
          content: [
            ...(currentContent.content || []),
            {
              type: 'paragraph',
              content: [{ type: 'hardBreak' }],
            },
            ...(tiptapContent.content || []),
          ],
        };

        console.log('New content to set:', JSON.stringify(newContent, null, 2));

        editor.commands.setContent(newContent);
        console.log('Notes generated and inserted successfully');

        // Scroll to the end
        editor.commands.focus('end');
      } else {
        console.warn('Generation succeeded but data was invalid:', data);
        alert('Received invalid response from AI. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate notes:', error);
      alert(
        `Failed to generate notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-2 gap-2">
      <EditorToolbar
        editor={editor}
        onGenerateNotes={handleGenerateNotes}
        isGenerating={isGenerating}
        onSave={handleManualSave}
        saveState={saveState}
      />

      {/* Editor area */}
      <div className="relative flex-1 rounded-lg bg-card min-h-0 overflow-auto">
        <EditorContent editor={editor} className="h-full" />

        {!editor?.getText() && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Start typing your notes...</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">or let AI generate them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
