/**
 * Question pool — static fallback bank used by Study Strike.
 *
 * Phase 4 follow-up: replace this with questions pulled from the user's
 * own studyToolResults via the bridge (push from React when available,
 * fall back to this pool when no study data exists).
 */

import type { EnemyTier } from './enemies';

export interface Question {
  prompt: string;
  /** 4 multiple-choice options. */
  choices: string[];
  /** Index into `choices` that's correct. */
  answerIndex: number;
}

const EASY: Question[] = [
  {
    prompt: 'What is 7 × 8?',
    choices: ['54', '56', '64', '49'],
    answerIndex: 1,
  },
  {
    prompt: 'Which planet is closest to the Sun?',
    choices: ['Venus', 'Earth', 'Mercury', 'Mars'],
    answerIndex: 2,
  },
  {
    prompt: 'How many sides does a hexagon have?',
    choices: ['5', '6', '7', '8'],
    answerIndex: 1,
  },
  {
    prompt: 'What is the chemical symbol for water?',
    choices: ['Wo', 'H2O', 'O2', 'HO'],
    answerIndex: 1,
  },
];

const MEDIUM: Question[] = [
  {
    prompt: 'Who wrote "Pride and Prejudice"?',
    choices: ['Charlotte Brontë', 'Jane Austen', 'Mary Shelley', 'Virginia Woolf'],
    answerIndex: 1,
  },
  {
    prompt: 'What is the square root of 144?',
    choices: ['10', '12', '14', '16'],
    answerIndex: 1,
  },
  {
    prompt: 'Which gas do plants absorb for photosynthesis?',
    choices: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    answerIndex: 2,
  },
  {
    prompt: 'In what year did WWII end?',
    choices: ['1942', '1944', '1945', '1948'],
    answerIndex: 2,
  },
];

const HARD: Question[] = [
  {
    prompt: 'What is the derivative of x³?',
    choices: ['x²', '3x²', '3x', 'x³/3'],
    answerIndex: 1,
  },
  {
    prompt: 'What is the powerhouse of the cell?',
    choices: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi apparatus'],
    answerIndex: 2,
  },
  {
    prompt: 'Which logical fallacy attacks the person, not the argument?',
    choices: ['Strawman', 'Ad hominem', 'Red herring', 'Slippery slope'],
    answerIndex: 1,
  },
  {
    prompt: 'What is the time complexity of binary search?',
    choices: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
    answerIndex: 2,
  },
];

const BOSS_POOL: Question[] = [
  ...HARD,
  {
    prompt: 'Which theorem relates a²+b²=c²?',
    choices: ['Fermat', 'Euclid', 'Pythagoras', 'Newton'],
    answerIndex: 2,
  },
  {
    prompt: 'What protein governs cell division checkpoints?',
    choices: ['p53', 'hemoglobin', 'insulin', 'keratin'],
    answerIndex: 0,
  },
];

export function pickQuestion(tier: EnemyTier): Question {
  const pool = tier === 'easy' ? EASY : tier === 'medium' ? MEDIUM : tier === 'hard' ? HARD : BOSS_POOL;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
