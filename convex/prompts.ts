/**
 * Centralized AI prompt templates for ScribeCat
 * Organized by lecture type for context-aware AI generation.
 */

export type LectureType = 'stem' | 'humanities' | 'discussion' | 'lab' | 'review' | 'general';

interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface LectureContext {
  themes: string[];
  currentTopic: string;
  definitions: string[];
  structureHint: string;
}

// --- Lecture-type-specific note structure instructions ---

const NOTE_STYLE: Record<LectureType, string> = {
  stem: `Structure notes with these priorities:
- Definitions and theorems (use blockquotes)
- Formulas and equations (use code blocks)
- Problem-solving steps (numbered lists)
- Key relationships between concepts
- Suggest diagrams for visual concepts (<!-- DIAGRAM: [description] -->)`,

  humanities: `Structure notes with these priorities:
- Central arguments and thesis statements
- Key historical dates, figures, and events
- Contrasting perspectives (use comparison format)
- Important quotes (use blockquotes with attribution)
- Cause-and-effect chains`,

  discussion: `Structure notes with these priorities:
- Main arguments raised by participants
- Points of agreement and disagreement
- Questions that were raised
- Decisions or conclusions reached
- Action items or follow-ups mentioned`,

  lab: `Structure notes with these priorities:
- Objective / goal of the lab or demo
- Step-by-step procedure (numbered lists)
- Observations and measurements
- Results and analysis
- Common pitfalls or errors mentioned`,

  review: `Structure notes with these priorities:
- Topics confirmed for the exam or assignment
- Key concepts to study (with brief definitions)
- Practice problems or sample questions mentioned
- Tips or strategies the professor shared
- Areas the professor emphasized or repeated`,

  general: `Structure notes with these priorities:
- Clear headings (# for main topics, ## for subtopics)
- Bullet points for lists
- **Bold** for key terms and concepts
- Numbered lists for sequential information
- Blockquotes (>) for important definitions
- Suggest diagrams where visuals would help (<!-- DIAGRAM: [description] -->)`,
};

const NUGGET_STYLE: Record<LectureType, string> = {
  stem: 'Focus on definitions, formulas, and key relationships.',
  humanities: 'Focus on arguments, key figures, and important quotes.',
  discussion: 'Focus on main points raised and areas of agreement/disagreement.',
  lab: 'Focus on procedure steps, observations, and results.',
  review: 'Focus on exam-relevant topics, key concepts, and study tips.',
  general: 'Capture the most important points being made.',
};

const CONTEXT_HINTS: Record<LectureType, string> = {
  stem: 'Look for theorems, formulas, problem types, and scientific concepts.',
  humanities: 'Look for thesis statements, historical periods, key figures, and arguments.',
  discussion: 'Look for debate topics, participant viewpoints, and emerging consensus.',
  lab: 'Look for experimental goals, procedures, variables, and outcomes.',
  review: 'Look for exam topics, study priorities, and professor emphasis.',
  general: 'Identify the main themes, current topic, definitions, and lecture structure.',
};

// --- Note generation prompts ---

export function getNoteGenerationPrompt(
  transcript: string,
  lectureType: LectureType,
  userNotes?: string,
): string {
  const style = NOTE_STYLE[lectureType] || NOTE_STYLE.general;

  const userNotesSection = userNotes?.trim()
    ? `\nYOUR NOTES (taken during the lecture):\n${userNotes}\n\nUse these notes as context. Expand on what the student wrote, fill in gaps, and add details they missed. Do NOT simply repeat their notes — complement them.\n`
    : '';

  return `You are an expert note-taking assistant. Given the following lecture transcript, create comprehensive, well-structured notes in markdown format.

${style}

FORMATTING GUIDELINES:
1. Use clear headings (# for main topics, ## for subtopics, ### for details)
2. Use **bold** for key terms and concepts
3. Use *italics* for emphasis
4. Keep notes concise but comprehensive
${userNotesSection}
TRANSCRIPT:
${transcript}

Generate well-structured markdown notes from this transcript.`;
}

