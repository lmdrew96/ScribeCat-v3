import type { JSONContent } from '@tiptap/core';

interface CitationData {
  noteText: string;
  timestamp: number;
  segmentText: string;
}

export function markdownToTipTap(markdown: string, citations?: CitationData[]): JSONContent {
  const lines = markdown.split('\n');
  const content: JSONContent[] = [];
  let currentList: JSONContent | null = null;
  let currentListType: 'bulletList' | 'orderedList' | null = null;

  // Build a citation lookup by timestamp for quick access
  const citationMap = new Map<number, CitationData>();
  if (citations) {
    for (const c of citations) {
      citationMap.set(c.timestamp, c);
    }
  }

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
        content: parseInlineFormatting(line.slice(4), citationMap),
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
        content: parseInlineFormatting(line.slice(3), citationMap),
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
        content: parseInlineFormatting(line.slice(2), citationMap),
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
            content: parseInlineFormatting(line.slice(2), citationMap),
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
            content: parseInlineFormatting(text, citationMap),
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
            content: parseInlineFormatting(text, citationMap),
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
        content: parseInlineFormatting(line, citationMap),
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

function parseInlineFormatting(
  text: string,
  citationMap?: Map<number, CitationData>,
): JSONContent[] {
  // First, extract and process citations [cite:XXXXX]
  const { cleanText, citationTimestamps } = extractCitations(text);

  const content: JSONContent[] = [];
  let remaining = cleanText;
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

  const result = content.length > 0 ? content : [{ type: 'text', text: cleanText }];

  // If there are citations, wrap the entire line content with a citation mark
  if (citationTimestamps.length > 0 && citationMap) {
    const timestamp = citationTimestamps[0]; // Use the first citation
    const citation = citationMap.get(timestamp);

    return result.map((node) => ({
      ...node,
      marks: [
        ...(node.marks || []),
        {
          type: 'citation',
          attrs: {
            timestamp,
            segmentText: citation?.segmentText || '',
          },
        },
      ],
    }));
  }

  return result;
}

/**
 * Extract [cite:XXXXX] patterns from text and return cleaned text + timestamps
 */
function extractCitations(text: string): {
  cleanText: string;
  citationTimestamps: number[];
} {
  const citationPattern = /\s*\[cite:(\d+)\]/g;
  const timestamps: number[] = [];
  let match = citationPattern.exec(text);

  while (match !== null) {
    timestamps.push(Number.parseInt(match[1], 10));
    match = citationPattern.exec(text);
  }

  const cleanText = text.replace(citationPattern, '').trim();

  return {
    cleanText,
    citationTimestamps: timestamps,
  };
}
