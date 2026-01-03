import type { JSONContent } from '@tiptap/core';

export function markdownToTipTap(markdown: string): JSONContent {
  const lines = markdown.split('\n');
  const content: JSONContent[] = [];
  let currentList: JSONContent | null = null;
  let currentListType: 'bulletList' | 'orderedList' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.slice(4) }],
      });
    } else if (line.startsWith('## ')) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.slice(3) }],
      });
    } else if (line.startsWith('# ')) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.slice(2) }],
      });
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: line.slice(2) }],
          },
        ],
      });
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      const listItem = {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineFormatting(text),
          },
        ],
      };

      if (currentListType === 'orderedList') {
        currentList?.content?.push(listItem);
      } else {
        if (currentList) {
          content.push(currentList);
        }
        currentList = {
          type: 'orderedList',
          content: [listItem],
        };
        currentListType = 'orderedList';
      }
    }
    // Bullet list
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.slice(2);
      const listItem = {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineFormatting(text),
          },
        ],
      };

      if (currentListType === 'bulletList') {
        currentList?.content?.push(listItem);
      } else {
        if (currentList) {
          content.push(currentList);
        }
        currentList = {
          type: 'bulletList',
          content: [listItem],
        };
        currentListType = 'bulletList';
      }
    }
    // Diagram comment - convert to paragraph with note
    else if (line.includes('<!-- DIAGRAM:')) {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      const diagramText = line.match(/<!-- DIAGRAM: (.+?) -->/)?.[1] || 'diagram suggestion';
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: '💡 ', marks: [] },
          { type: 'text', text: `Diagram suggestion: ${diagramText}`, marks: [{ type: 'italic' }] },
        ],
      });
    }
    // Regular paragraph
    else {
      if (currentList) {
        content.push(currentList);
        currentList = null;
        currentListType = null;
      }
      content.push({
        type: 'paragraph',
        content: parseInlineFormatting(line),
      });
    }
  }

  // Add any remaining list
  if (currentList) {
    content.push(currentList);
  }

  return {
    type: 'doc',
    content,
  };
}

function parseInlineFormatting(text: string): JSONContent[] {
  const content: JSONContent[] = [];
  let remaining = text;
  let position = 0;

  while (position < remaining.length) {
    // Bold (**text** or __text__)
    const boldMatch = remaining.slice(position).match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      if (position > 0) {
        content.push({ type: 'text', text: remaining.slice(0, position) });
        remaining = remaining.slice(position);
        position = 0;
      }
      content.push({
        type: 'text',
        text: boldMatch[2],
        marks: [{ type: 'bold' }],
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic (*text* or _text_)
    const italicMatch = remaining.slice(position).match(/^(\*|_)(.*?)\1/);
    if (
      italicMatch &&
      !remaining.slice(position).startsWith('**') &&
      !remaining.slice(position).startsWith('__')
    ) {
      if (position > 0) {
        content.push({ type: 'text', text: remaining.slice(0, position) });
        remaining = remaining.slice(position);
        position = 0;
      }
      content.push({
        type: 'text',
        text: italicMatch[2],
        marks: [{ type: 'italic' }],
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    position++;
  }

  // Add remaining text
  if (remaining) {
    content.push({ type: 'text', text: remaining });
  }

  return content.length > 0 ? content : [{ type: 'text', text: text }];
}
