/**
 * Study Tools — Main container with tabs for all 6 AI study tools
 */

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { StudyToolType } from '@/types/study-tools';
import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Lightbulb,
  MapIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../ui/button';
import { ConceptMapTool } from './concept-map-tool';
import { Eli5Tool } from './eli5-tool';
import { FlashcardTool } from './flashcard-tool';
import { KeyConceptsTool } from './key-concepts-tool';
import { QuizTool } from './quiz-tool';
import { SummaryTool } from './summary-tool';

interface StudyToolsProps {
  sessionId: Id<'sessions'>;
}

const TABS: Array<{ type: StudyToolType; label: string; icon: typeof FileText }> = [
  { type: 'summary', label: 'Summary', icon: FileText },
  { type: 'keyConcepts', label: 'Concepts', icon: Brain },
  { type: 'flashcards', label: 'Cards', icon: BookOpen },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle },
  { type: 'conceptMap', label: 'Map', icon: MapIcon },
  { type: 'eli5', label: 'ELI5', icon: Lightbulb },
];

export function StudyTools({ sessionId }: StudyToolsProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<StudyToolType>('summary');
  const [expanded, setExpanded] = useState(!isMobile);

  function handleTabClick(type: StudyToolType) {
    if (!expanded) {
      setExpanded(true);
    }
    setActiveTab(type);
  }

  return (
    <div className="glass p-3 rounded-t-xl">
      {/* Header row — tabs + collapse toggle */}
      <div className="flex items-center gap-2">
        <ScrollArea className="flex-1 min-w-0">
          <div className={`flex gap-2 ${expanded ? 'mb-3' : ''}`}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.type}
                  variant={activeTab === tab.type ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-7 px-3 text-xs shrink-0"
                  onClick={() => handleTabClick(tab.type)}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Collapse study tools' : 'Expand study tools'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Tool content — only visible when expanded */}
      {expanded && (
        <div className="min-h-[120px] max-h-[40vh] overflow-y-auto">
          {activeTab === 'summary' && <SummaryTool sessionId={sessionId} />}
          {activeTab === 'keyConcepts' && <KeyConceptsTool sessionId={sessionId} />}
          {activeTab === 'flashcards' && <FlashcardTool sessionId={sessionId} />}
          {activeTab === 'quiz' && <QuizTool sessionId={sessionId} />}
          {activeTab === 'conceptMap' && <ConceptMapTool sessionId={sessionId} />}
          {activeTab === 'eli5' && <Eli5Tool sessionId={sessionId} />}
        </div>
      )}
    </div>
  );
}
