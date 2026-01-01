import type { Recording } from '@/components/study-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, FileText, HelpCircle, Layers, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface StudyToolsProps {
  recording: Recording;
}

const sampleFlashcards = [
  {
    front: 'What is supervised learning?',
    back: 'A type of machine learning where the model is trained on labeled data with known inputs and outputs.',
  },
  {
    front: 'What are the main types of memory?',
    back: 'Sensory memory, short-term (working) memory, and long-term memory.',
  },
  {
    front: 'What is a neural network?',
    back: 'A computational model inspired by the brain, consisting of interconnected nodes (neurons) organized in layers.',
  },
];

const sampleQuestions = [
  {
    question: 'Which type of learning uses labeled training data?',
    options: ['Supervised', 'Unsupervised', 'Reinforcement', 'Semi-supervised'],
    correct: 0,
  },
];

export function StudyTools({ recording: _recording }: StudyToolsProps) {
  const [currentCard, setCurrentCard] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'flashcards' | 'summary' | 'questions'>('flashcards');

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % sampleFlashcards.length);
    setShowBack(false);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + sampleFlashcards.length) % sampleFlashcards.length);
    setShowBack(false);
  };

  return (
    <div className="bg-card p-2">
      {/* Compact tab buttons */}
      <div className="flex gap-1 mb-2">
        <Button
          variant={activeTab === 'flashcards' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1 h-6 px-2 text-xs"
          onClick={() => setActiveTab('flashcards')}
        >
          <Layers className="h-3 w-3" />
          Cards
        </Button>
        <Button
          variant={activeTab === 'summary' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1 h-6 px-2 text-xs"
          onClick={() => setActiveTab('summary')}
        >
          <FileText className="h-3 w-3" />
          Summary
        </Button>
        <Button
          variant={activeTab === 'questions' ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1 h-6 px-2 text-xs"
          onClick={() => setActiveTab('questions')}
        >
          <HelpCircle className="h-3 w-3" />
          Quiz
        </Button>
      </div>

      {/* Content area - compact cards */}
      {activeTab === 'flashcards' && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevCard} className="h-7 w-7 shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Card
            className="flex h-20 flex-1 cursor-pointer items-center justify-center p-3 transition-all hover:bg-secondary/30"
            onClick={() => setShowBack(!showBack)}
          >
            <p className="text-center text-xs text-foreground">
              {showBack ? sampleFlashcards[currentCard].back : sampleFlashcards[currentCard].front}
            </p>
          </Card>
          <Button variant="ghost" size="icon" onClick={nextCard} className="h-7 w-7 shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {currentCard + 1}/{sampleFlashcards.length}
          </span>
        </div>
      )}

      {activeTab === 'summary' && (
        <Card className="p-2">
          <ul className="space-y-1 text-xs text-foreground/90">
            <li className="flex items-start gap-1.5">
              <span className="text-primary">•</span>
              Machine learning models learn patterns from data
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-primary">•</span>
              Supervised learning requires labeled training examples
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-primary">•</span>
              Neural networks transform data through multiple layers
            </li>
          </ul>
        </Card>
      )}

      {activeTab === 'questions' && (
        <Card className="p-2">
          <p className="mb-2 text-xs font-medium text-foreground">{sampleQuestions[0].question}</p>
          <div className="grid grid-cols-2 gap-1">
            {sampleQuestions[0].options.map((option, i) => (
              <Button
                key={i}
                variant={
                  selectedAnswer === i
                    ? i === sampleQuestions[0].correct
                      ? 'default'
                      : 'destructive'
                    : 'secondary'
                }
                className="justify-start h-7 text-xs px-2"
                onClick={() => setSelectedAnswer(i)}
              >
                {option}
              </Button>
            ))}
          </div>
          {selectedAnswer !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 gap-1 h-6 text-xs"
              onClick={() => setSelectedAnswer(null)}
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
