/**
 * Study Tools — Main container with tabs for all 6 AI study tools
 */

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { StudyToolType } from '@/types/study-tools';
import { BookOpen, Brain, FileText, HelpCircle, Lightbulb, MapIcon } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<StudyToolType>('summary');

  return (
    <div className="bg-card p-2">
      {/* Tab bar — horizontally scrollable */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 mb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.type}
                variant={activeTab === tab.type ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1 h-6 px-2 text-xs shrink-0"
                onClick={() => setActiveTab(tab.type)}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Tool content */}
      <div className="min-h-[100px]">
        {activeTab === 'summary' && <SummaryTool sessionId={sessionId} />}
        {activeTab === 'keyConcepts' && <KeyConceptsTool sessionId={sessionId} />}
        {activeTab === 'flashcards' && <FlashcardTool sessionId={sessionId} />}
        {activeTab === 'quiz' && <QuizTool sessionId={sessionId} />}
        {activeTab === 'conceptMap' && <ConceptMapTool sessionId={sessionId} />}
        {activeTab === 'eli5' && <Eli5Tool sessionId={sessionId} />}
      </div>
    </div>
  );
}
