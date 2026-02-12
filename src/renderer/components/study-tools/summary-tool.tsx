/**
 * Summary Tool — AI-generated comprehensive session summary
 */

import { Card } from '@/components/ui/card';
import type { SummaryResult } from '@/types/study-tools';
import type { Id } from '../../../../convex/_generated/dataModel';
import { GenerateButton } from './generate-button';
import { useStudyTool } from './use-study-tool';

interface SummaryToolProps {
  sessionId: Id<'sessions'>;
}

export function SummaryTool({ sessionId }: SummaryToolProps) {
  const { data, isGenerating, error, generate, hasData } = useStudyTool<SummaryResult>(
    sessionId,
    'summary',
  );

  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={generate}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label="Generate Summary"
        description="Create a comprehensive summary of your lecture with key takeaways."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{data.wordCount} words</span>
        <GenerateButton
          onGenerate={generate}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>

      <Card className="p-3">
        <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
          {data.summary}
        </p>
      </Card>

      {data.keyTakeaways.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Key Takeaways</p>
          <ul className="space-y-1">
            {data.keyTakeaways.map((takeaway) => (
              <li key={takeaway} className="flex items-start gap-1.5 text-xs text-foreground/90">
                <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
