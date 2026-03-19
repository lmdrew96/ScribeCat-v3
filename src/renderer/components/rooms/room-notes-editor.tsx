import { cn } from '@/lib/utils';
import type { JSONContent } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import UnderlineExtension from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMutation, useQuery } from 'convex/react';
import {
  Bold,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

interface RoomNotesEditorProps {
  roomId: Id<'studyRooms'>;
  currentUserId: string;
  currentUserName: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        active
          ? 'bg-[var(--glass-bg)] text-foreground'
          : 'text-muted-foreground hover:bg-[var(--glass-bg-light)] hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RoomNotesEditor({ roomId, currentUserId, currentUserName }: RoomNotesEditorProps) {
  const roomNotes = useQuery(api.roomNotes.getRoomNotes, { roomId });
  const saveRoomNotes = useMutation(api.roomNotes.saveRoomNotes);

  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-foreground',
      },
    },
  });

  // Wire up debounced save on editor update
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      isDirtyRef.current = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const content = JSON.stringify(editor.getJSON());
        void saveRoomNotes({ roomId, content, updatedByName: currentUserName });
        isDirtyRef.current = false;
      }, 750);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, saveRoomNotes, roomId, currentUserName]);

  // Initialize with remote content once on first load
  useEffect(() => {
    if (!editor || roomNotes === undefined || isInitializedRef.current) return;
    if (roomNotes?.content) {
      try {
        editor.commands.setContent(JSON.parse(roomNotes.content) as JSONContent, false);
      } catch {
        // invalid stored content, leave editor empty
      }
    }
    isInitializedRef.current = true;
  }, [editor, roomNotes]);

  // Apply remote updates from other users
  useEffect(() => {
    if (!editor || !roomNotes || !isInitializedRef.current) return;
    // Skip our own writes echoing back
    if (roomNotes.updatedBy === currentUserId) return;
    // Skip if user has unsaved local changes — their next save will overwrite
    if (isDirtyRef.current) return;
    try {
      const remoteContent = JSON.parse(roomNotes.content) as JSONContent;
      if (JSON.stringify(editor.getJSON()) !== roomNotes.content) {
        editor.commands.setContent(remoteContent, false);
      }
    } catch {
      // ignore malformed content
    }
  }, [editor, roomNotes, currentUserId]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-[var(--glass-border)] px-2 py-1 glass-light shrink-0">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive('underline')}
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-[var(--glass-border)]" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-[var(--glass-border)]" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        {roomNotes ? (
          <p className="ml-auto text-[10px] text-muted-foreground shrink-0 pr-1">
            {roomNotes.updatedByName} · {formatRelativeTime(roomNotes.updatedAt)}
          </p>
        ) : (
          <p className="ml-auto text-[10px] text-muted-foreground shrink-0 pr-1">
            shared with room
          </p>
        )}
      </div>

      {/* Empty state hint when no content yet */}
      {roomNotes === null && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center pointer-events-none select-none">
          <FileText className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground/50">
            Start typing — everyone in the room can edit these notes
          </p>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
