import { Button } from '@/components/ui/button';
import { type ExamToolType, useExamTool } from '@/hooks/use-exam-tools';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Brain,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamToolsProps {
  examRoomId: Id<'examRooms'>;
  sessionCount: number;
}

const TOOLS: { key: ExamToolType; label: string; icon: typeof Brain; description: string }[] = [
  {
    key: 'summary',
    label: 'Summary',
    icon: FileText,
    description: 'Comprehensive summary across all sessions',
  },
  {
    key: 'keyConcepts',
    label: 'Key Concepts',
    icon: Lightbulb,
    description: 'Most important concepts for the exam',
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    icon: Layers,
    description: 'Study flashcards from all sessions',
  },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Multi-session quiz questions' },
  {
    key: 'conceptMap',
    label: 'Concept Map',
    icon: Brain,
    description: 'Visual concept relationships',
  },
  {
    key: 'eli5',
    label: 'ELI5',
    icon: BookOpen,
    description: 'Simple explanations of complex topics',
  },
];

export function ExamTools({ examRoomId, sessionCount }: ExamToolsProps) {
  const [activeTool, setActiveTool] = useState<ExamToolType>('summary');

  if (sessionCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Brain className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">Add sessions first</p>
        <p className="text-xs text-muted-foreground">
          Study tools need session content to generate from
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tool selector */}
      <div className="flex gap-1 p-3 border-b border-[var(--glass-border)] overflow-x-auto">
        {TOOLS.map((tool) => (
          <button
            type="button"
            key={tool.key}
            onClick={() => setActiveTool(tool.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              activeTool === tool.key
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-bg-light)]',
            )}
          >
            <tool.icon className="h-3 w-3" />
            {tool.label}
          </button>
        ))}
      </div>

      {/* Active tool content */}
      <div className="flex-1 overflow-auto p-4">
        <ExamToolContent examRoomId={examRoomId} toolType={activeTool} />
      </div>
    </div>
  );
}

function ExamToolContent({
  examRoomId,
  toolType,
}: {
  examRoomId: Id<'examRooms'>;
  toolType: ExamToolType;
}) {
  const { data, isGenerating, error, generate, regenerate, hasData } = useExamTool(
    examRoomId,
    toolType,
  );

  const toolInfo = TOOLS.find((t) => t.key === toolType);

  if (!hasData && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <p className="text-sm font-medium text-foreground">{toolInfo?.label}</p>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          {toolInfo?.description}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1"
          onClick={() => void generate()}
          disabled={isGenerating}
        >
          Generate
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">
          Generating {toolInfo?.label?.toLowerCase()}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{toolInfo?.label}</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => void regenerate()}
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Render based on tool type */}
      {toolType === 'summary' && <SummaryView data={data} />}
      {toolType === 'keyConcepts' && <KeyConceptsView data={data} />}
      {toolType === 'flashcards' && <FlashcardsView data={data} />}
      {toolType === 'quiz' && <QuizView data={data} />}
      {toolType === 'conceptMap' && <ConceptMapView data={data} />}
      {toolType === 'eli5' && <Eli5View data={data} />}
    </div>
  );
}

// ─── Tool Renderers ──────────────────────────────────────────

