/**
 * Shared lightweight markdown renderer for AI-generated content.
 *
 * renderMarkdown  — block-level: headings, lists, code blocks, paragraphs
 * renderInline    — inline: bold, italic, inline code
 */

import type { ReactNode } from 'react';

/**
 * Render inline markdown: **bold**, *italic*, `code`
 */
export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code (backtick)
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        <code key={`ic-${key++}`} className="px-1 py-0.5 rounded bg-black/15 text-xs font-mono">
          {codeMatch[2]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(
        <a
          key={`a-${key++}`}
          href={linkMatch[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[2]}
        </a>,
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {boldMatch[2]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Strikethrough
    const strikeMatch = remaining.match(/^(.*?)~~(.+?)~~/);
    if (strikeMatch) {
      if (strikeMatch[1]) parts.push(strikeMatch[1]);
      parts.push(
        <s key={`s-${key++}`} className="opacity-60">
          {strikeMatch[2]}
        </s>,
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={`i-${key++}`}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // No more matches, push rest
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : parts;
}

/**
 * Render block-level markdown into React elements.
 * Supports: headings (# ## ### ####), bullet/numbered lists, code blocks, paragraphs.
 */
export function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let codeBlock = false;
  let codeContent: string[] = [];
  let codeKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <pre
            key={`code-${codeKey++}`}
            className="my-1.5 rounded-md bg-black/20 px-3 py-2 text-xs font-mono overflow-x-auto"
          >
            <code>{codeContent.join('\n')}</code>
          </pre>,
        );
        codeContent = [];
        codeBlock = false;
      } else {
        codeBlock = true;
      }
      continue;
    }

    if (codeBlock) {
      codeContent.push(line);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(
        <hr key={`hr-${i}`} className="my-2 border-t border-[var(--glass-border)]" />,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      // Collect consecutive blockquote lines
      const quoteLines: string[] = [line.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].startsWith('> ')) {
        i++;
        quoteLines.push(lines[i].slice(2));
      }
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-1.5 border-l-2 border-accent/50 pl-3 text-muted-foreground italic"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi}>{renderInline(ql)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Headers — check longest prefix first to avoid mis-matching
    if (line.startsWith('#### ')) {
      elements.push(
        <p key={`h4-${i}`} className="font-semibold text-xs uppercase tracking-wide mt-2 mb-1">
          {renderInline(line.slice(5))}
        </p>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <p key={`h3-${i}`} className="font-semibold text-sm mt-2 mb-1">
          {renderInline(line.slice(4))}
        </p>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <p key={`h2-${i}`} className="font-bold text-base mt-3 mb-1">
          {renderInline(line.slice(3))}
        </p>,
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <p key={`h1-${i}`} className="font-bold text-lg mt-3 mb-1.5">
          {renderInline(line.slice(2))}
        </p>,
      );
      continue;
    }

    // Bullet list items
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-1.5 ml-1">
          <span className="text-muted-foreground shrink-0">&#8226;</span>
          <span>{renderInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>,
      );
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^(\d+)[.)]\s/);
    if (numberedMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex gap-1.5 ml-1">
          <span className="text-muted-foreground shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInline(line.replace(/^\d+[.)]\s/, ''))}</span>
        </div>,
      );
      continue;
    }

    // Table: detect header row (starts with |, next line is separator like |---|---|)
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s:-]+\|/)) {
      const parseRow = (row: string): string[] =>
        row
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());

      const headers = parseRow(line);
      i++; // skip separator line

      const rows: string[][] = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) {
        i++;
        rows.push(parseRow(lines[i]));
      }

      elements.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-md border border-[var(--glass-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--glass-border)] bg-black/10">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-1.5 text-left font-semibold">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--glass-border)] last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
  }

  // Handle unclosed code block
  if (codeBlock && codeContent.length > 0) {
    elements.push(
      <pre
        key={`code-${codeKey}`}
        className="my-1.5 rounded-md bg-black/20 px-3 py-2 text-xs font-mono overflow-x-auto"
      >
        <code>{codeContent.join('\n')}</code>
      </pre>,
    );
  }

  return elements;
}
