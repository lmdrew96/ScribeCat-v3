import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

interface LegalDocModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match bold, italic, inline code, and links
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match = regex.exec(text);
  let key = 0;

  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2]) {
      nodes.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3]) {
      nodes.push(<code key={key++}>{match[3]}</code>);
    } else if (match[4] && match[5]) {
      nodes.push(
        <a key={key++} href={match[5]} target="_blank" rel="noopener noreferrer">
          {match[4]}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parseMarkdown(md: string): ReactNode[] {
  const lines = md.split('\n');
  const elements: ReactNode[] = [];
  let key = 0;
  let listItems: ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={key++}>{listItems}</ul>);
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line)) {
      flushList();
      elements.push(<hr key={key++} />);
      continue;
    }

    // Table: collect consecutive pipe-delimited rows
    if (line.startsWith('|')) {
      flushList();
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      i--; // back up since the for loop will increment

      // Filter out separator rows (|---|---|)
      const dataRows = tableRows.filter((r) => !/^\|[\s-:|]+\|$/.test(r));
      if (dataRows.length > 0) {
        const parseCells = (row: string) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

        const headerCells = parseCells(dataRows[0]);
        const bodyRows = dataRows.slice(1);

        elements.push(
          <table key={key++}>
            <thead>
              <tr>
                {headerCells.map((cell, ci) => (
                  <th key={ci}>{parseInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {parseCells(row).map((cell, ci) => (
                    <td key={ci}>{parseInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>,
        );
      }
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      flushList();
      elements.push(<h3 key={key++}>{parseInline(h3[1])}</h3>);
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flushList();
      elements.push(<h2 key={key++}>{parseInline(h2[1])}</h2>);
      continue;
    }
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      flushList();
      elements.push(<h1 key={key++}>{parseInline(h1[1])}</h1>);
      continue;
    }

    // List items
    const li = line.match(/^- (.+)$/);
    if (li) {
      listItems.push(<li key={key++}>{parseInline(li[1])}</li>);
      continue;
    }

    // Non-list line — flush any pending list
    flushList();

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph
    elements.push(<p key={key++}>{parseInline(line)}</p>);
  }

  flushList();
  return elements;
}

export function LegalDocModal({ open, onOpenChange, title, content }: LegalDocModalProps) {
  const rendered = useMemo(() => parseMarkdown(content), [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="legal-doc overflow-y-auto max-h-[60vh] pr-2 text-sm text-foreground/80 leading-relaxed">
          {rendered}
        </div>
      </DialogContent>
    </Dialog>
  );
}
