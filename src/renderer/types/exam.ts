export type ExamRoomStatus = 'studying' | 'archived';

export interface ExamSimulationSettings {
  questionCount: number;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
}

export interface ExamSimQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloomLevel: 'recall' | 'comprehension' | 'application' | 'analysis';
}

export interface WeakSpotTopic {
  topic: string;
  accuracy: number;
  correctCount: number;
  totalCount: number;
  lastTestedAt: number;
}

export interface ExamSimAttempt {
  id: string;
  score: number;
  totalQuestions: number;
  timeUsed: number;
  completedAt: number;
  topicBreakdown: Array<{
    topic: string;
    correct: number;
    total: number;
  }>;
}
