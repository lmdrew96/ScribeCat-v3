import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Editor } from '@tiptap/react';
import { useMutation } from 'convex/react';
import {
  AlertCircle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  PenTool,
  Quote,
  Redo,
  Save,
  Sparkles,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table,
  Type,
  Underline,
  Undo,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';

interface EditorToolbarProps {
  editor: Editor | null;
  onGenerateNotes?: () => void;
  isGenerating?: boolean;
  onSave?: () => void;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

export function EditorToolbar({
  editor,
  onGenerateNotes,
  isGenerating,
  onSave,
  saveState = 'idle',
}: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.uploadImage.generateUploadUrl);
  const getImageUrl = useMutation(api.uploadImage.getImageUrl);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Get the public URL
      const imageUrl = await getImageUrl({ storageId });

      // Insert the draggable image into the editor
      if (imageUrl) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'draggableImage',
            attrs: {
              src: imageUrl,
              alt: file.name,
              storageId,
            },
          })
          .run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertTextBox = () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'textBox',
        attrs: {
          content: 'Enter text...',
          width: 200,
          height: 100,
          x: 0,
          y: 0,
        },
      })
      .run();
  };

  const insertDiagram = () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'excalidraw',
        attrs: {
          data: null,
          width: 600,
          height: 400,
          x: 0,
          y: 0,
        },
      })
      .run();
  };

  const setLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  const highlightColors = [
    { name: 'Primary', value: 'var(--primary)' },
    { name: 'Accent', value: 'var(--accent)' },
    { name: 'Success', value: 'var(--success)' },
    { name: 'Destructive', value: 'var(--destructive)' },
  ];

  const SaveIndicator = () => {
    if (saveState === 'saving') {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Saving...</span>
        </>
      );
    }
    if (saveState === 'saved') {
      return (
        <>
          <Check className="h-3 w-3 text-success" />
          <span className="text-xs text-success">Saved</span>
        </>
      );
    }
    if (saveState === 'error') {
      return (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Error</span>
        </>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-0.5 rounded-md bg-secondary/50 p-0.5">
        {/* Basic formatting */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-active={editor.isActive('underline')}
        >
          <Underline className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          data-active={editor.isActive('strike')}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3 w-3" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Headings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-3 w-3" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Lists & Blockquote */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
        >
          <List className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
        >
          <Quote className="h-3 w-3" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Text Alignment */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          data-active={editor.isActive({ textAlign: 'left' })}
        >
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          data-active={editor.isActive({ textAlign: 'center' })}
        >
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          data-active={editor.isActive({ textAlign: 'right' })}
        >
          <AlignRight className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          data-active={editor.isActive({ textAlign: 'justify' })}
        >
          <AlignJustify className="h-3 w-3" />
        </Button>
      </div>

      {/* Font Size Dropdown */}
      <Select
        value={editor.getAttributes('textStyle').fontSize || '16px'}
        onValueChange={(value) => {
          if (value === 'unset') {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
          }
        }}
      >
        <SelectTrigger className="h-7 w-20 text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="12px">12px</SelectItem>
          <SelectItem value="14px">14px</SelectItem>
          <SelectItem value="16px">16px</SelectItem>
          <SelectItem value="18px">18px</SelectItem>
          <SelectItem value="20px">20px</SelectItem>
          <SelectItem value="24px">24px</SelectItem>
          <SelectItem value="32px">32px</SelectItem>
          <SelectItem value="48px">48px</SelectItem>
          <SelectItem value="72px">72px</SelectItem>
          <SelectItem value="unset">Reset</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-0.5 rounded-md bg-secondary/50 p-0.5">
        {/* Highlighter Colors */}
        {highlightColors.map((color) => (
          <Button
            key={color.name}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
            data-active={editor.isActive('highlight', { color: color.value })}
            title={`Highlight ${color.name}`}
          >
            <Highlighter className="h-3 w-3" style={{ color: color.value }} />
          </Button>
        ))}

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Table, Link, Code, Image, TextBox */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert Table"
        >
          <Table className="h-3 w-3" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
        >
          <ImageIcon className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={insertTextBox}
          title="Insert Text Box"
        >
          <Type className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={insertDiagram}
          title="Insert Diagram"
        >
          <PenTool className="h-3 w-3" />
        </Button>

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              data-active={editor.isActive('link')}
              title="Insert Link"
            >
              <LinkIcon className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
              <DialogDescription>Enter the URL you want to link to.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">
                  URL
                </Label>
                <Input
                  id="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="col-span-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setLink();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={setLink}>Set Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          data-active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code2 className="h-3 w-3" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Superscript & Subscript */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          data-active={editor.isActive('superscript')}
          title="Superscript"
        >
          <SuperscriptIcon className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          data-active={editor.isActive('subscript')}
          title="Subscript"
        >
          <SubscriptIcon className="h-3 w-3" />
        </Button>

        <div className="mx-0.5 h-4 w-px bg-border" />

        {/* Undo & Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Save indicator and button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <SaveIndicator />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 px-2 text-xs"
          onClick={onSave}
          title="Save (Cmd+S)"
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
      </div>

      {/* AI Generate button */}
      <Button
        variant="default"
        size="sm"
        className="gap-1.5 h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onGenerateNotes}
        disabled={isGenerating}
      >
        <Sparkles className="h-3 w-3" />
        {isGenerating ? 'Generating...' : 'Generate'}
      </Button>
    </div>
  );
}
