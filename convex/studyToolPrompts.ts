/**
 * AI prompt templates for Study Tools
 * Each prompt is lecture-type-aware and returns strict JSON output.
 */

import type { LectureType } from './prompts';

const STUDY_FOCUS: Record<LectureType, string> = {
  stem: 'Focus on definitions, theorems, formulas, problem-solving steps, and key relationships between concepts.',
  humanities:
    'Focus on arguments, thesis statements, key figures, historical context, and contrasting perspectives.',
  discussion:
    'Focus on main arguments raised, points of agreement/disagreement, questions, and conclusions reached.',
  lab: 'Focus on objectives, procedures, observations, results, and common pitfalls.',
  review:
    'Focus on exam-relevant topics, key concepts to study, practice problems, and professor emphasis areas.',
  general: 'Focus on main topics, key terms, important relationships, and practical takeaways.',
};

function truncateTranscript(transcript: string, maxChars = 8000): string {
  if (transcript.length <= maxChars) return transcript;
  return `...${transcript.slice(-maxChars)}`;
}

function buildInput(transcript: string, notes: string | undefined): string {
  let input = `TRANSCRIPT:\n${truncateTranscript(transcript)}`;
  if (notes?.trim()) {
    input += `\n\nSTUDENT'S NOTES:\n${notes.slice(0, 3000)}`;
  }
  return input;
}

export function getSummaryPrompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
): string {
  return `You are an expert academic summarizer for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a comprehensive summary of this lecture content.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "summary": "A well-structured summary in 3-5 paragraphs. Use clear topic sentences.",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "...up to 7 takeaways"],
  "wordCount": 0
}

Set wordCount to the actual word count of the summary text.`;
}

export function getKeyConceptsPrompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
): string {
  return `You are an expert concept extractor for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Extract the 5-7 most important concepts from this lecture content. Each concept should have a clear, student-friendly definition.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "concepts": [
    {
      "term": "Concept Name",
      "definition": "Clear, concise definition a student would understand",
      "importance": "high",
      "relatedTerms": ["related term 1", "related term 2"]
    }
  ]
}

importance must be "high", "medium", or "low". Include 5-7 concepts, ordered by importance.`;
}

export function getFlashcardPrompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
  count: number,
): string {
  return `You are an expert flashcard creator for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create ${count} study flashcards from this lecture content. Each card should test one specific concept or fact. The front should be a clear question, and the back should be a concise but complete answer.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "cards": [
    {
      "front": "Question or prompt on the front of the card",
      "back": "Answer or explanation on the back",
      "difficulty": "medium",
      "topic": "Brief topic label"
    }
  ]
}

difficulty must be "easy", "medium", or "hard". Generate exactly ${count} cards. Vary difficulty levels. Cover the most important material first.`;
}

export function getQuizPrompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
  questionCount: number,
): string {
  return `You are an expert quiz creator for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a ${questionCount}-question multiple choice quiz from this lecture content. Each question should have exactly 4 options with one clearly correct answer and three plausible but incorrect distractors.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why the correct answer is right",
      "topic": "Brief topic label"
    }
  ]
}

correctIndex is 0-based (0-3). Generate exactly ${questionCount} questions. Vary difficulty. Cover different topics from the lecture.`;
}

export function getConceptMapPrompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
): string {
  return `You are an expert concept mapper for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a hierarchical concept map from this lecture content. Identify the main topics, their subtopics, and supporting details, along with the relationships between them.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "nodes": [
    { "id": "1", "label": "Main Topic", "type": "main" },
    { "id": "2", "label": "Subtopic", "type": "sub" },
    { "id": "3", "label": "Detail", "type": "detail" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "includes" },
    { "from": "2", "to": "3" }
  ]
}

type must be "main", "sub", or "detail". Keep it to 8-15 nodes maximum. Use short, clear labels (max 4 words per label). Edge labels are optional but helpful.`;
}

export function getEli5Prompt(
  transcript: string,
  notes: string | undefined,
  lectureType: LectureType,
): string {
  return `You are a friendly explainer for ScribeCat, an ADHD-friendly study app. Your job is to take complex lecture concepts and explain them so simply that a 5-year-old could understand.
${STUDY_FOCUS[lectureType]}

Identify the 3-5 most complex concepts from this lecture and explain each one simply, with a relatable analogy and a real-world example.

${buildInput(transcript, notes)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "explanations": [
    {
      "concept": "The complex concept name",
      "explanation": "A simple, jargon-free explanation anyone could understand",
      "analogy": "A relatable analogy (e.g., 'It's like...')",
      "realWorldExample": "A concrete real-world example of this concept"
    }
  ]
}

Keep explanations under 3 sentences each. Make analogies fun and memorable. Include 3-5 concepts.`;
}
