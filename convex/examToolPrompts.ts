/**
 * AI prompt templates for Exam Study Tools (multi-session variants).
 * Uses the Exam Room Brain's topic index as primary context, with truncated
 * session excerpts as supporting material. Same JSON schemas as studyToolPrompts.ts.
 */

import type { LectureType } from './prompts';
import { STUDY_FOCUS, truncateTranscript } from './studyToolPrompts';

// ─── Multi-Session Input Builder ─────────────────────────────

export function buildExamInput(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  maxTotalTranscriptChars = 12000,
  maxTotalNotesChars = 4000,
): string {
  const n = sessions.length || 1;
  const perSessionTranscript = Math.floor(maxTotalTranscriptChars / n);
  const perSessionNotes = Math.floor(maxTotalNotesChars / n);

  let input = `${brainContext}\n\nSESSION CONTENT:\n\n`;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    input += `--- SESSION ${i + 1}: "${s.title}" ---\n`;
    if (s.transcript) {
      input += `TRANSCRIPT:\n${truncateTranscript(s.transcript, perSessionTranscript)}\n`;
    }
    if (s.notes?.trim()) {
      input += `NOTES:\n${s.notes.slice(0, perSessionNotes)}\n`;
    }
    input += '\n';
  }

  return input;
}

// ─── Exam-Scoped Prompt Functions ────────────────────────────

export function getExamSummaryPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
): string {
  return `You are an expert academic summarizer for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a comprehensive exam study summary covering material from ALL sessions in this exam room. Organize by major themes rather than by individual session.

${buildExamInput(brainContext, sessions)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "summary": "A well-structured summary in 4-7 paragraphs covering all sessions. Use clear topic sentences. Organize thematically.",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "...up to 10 takeaways"],
  "wordCount": 0,
  "sessionsCovered": ["session title 1", "session title 2"]
}

Set wordCount to the actual word count of the summary text.`;
}

export function getExamKeyConceptsPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
): string {
  return `You are an expert concept extractor for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Extract the 8-12 most important concepts from ALL sessions in this exam room. These should be the concepts most likely to appear on an exam.

${buildExamInput(brainContext, sessions)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "concepts": [
    {
      "term": "Concept Name",
      "definition": "Clear, concise definition a student would understand",
      "importance": "high",
      "relatedTerms": ["related term 1", "related term 2"],
      "sourceSession": "Which session this concept is primarily from"
    }
  ]
}

importance must be "high", "medium", or "low". Include 8-12 concepts, ordered by importance. Cover all sessions evenly.`;
}

export function getExamFlashcardPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
  count: number,
): string {
  return `You are an expert flashcard creator for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create ${count} study flashcards covering material from ALL sessions in this exam room. Distribute cards evenly across sessions. Each card should test one specific concept or fact.

${buildExamInput(brainContext, sessions)}

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

difficulty must be "easy", "medium", or "hard". Generate exactly ${count} cards. Vary difficulty levels. Cover the most important material from all sessions.`;
}

export function getExamQuizPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
  questionCount: number,
): string {
  return `You are an expert quiz creator for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a ${questionCount}-question multiple choice quiz covering material from ALL sessions in this exam room. Distribute questions across sessions. Each question should have 4 options.

${buildExamInput(brainContext, sessions)}

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

correctIndex is 0-based (0-3). Generate exactly ${questionCount} questions. Vary difficulty. Cover different topics from all sessions.`;
}

export function getExamConceptMapPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
): string {
  return `You are an expert concept mapper for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a comprehensive concept map showing how topics from ALL sessions connect. This is for exam review, so emphasize cross-session relationships.

${buildExamInput(brainContext, sessions)}

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

type must be "main", "sub", or "detail". Use 10-20 nodes. Show cross-session connections where concepts relate.`;
}

export function getExamEli5Prompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
): string {
  return `You are a friendly explainer for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Identify the 5-7 most complex concepts from ALL sessions in this exam room and explain each simply.

${buildExamInput(brainContext, sessions)}

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

Keep explanations under 3 sentences each. Make analogies fun and memorable. Include 5-7 concepts from across all sessions.`;
}

/** Exam simulation prompt — generates exam-grade questions across Bloom's taxonomy */
export function getExamSimulationPrompt(
  brainContext: string,
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
  questionCount: number,
): string {
  return `You are an expert exam writer for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

Create a ${questionCount}-question practice exam covering ALL material from these sessions. This should feel like a real exam:
- Include recall, comprehension, application, and analysis questions
- Vary difficulty (easy, medium, hard) with roughly 25% easy, 50% medium, 25% hard
- Cover all sessions proportionally
- Make distractors plausible — students should need real understanding to answer

${buildExamInput(brainContext, sessions)}

Return ONLY valid JSON matching this exact schema (no markdown wrapping, no explanation outside the JSON):
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Detailed explanation of why the correct answer is right and why others are wrong",
      "topic": "Brief topic label",
      "difficulty": "medium",
      "bloomLevel": "application"
    }
  ]
}

correctIndex is 0-based (0-3). bloomLevel must be "recall", "comprehension", "application", or "analysis". Generate exactly ${questionCount} questions.`;
}

/** Targeted review prompt — generates content focused on weak topics */
export function getTargetedReviewPrompt(
  weakTopics: string[],
  sessions: Array<{ title: string; transcript: string; notes?: string }>,
  lectureType: LectureType,
): string {
  const topicList = weakTopics.map((t) => `• ${t}`).join('\n');

  // For targeted review, we give more budget per session since we've pre-filtered
  const maxChars = Math.min(6000, Math.floor(18000 / (sessions.length || 1)));

  let input = 'RELEVANT SESSION CONTENT:\n\n';
  for (const s of sessions) {
    input += `--- "${s.title}" ---\n`;
    if (s.transcript) input += `${truncateTranscript(s.transcript, maxChars)}\n`;
    if (s.notes?.trim()) input += `NOTES: ${s.notes.slice(0, 2000)}\n`;
    input += '\n';
  }

  return `You are an expert study coach for ScribeCat, an ADHD-friendly study app.
${STUDY_FOCUS[lectureType]}

The student is struggling with these topics based on their quiz/flashcard performance:
${topicList}

Create a focused review package with flashcards and quiz questions targeting ONLY these weak areas. Make explanations extra clear since the student is struggling here.

${input}

Return ONLY valid JSON matching this exact schema:
{
  "cards": [
    {
      "front": "Question focusing on a weak topic",
      "back": "Clear, detailed explanation",
      "difficulty": "medium",
      "topic": "The weak topic this targets"
    }
  ],
  "questions": [
    {
      "question": "Quiz question on a weak topic",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Detailed explanation to help the student understand",
      "topic": "The weak topic this targets"
    }
  ]
}

Generate 3-5 flashcards and 3-5 quiz questions. Focus entirely on the weak topics listed above.`;
}
