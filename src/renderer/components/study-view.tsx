import { RecordingsSidebar } from '@/components/recordings-sidebar';
import { StudyContent } from '@/components/study-content';
import { StudyTools } from '@/components/study-tools';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useState } from 'react';

export interface Recording {
  id: string;
  title: string;
  date: string;
  duration: string;
  transcript: string;
  notes: string;
}

const sampleRecordings: Recording[] = [
  {
    id: '1',
    title: 'Machine Learning Basics',
    date: 'Dec 28, 2025',
    duration: '45:23',
    transcript:
      'Today we covered the fundamentals of machine learning, including supervised and unsupervised learning approaches. We discussed how neural networks process information through layers of neurons...',
    notes:
      'Key concepts:\n• Supervised vs Unsupervised learning\n• Neural network architecture\n• Training and inference phases\n• Loss functions and optimization',
  },
  {
    id: '2',
    title: 'Data Structures Review',
    date: 'Dec 26, 2025',
    duration: '38:15',
    transcript:
      'In this lecture, we reviewed essential data structures including arrays, linked lists, trees, and graphs. Understanding these fundamentals is crucial for algorithm design...',
    notes:
      'Data structures covered:\n• Arrays and dynamic arrays\n• Linked lists (singly, doubly)\n• Binary trees and BSTs\n• Hash tables\n• Graphs (adjacency list/matrix)',
  },
  {
    id: '3',
    title: 'Psychology 101 - Memory',
    date: 'Dec 24, 2025',
    duration: '52:08',
    transcript:
      'Memory is a fascinating cognitive process. We have short-term memory, which holds information temporarily, and long-term memory, which can store information indefinitely...',
    notes:
      'Memory types:\n• Sensory memory\n• Short-term/working memory\n• Long-term memory (explicit vs implicit)\n• Encoding strategies for better retention',
  },
];

export function StudyView() {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full">
      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <div className="w-56 border-r border-border shrink-0">
          <RecordingsSidebar
            recordings={sampleRecordings}
            selectedId={selectedRecording?.id}
            onSelect={setSelectedRecording}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Collapse toggle when sidebar is hidden */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-14 z-10 h-7 w-7"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {selectedRecording ? (
          <>
            <div className="flex-1 overflow-auto p-3">
              <StudyContent recording={selectedRecording} />
            </div>
            <div className="border-t border-border">
              <StudyTools recording={selectedRecording} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h3 className="mb-1 text-sm font-medium text-foreground">Select a recording</h3>
              <p className="text-xs text-muted-foreground">Choose from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
