/**
 * Type definitions for AI Study Tools
 */

export type StudyToolType =
  | 'summary'
  | 'keyConcepts'
  | 'flashcards'
  | 'quiz'
  | 'conceptMap'
  | 'eli5';

export interface SummaryResult {
  summary: string;
  keyTakeaways: string[];
  wordCount: number;
}

export interface KeyConceptResult {
  concepts: Array<{
    term: string;
    definition: string;
    importance: 'high' | 'medium' | 'low';
    relatedTerms: string[];
  }>;
}

export interface FlashcardResult {
  cards: Array<{
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
  }>;
}

export interface QuizResult {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
  }>;
}

export interface ConceptMapResult {
  nodes: Array<{
    id: string;
    label: string;
    type: 'main' | 'sub' | 'detail';
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

export interface Eli5Result {
  explanations: Array<{
    concept: string;
    explanation: string;
    analogy: string;
    realWorldExample: string;
  }>;
}
