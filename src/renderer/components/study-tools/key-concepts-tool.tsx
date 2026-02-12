/**
 * Key Concepts Tool — AI-extracted important concepts with definitions
 */

import { Card } from '@/components/ui/card';
import type { KeyConceptResult } from '@/types/study-tools';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface KeyConceptsToolProps {
  sessionId: Id<'sessions'>;
}

const IMPORTANCE_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
};

export function KeyConceptsTool({ sessionId }: KeyConceptsToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<KeyConceptResult>(
    sessionId,
    'keyConcepts',
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={generate}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Extract Key Concepts"
        description="Identify the 5-7 most important concepts with definitions."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{data.concepts.length} concepts</span>
        <GenerateButton
          onGenerate={generate}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>

      <div className="space-y-1">
        {data.concepts.map((concept, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <Card key={concept.term} className="overflow-hidden">
              <button
                type="button"
                className="flex items-center gap-2 w-full p-2 text-left hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${IMPORTANCE_COLORS[concept.importance] || IMPORTANCE_COLORS.medium}`}
                />
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground truncate">{concept.term}</span>
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 pt-0 ml-7">
                  <p className="text-xs text-foreground/80 leading-relaxed">{concept.definition}</p>
                  {concept.relatedTerms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {concept.relatedTerms.map((term) => (
                        <span
                          key={term}
                          className="inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
