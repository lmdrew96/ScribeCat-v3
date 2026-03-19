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
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

// Deterministic color per user (8 distinct colors readable on any theme)
const CURSOR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#F39C12',
  '#DDA0DD',
  '#3498DB',
  '#9B59B6',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

interface RoomMember {
  userId: string;
  displayName: string;
  notesCursor?: string | null;
}

interface CursorOverlay {
  userId: string;
  displayName: string;
  color: string;
  top: number;
  left: number;
}

interface RoomNotesEditorProps {
  roomId: Id<'studyRooms'>;
  currentUserId: string;
  currentUserName: string;
  members: RoomMember[];
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

export function RoomNotesEditor({
  roomId,
  currentUserId,
  currentUserName,
  members,
}: RoomNotesEditorProps) {
  const roomNotes = useQuery(api.roomNotes.getRoomNotes, { roomId });
  const saveRoomNotes = useMutation(api.roomNotes.saveRoomNotes);
  const updateNotesCursor = useMutation(api.roomNotes.updateNotesCursor);

  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorOverlays, setCursorOverlays] = useState<CursorOverlay[]>([]);

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

  // Wire up debounced content save
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

  // Wire up cursor position broadcasting
  useEffect(() => {
    if (!editor) return;
    const selHandler = () => {
      const { from, to } = editor.state.selection;
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = setTimeout(() => {
        void updateNotesCursor({ roomId, cursor: JSON.stringify({ from, to }) });
      }, 100);
    };
    const blurHandler = () => {
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      void updateNotesCursor({ roomId, cursor: undefined });
    };
    editor.on('selectionUpdate', selHandler);
    editor.on('blur', blurHandler);
    return () => {
      editor.off('selectionUpdate', selHandler);
      editor.off('blur', blurHandler);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      void updateNotesCursor({ roomId, cursor: undefined });
    };
  }, [editor, updateNotesCursor, roomId]);

  // Initialize with remote content once on first load
  useEffect(() => {
    if (!editor || roomNotes === undefined || isInitializedRef.current) return;
    if (roomNotes?.content) {
      try {
        editor.commands.setContent(JSON.parse(roomNotes.content) as JSONContent, false);
      } catch {
        // invalid stored content
      }
    }
    isInitializedRef.current = true;
  }, [editor, roomNotes]);

  // Apply remote updates from other users
  useEffect(() => {
    if (!editor || !roomNotes || !isInitializedRef.current) return;
    if (roomNotes.updatedBy === currentUserId) return;
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

  // Compute cursor DOM overlay positions from member cursor data
  const computeCursorOverlays = useCallback(() => {
    if (!editor || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const docSize = editor.state.doc.content.size;

    const overlays: CursorOverlay[] = [];
    for (const member of members) {
      if (member.userId === currentUserId || !member.notesCursor) continue;
      try {
        const parsed = JSON.parse(member.notesCursor) as { from: number; to: number };
        const safePos = Math.min(Math.max(parsed.from, 0), Math.max(docSize - 1, 0));
        const coords = editor.view.coordsAtPos(safePos);
        overlays.push({
          userId: member.userId,
          displayName: member.displayName,
          color: getUserColor(member.userId),
          // coordsAtPos returns viewport coords; convert to container-absolute coords
          top: coords.top - containerRect.top + scrollTop,
          left: coords.left - containerRect.left,
        });
      } catch {
        // invalid cursor data
      }
    }
    setCursorOverlays(overlays);
  }, [editor, members, currentUserId]);

  // Recompute overlays when member cursor data changes
  useEffect(() => {
    computeCursorOverlays();
  }, [computeCursorOverlays]);

  // Recompute overlays on scroll (keep cursors in sync with scrolled position)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', computeCursorOverlays, { passive: true });
    return () => container.removeEventListener('scroll', computeCursorOverlays);
  }, [computeCursorOverlays]);

  // Users in the notes tab right now (have an active cursor)
  const activeEditors = members.filter((m) => m.userId !== currentUserId && m.notesCursor);

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

        {/* Right side: active editor badges + last-edited timestamp */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {activeEditors.map((m) => (
            <span
              key={m.userId}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white leading-none"
              style={{ background: getUserColor(m.userId) }}
              title={m.displayName}
            >
              {m.displayName.split(' ')[0]}
            </span>
          ))}
          {roomNotes && (
            <p className="text-[10px] text-muted-foreground pl-1">
              {roomNotes.updatedByName} · {formatRelativeTime(roomNotes.updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Editor + cursor overlays */}
      <div ref={containerRef} className="relative flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />

        {/* Remote cursor overlays */}
        {cursorOverlays.map((overlay) => (
          <div
            key={overlay.userId}
            className="absolute pointer-events-none select-none"
            style={{ top: overlay.top, left: overlay.left }}
          >
            {/* Name label */}
            <div
              className="absolute text-[10px] font-medium text-white px-1.5 leading-5 rounded-sm whitespace-nowrap"
              style={{
                background: overlay.color,
                top: '-1.35em',
                left: '-1px',
              }}
            >
              {overlay.displayName.split(' ')[0]}
            </div>
            {/* Caret line */}
            <div
              style={{
                borderLeft: `2px solid ${overlay.color}`,
                height: '1.25em',
              }}
            />
          </div>
        ))}

        {/* Empty state */}
        {roomNotes === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <FileText className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/50">
              Start typing — everyone in the room can edit these notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