function SummaryView({ data }: { data: unknown }) {
  const d = data as { summary: string; keyTakeaways: string[] } | null;
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div className="prose prose-sm text-foreground max-w-none">
        {d.summary.split('\n\n').map((p, i) => (
          <p key={i} className="text-sm leading-relaxed">
            {p}
          </p>
        ))}
      </div>
      {d.keyTakeaways?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Key Takeaways
          </h4>
          <ul className="space-y-1">
            {d.keyTakeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="text-accent shrink-0">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeyConceptsView({ data }: { data: unknown }) {
  const d = data as {
    concepts: Array<{
      term: string;
      definition: string;
      importance: string;
      relatedTerms: string[];
    }>;
  } | null;
  if (!d?.concepts) return null;
  return (
    <div className="space-y-3">
      {d.concepts.map((c, i) => (
        <div key={i} className="rounded-lg p-3 glass-light border border-[var(--glass-border)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">{c.term}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                c.importance === 'high'
                  ? 'bg-red-500/20 text-red-400'
                  : c.importance === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400',
              )}
            >
              {c.importance}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{c.definition}</p>
          {c.relatedTerms?.length > 0 && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Related: {c.relatedTerms.join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FlashcardsView({ data }: { data: unknown }) {
  const d = data as {
    cards: Array<{ front: string; back: string; difficulty: string; topic: string }>;
  } | null;
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  if (!d?.cards) return null;

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {d.cards.map((card, i) => (
        <button
          type="button"
          key={i}
          onClick={() => toggleFlip(i)}
          className="w-full text-left rounded-lg p-4 glass-light border border-[var(--glass-border)] transition-all hover:border-accent/30"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">{card.topic}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                card.difficulty === 'hard'
                  ? 'bg-red-500/20 text-red-400'
                  : card.difficulty === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400',
              )}
            >
              {card.difficulty}
            </span>
          </div>
          <p className="text-sm text-foreground">{flipped.has(i) ? card.back : card.front}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {flipped.has(i) ? 'Click to see question' : 'Click to reveal answer'}
          </p>
        </button>
      ))}
    </div>
  );
}

function QuizView({ data }: { data: unknown }) {
  const d = data as {
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      topic: string;
    }>;
  } | null;
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!d?.questions) return null;

  const handleAnswer = (qIdx: number, aIdx: number) => {
    if (revealed.has(qIdx)) return;
    setSelected((prev) => ({ ...prev, [qIdx]: aIdx }));
    setRevealed((prev) => new Set(prev).add(qIdx));
  };

  return (
    <div className="space-y-4">
      {d.questions.map((q, i) => (
        <div key={i} className="rounded-lg p-4 glass-light border border-[var(--glass-border)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium text-accent">Q{i + 1}</span>
            <span className="text-[10px] text-muted-foreground">{q.topic}</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-3">{q.question}</p>
          <div className="space-y-1.5">
            {q.options.map((opt, j) => (
              <button
                type="button"
                key={j}
                onClick={() => handleAnswer(i, j)}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 text-xs transition-colors',
                  revealed.has(i) && j === q.correctIndex && 'bg-green-500/20 text-green-400',
                  revealed.has(i) &&
                    j === selected[i] &&
                    j !== q.correctIndex &&
                    'bg-red-500/20 text-red-400',
                  !revealed.has(i) && 'hover:bg-[var(--glass-bg-light)] text-foreground',
                  revealed.has(i) &&
                    j !== q.correctIndex &&
                    j !== selected[i] &&
                    'text-muted-foreground',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          {revealed.has(i) && (
            <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ConceptMapView({ data }: { data: unknown }) {
  const d = data as {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  } | null;
  if (!d?.nodes) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {d.nodes.length} concepts, {d.edges.length} connections
      </p>
      <div className="space-y-2">
        {d.nodes.map((node) => {
          const connections = d.edges.filter((e) => e.from === node.id || e.to === node.id);
          return (
            <div
              key={node.id}
              className={cn(
                'rounded-lg px-3 py-2 border',
                node.type === 'main' && 'border-accent/30 bg-accent/10',
                node.type === 'sub' && 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
                node.type === 'detail' && 'border-[var(--glass-border)] bg-transparent',
              )}
            >
              <span className="text-sm font-medium text-foreground">{node.label}</span>
              {connections.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {connections
                    .map((c) => {
                      const targetId = c.from === node.id ? c.to : c.from;
                      const target = d.nodes.find((n) => n.id === targetId);
                      return `${c.label ? `${c.label} → ` : '→ '}${target?.label ?? '?'}`;
                    })
                    .join(' | ')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Eli5View({ data }: { data: unknown }) {
  const d = data as {
    explanations: Array<{
      concept: string;
      explanation: string;
      analogy: string;
      realWorldExample: string;
    }>;
  } | null;
  if (!d?.explanations) return null;
  return (
    <div className="space-y-4">
      {d.explanations.map((e, i) => (
        <div key={i} className="rounded-lg p-4 glass-light border border-[var(--glass-border)]">
          <h4 className="text-sm font-medium text-foreground mb-2">{e.concept}</h4>
          <p className="text-xs text-foreground mb-2">{e.explanation}</p>
          <p className="text-xs text-accent italic mb-1">{e.analogy}</p>
          <p className="text-[10px] text-muted-foreground">Example: {e.realWorldExample}</p>
        </div>
      ))}
    </div>
  );
}
