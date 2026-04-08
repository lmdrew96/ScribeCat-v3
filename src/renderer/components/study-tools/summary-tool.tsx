/**
 * Summary Tool — AI-generated comprehensive session summary
 */

import { Card } from '@/components/ui/card';
import type { SummaryResult } from '@/types/study-tools';
import type { Id } from '../../../../convex/_generated/dataModel';
import { ToolWrapper } from './tool-wrapper';
import { useStudyTool } from './use-study-tool';

interface SummaryToolProps {
  sessionId: Id<'sessions'>;
}

export function SummaryTool({ sessionId }: SummaryToolProps) {
  const tool = useStudyTool<SummaryResult>(sessionId, 'summary');

  return (
    <ToolWrapper
      {...tool}
      label="Generate Summary"
      description="Create a comprehensive summary of your session with key takeaways."
      headerLeft={
        tool.data && (
          <span className="text-[10px] text-muted-foreground">{tool.data.wordCount} words</span>
        )
      }
    >
      <Card className="p-3">
        <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
          {tool.data?.summary}
        </p>
      </Card>

      {(tool.data?.keyTakeaways.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Key Takeaways</p>
          <ul className="space-y-1">
            {tool.data?.keyTakeaways.map((takeaway) => (
              <li key={takeaway} className="flex items-start gap-1.5 text-xs text-foreground/90">
                <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolWrapper>
  );
}