export function getNoteGenerationPromptWithCitations(
  segments: TranscriptSegment[],
  lectureType: LectureType,
  userNotes?: string,
): string {
  const style = NOTE_STYLE[lectureType] || NOTE_STYLE.general;

  const finalSegments = segments.filter((s) => s.isFinal);
  const timestampedTranscript = finalSegments.map((s) => `[${s.timestamp}] ${s.text}`).join('\n');

  const userNotesSection = userNotes?.trim()
    ? `\nYOUR NOTES (taken during the lecture):\n${userNotes}\n\nUse these notes as context. Expand on what the student wrote, fill in gaps, and add details they missed. Do NOT simply repeat their notes — complement them.\n`
    : '';

  return `You are an expert note-taking assistant. Given the following timestamped lecture transcript, create comprehensive, well-structured notes in markdown format.

${style}

FORMATTING GUIDELINES:
1. Use clear headings (# for main topics, ## for subtopics, ### for details)
2. Use **bold** for key terms and concepts
3. Use *italics* for emphasis
4. Keep notes concise but comprehensive

CITATION INSTRUCTIONS:
Each transcript line is prefixed with a timestamp in milliseconds [XXXXX].
For each key note or bullet point, include a citation reference to the most relevant transcript timestamp.
Format citations as [cite:XXXXX] at the end of the line, where XXXXX is the timestamp number.
Only use timestamps that appear in the transcript segments below.
${userNotesSection}
TIMESTAMPED TRANSCRIPT:
${timestampedTranscript}

Generate well-structured markdown notes with citation references.`;
}

// --- Nugget Notes prompts ---

export function getNuggetNotePrompt(
  transcript: string,
  context: LectureContext | undefined,
  lectureType: LectureType,
  userNotes?: string,
  recentNoteTexts?: string[],
): string {
  const style = NUGGET_STYLE[lectureType] || NUGGET_STYLE.general;
  const contextStr = context?.currentTopic
    ? `Topic: "${context.currentTopic}". Themes: ${context.themes?.join(', ') || 'general'}.`
    : 'Lecture in progress.';

  const userNotesSection = userNotes?.trim()
    ? `\nSTUDENT'S NOTES SO FAR:\n${userNotes.slice(-300)}\n`
    : '';

  const alreadyCapturedSection =
    recentNoteTexts && recentNoteTexts.length > 0
      ? `\nALREADY CAPTURED (do NOT repeat or rephrase these):\n${recentNoteTexts.map((n) => `- ${n}`).join('\n')}\n`
      : '';

  return `You are a focused note-taker. Capture only the most important NEW idea from this lecture segment.

${style}

CONTEXT: ${contextStr}
${alreadyCapturedSection}${userNotesSection}
RULES:
- Output 0-2 bullet points. If nothing genuinely new or important was said, output nothing at all.
- Each note must cover a DISTINCT concept not already in "ALREADY CAPTURED" above.
- Be concise: one clear sentence per note. No filler, no repetition.
- If the segment is transitional, off-topic, or just repeats prior points, output nothing.

TRANSCRIPT:
"${transcript}"

Output ONLY bullet points starting with "- ", or nothing if nothing new:`;
}

// --- Context extraction prompts ---

export function getContextExtractionPrompt(
  transcript: string,
  previousContext: LectureContext | undefined,
  lectureType: LectureType,
  userNotes?: string,
): string {
  const hint = CONTEXT_HINTS[lectureType] || CONTEXT_HINTS.general;
  const prevContext = previousContext
    ? JSON.stringify(previousContext)
    : JSON.stringify({ themes: [], currentTopic: '', definitions: [], structureHint: '' });

  const userNotesSection = userNotes?.trim()
    ? `\nSTUDENT'S NOTES:\n${userNotes.slice(-500)}\n\nUse these as additional signal for understanding the lecture topic and structure.\n`
    : '';

  return `Analyze this lecture transcript and extract structured context. Be very concise.
${hint}

PREVIOUS CONTEXT:
${prevContext}
${userNotesSection}
RECENT TRANSCRIPT:
"${transcript.slice(-1500)}"

Return ONLY valid JSON (no markdown, no explanation):
{"themes":["theme1","theme2"],"currentTopic":"topic being discussed now","definitions":["term: definition"],"structureHint":"brief note about lecture flow"}`;
}
