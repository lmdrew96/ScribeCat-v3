import type { Recording } from '@/components/study-view';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Mic } from 'lucide-react';

interface StudyContentProps {
  recording: Recording;
}

export function StudyContent({ recording }: StudyContentProps) {
  return (
    <div className="h-full">
      <div className="mb-2">
        <h1 className="text-base font-semibold text-foreground">{recording.title}</h1>
        <p className="text-xs text-muted-foreground">
          {recording.date} • {recording.duration}
        </p>
      </div>

      <Tabs defaultValue="transcript" className="h-[calc(100%-2.5rem)]">
        <TabsList className="mb-2 bg-secondary/50 h-7">
          <TabsTrigger value="transcript" className="gap-1 text-xs h-6 px-2">
            <Mic className="h-3 w-3" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs h-6 px-2">
            <FileText className="h-3 w-3" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-lg bg-card p-3">
            <p className="whitespace-pre-wrap leading-relaxed text-xs text-foreground/90">
              {recording.transcript}
            </p>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="h-[calc(100%-2rem)] mt-0">
          <ScrollArea className="h-full rounded-lg bg-card p-3">
            <p className="whitespace-pre-wrap leading-relaxed text-xs text-foreground/90">
              {recording.notes}
            </p>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
