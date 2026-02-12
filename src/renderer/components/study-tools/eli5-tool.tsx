/**
 * ELI5 Tool — Simple explanations with analogies and real-world examples
 */

import { Card } from '@/components/ui/card';
import type { Eli5Result } from '@/types/study-tools';
import { ChevronDown, ChevronRight, Globe, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface Eli5ToolProps {
  sessionId: Id<'sessions'>;
}

export function Eli5Tool({ sessionId }: Eli5ToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<Eli5Result>(
    sessionId,
    'eli5',
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={generate}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Explain Like I'm 5"
        description="Get simple explanations with fun analogies for complex concepts."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <GenerateButton
          onGenerate={generate}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>

      <div className="space-y-1.5">
        {data.explanations.map((item, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <Card key={item.concept} className="overflow-hidden">
              <button
                type="button"
                className="flex items-center gap-2 w-full p-2.5 text-left hover:bg-[var(--glass-bg-light)] transition-colors"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{item.concept}</span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0 space-y-2">
                  {/* Simple explanation */}
                  <p className="text-sm text-foreground/90 leading-relaxed">{item.explanation}</p>

                  {/* Analogy */}
                  <div className="flex items-start gap-2 rounded-md glass-light p-2">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                    <p className="text-xs text-foreground/80 leading-relaxed">{item.analogy}</p>
                  </div>

                  {/* Real-world example */}
                  <div className="flex items-start gap-2 rounded-md glass-light p-2">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.realWorldExample}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
