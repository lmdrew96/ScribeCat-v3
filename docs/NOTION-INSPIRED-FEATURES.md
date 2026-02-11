# Notion-Inspired Features — Implementation Plan

> **Three features that upgrade ScribeCat's recording→notes pipeline**
>
> These enhance Phases 1-2 (Capture + Process) before Phase 3 begins.
> Each feature builds on existing infrastructure — no new services needed.
>
> Last updated: February 2026

---

## Feature Overview

| # | Feature | What It Does | Key Files Touched |
|---|---------|-------------|-------------------|
| 1 | **Dual-Input Synthesis** | User's quick notes + transcript → smarter AI output | `recording-panel.tsx`, `ai.ts`, `nuggetNotes.ts`, `schema.ts` |
| 2 | **Lecture-Type-Aware AI** | Pick lecture format → AI customizes note style | `recording-panel.tsx`, `ai.ts`, `nuggetNotes.ts`, `lectureContext.ts`, `schema.ts` |
| 3 | **Transcript ↔ Notes Citations** | Generated notes link back to transcript timestamps → click to hear | `ai.ts`, `notes-panel.tsx`, `study-content.tsx`, TipTap extension |

**Recommended build order:** 2 → 1 → 3 (each builds on the previous)

---

## Feature 1: Dual-Input Synthesis

### The Idea

Notion proved that AI summaries dramatically improve when fed **both** the transcript AND the user's manual notes. The user adds strategic highlights ("this will be on the exam", "key formula", "professor emphasized this") that the AI can't infer from speech alone.

ScribeCat already has Nugget Notes (AI-generated bullet points during recording), but the user can't add their own quick observations during a recording session. This feature adds that capability and feeds both streams to AI.

### Current State

```
Recording Panel layout (right side):
┌─────────────────────────┐
│ Live Transcript          │  ← flex-[3], scrolling segments
│                          │
│                          │
├─────────────────────────┤
│ Nugget's Notes           │  ← AI-generated bullets, collapsible
├─────────────────────────┤
│ ~~~ Waveform ~~~         │  ← AudioWaveform component
├─────────────────────────┤
│ [Mic] 02:34 [Pause]     │  ← Controls bar
└─────────────────────────┘
```

- `recording-panel.tsx:250-349` — renders this layout
- `ai.ts:19-35` — prompt only receives `transcript`, no user context
- `nuggetNotes.ts:49-56` — prompt only receives transcript + lecture context
- `schema.ts:9-30` — `sessions` table has no field for user quick notes

### What Changes

#### 1a. Schema: Add `quickNotes` field to sessions

**File:** `convex/schema.ts`

Add to the `sessions` table:
```typescript
quickNotes: v.optional(v.string()), // User's manual notes during recording
```

This stores the raw text of whatever the user typed during the session. Simple string, not rich text — this is a scratchpad, not the TipTap editor.

#### 1b. Mutation: Allow updating quickNotes

**File:** `convex/sessions.ts`

Add `quickNotes` to the `update` mutation args:
```typescript
quickNotes: v.optional(v.string()),
```

No new mutation needed — the existing `update` just needs the new field in its args.

#### 1c. UI: Quick Notes textarea in RecordingPanel

**File:** `src/renderer/components/recording-panel.tsx`

Add a new collapsible section between Nugget's Notes and the Waveform:

```
┌─────────────────────────┐
│ Live Transcript          │
├─────────────────────────┤
│ Nugget's Notes           │
├─────────────────────────┤
│ 📝 My Notes        [▼]  │  ← NEW: collapsible quick notes
│ ┌─────────────────────┐ │
│ │ (textarea)          │ │  ← plain textarea, not TipTap
│ │ "prof said this is  │ │
│ │  on the final..."   │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ ~~~ Waveform ~~~         │
├─────────────────────────┤
│ [Mic] 02:34 [Pause]     │
└─────────────────────────┘
```

Implementation details:
- Simple `<textarea>` with a collapsible wrapper (same pattern as NuggetNotesPanel)
- State: `const [quickNotes, setQuickNotes] = useState('')`
- Auto-save: debounced save to Convex via `updateSession({ id: currentSessionId, quickNotes })` every 2 seconds on change
- Only visible when recording is active (no point showing it otherwise)
- Placeholder text: *"Jot quick notes here — the AI will use these when generating your notes"*
- Compact: `h-20` with resize handle, max `h-40`
- Clear when new recording starts (alongside nugget notes clear)
- Keyboard shortcut: `Ctrl/Cmd+Shift+N` to focus the textarea while recording

**New component:** `src/renderer/components/quick-notes-input.tsx`
- Props: `value`, `onChange`, `isRecording`, `isCollapsed`, `onToggleCollapse`
- Renders the collapsible textarea with header
- Handles auto-resize as text grows

#### 1d. Pass quickNotes to AI generation

**File:** `convex/ai.ts`

Update `generateNotesFromTranscript` to accept and use quick notes:

```typescript
args: {
  transcript: v.string(),
  sessionId: v.string(),
  quickNotes: v.optional(v.string()), // NEW
},
```

Update the prompt to incorporate user notes:

```
You are an expert note-taking assistant. Given the following lecture transcript
and the student's own notes taken during the lecture, create comprehensive,
well-structured notes in markdown format.

STUDENT'S NOTES (pay special attention to these — the student highlighted
these as important):
${args.quickNotes || '(No manual notes provided)'}

TRANSCRIPT:
${args.transcript}
```

The student's notes should appear BEFORE the transcript in the prompt — this tells Claude to weight them more heavily.

#### 1e. Pass quickNotes to Nugget Notes pipeline

**File:** `convex/nuggetNotes.ts`

Update the HTTP action to accept `quickNotes`:

```typescript
const { transcript, context, recordingTimeSeconds, quickNotes } = await request.json();
```

Update the prompt:

```
Create 1-3 concise bullet notes from this lecture segment.

CONTEXT: ${contextStr}
${quickNotes ? `\nSTUDENT NOTES: "${quickNotes.slice(-200)}"` : ''}

TRANSCRIPT:
"${transcript.slice(-500)}"
```

**File:** `src/renderer/hooks/use-nugget-notes.ts`

Update `processTranscriptChunk` and `generateNotes` to accept and forward `quickNotes`:
- Add `quickNotes?: string` parameter to `processTranscriptChunk`
- Pass through to `generateNotes` fetch body
- RecordingPanel passes current quickNotes state when calling `processTranscriptChunk`

#### 1f. Wire it up in RecordingPanel

**File:** `src/renderer/components/recording-panel.tsx`

- Pass `quickNotes` state to `nuggetNotes.processTranscriptChunk()` (line ~163)
- Pass `quickNotes` when calling final note generation via `handleStop()`
- Clear `quickNotes` state when starting a new recording
- Save quickNotes to session on stop (alongside duration, transcript)

#### 1g. Wire it up in NotesPanel

**File:** `src/renderer/components/notes-panel.tsx`

- In `handleGenerateNotes` (line ~186), pass `session.quickNotes` to the generate action:
  ```typescript
  const data = await generateNotesAction({
    transcript: session.transcript,
    sessionId: sessionId as string,
    quickNotes: session.quickNotes, // NEW
  });
  ```

### Testing Checklist

- [ ] Can type quick notes during recording
- [ ] Quick notes persist if app is closed mid-recording
- [ ] Quick notes auto-save every 2 seconds
- [ ] AI-generated notes reference/incorporate user's quick notes
- [ ] Nugget Notes reference quick notes context
- [ ] Quick notes area only appears during recording
- [ ] Quick notes clear when starting a new recording
- [ ] Can collapse/expand quick notes area
- [ ] Works with empty quick notes (no errors)

---

## Feature 2: Lecture-Type-Aware AI

### The Idea

A STEM lecture about thermodynamics and a humanities seminar about postmodernism need completely different note structures. Right now, the AI prompt is generic. Notion lets users pick a "meeting format" that changes AI output structure. ScribeCat should do the same for lectures.

### Current State

- `recording-panel.tsx:179-213` — `handleRecord()` creates session with generic title, no lecture type
- `ai.ts:19-35` — one-size-fits-all prompt
- `nuggetNotes.ts:49-56` — generic note generation prompt
- `lectureContext.ts:48-57` — generic context extraction prompt
- `schema.ts:9-30` — no `lectureType` field on sessions

### Lecture Types

| Type | Description | Note Style |
|------|-------------|------------|
| **STEM** | Math, science, engineering | Formulas, definitions, problem-solving steps, diagrams |
| **Humanities** | History, literature, philosophy | Arguments, perspectives, key quotes, chronology |
| **Discussion** | Seminar, debate, group work | Key arguments, agreements/disagreements, action items |
| **Lab / Demo** | Hands-on, coding, experiments | Step-by-step procedures, observations, results |
| **Review** | Exam review, reading summary | Key topics, what to study, practice questions |
| **General** | Default / other | Current behavior (generic well-structured notes) |

### What Changes

#### 2a. Schema: Add `lectureType` to sessions

**File:** `convex/schema.ts`

```typescript
lectureType: v.optional(v.string()), // "stem" | "humanities" | "discussion" | "lab" | "review" | "general"
```

#### 2b. Mutation: Allow setting lectureType

**File:** `convex/sessions.ts`

Add to `create` mutation args:
```typescript
lectureType: v.optional(v.string()),
```

And in the handler, include it in the insert:
```typescript
lectureType: args.lectureType ?? 'general',
```

Add to `update` mutation args too:
```typescript
lectureType: v.optional(v.string()),
```

#### 2c. UI: Lecture type selector before recording

**File:** `src/renderer/components/recording-panel.tsx`

Before hitting record, show a compact type selector alongside the mic selector:

```
┌─────────────────────────────────────┐
│ [Select microphone ▼] [STEM ▼]     │  ← device + lecture type side by side
│                       [● Record]    │
└─────────────────────────────────────┘
```

Implementation:
- Use existing shadcn `Select` component (already imported)
- State: `const [lectureType, setLectureType] = useState<string>('general')`
- Only show when NOT recording (same as device selector, line 272)
- Options rendered with icons from lucide-react:
  - `Atom` → STEM
  - `BookOpen` → Humanities
  - `MessageCircle` → Discussion
  - `FlaskConical` → Lab / Demo
  - `ClipboardCheck` → Review
  - `FileText` → General
- Pass to `createSession()` in `handleRecord()`:
  ```typescript
  const sessionId = await createSession({
    userId,
    title: `Recording ${new Date().toLocaleString()}`,
    lectureType,
  });
  ```

**New component:** `src/renderer/components/lecture-type-select.tsx`
- Encapsulates the select with icons and descriptions
- Props: `value`, `onChange`, `disabled`

#### 2d. Type-specific prompt templates

**New file:** `convex/prompts.ts`

Central place for all AI prompt logic. Contains:

```typescript
export type LectureType = 'stem' | 'humanities' | 'discussion' | 'lab' | 'review' | 'general';

export function getNoteGenerationPrompt(
  transcript: string,
  lectureType: LectureType,
  quickNotes?: string,
): string { ... }

export function getNuggetNotePrompt(
  transcript: string,
  context: LectureContext,
  lectureType: LectureType,
  quickNotes?: string,
): string { ... }

export function getContextExtractionPrompt(
  transcript: string,
  previousContext: LectureContext,
  lectureType: LectureType,
): string { ... }
```

Example prompt variations:

**STEM:**
```
Structure notes with these priorities:
- Definitions and theorems (use blockquotes)
- Formulas and equations (use code blocks for math)
- Problem-solving steps (numbered lists)
- Key relationships between concepts
- Suggest diagrams for visual concepts
```

**Humanities:**
```
Structure notes with these priorities:
- Central arguments and thesis statements
- Key historical dates and figures
- Contrasting perspectives (use comparison tables)
- Important quotes (use blockquotes with attribution)
- Cause-and-effect chains
```

**Discussion:**
```
Structure notes with these priorities:
- Main arguments raised and by whom (if identifiable)
- Points of agreement and disagreement
- Questions that were raised
- Decisions or conclusions reached
- Action items or follow-ups mentioned
```

**Lab / Demo:**
```
Structure notes with these priorities:
- Objective / goal of the lab or demo
- Step-by-step procedure (numbered lists)
- Observations and measurements
- Results and analysis
- Common pitfalls or errors mentioned
```

**Review:**
```
Structure notes with these priorities:
- Topics confirmed for the exam/assignment
- Key concepts to study (with brief definitions)
- Practice problems or sample questions mentioned
- Tips or strategies the professor shared
- Areas the professor emphasized or repeated
```

#### 2e. Update AI endpoints to use prompts.ts

**File:** `convex/ai.ts`
- Import `getNoteGenerationPrompt` from `./prompts`
- Accept `lectureType` and `quickNotes` in args
- Replace inline prompt with function call

**File:** `convex/nuggetNotes.ts`
- Import `getNuggetNotePrompt` from `./prompts`
- Accept `lectureType` and `quickNotes` in request body
- Replace inline prompt with function call

**File:** `convex/lectureContext.ts`
- Import `getContextExtractionPrompt` from `./prompts`
- Accept `lectureType` in request body
- Replace inline prompt with function call

#### 2f. Thread lectureType through the pipeline

**File:** `src/renderer/hooks/use-nugget-notes.ts`
- Add `lectureType` to config and to `processTranscriptChunk` / `generateNotes` params
- Forward in fetch body to both `/nuggetNotes` and `/lectureContext`

**File:** `src/renderer/components/recording-panel.tsx`
- Pass `lectureType` state to `nuggetNotes.processTranscriptChunk()`
- Store on session via `updateSession()`

**File:** `src/renderer/components/notes-panel.tsx`
- Read `session.lectureType` when calling `generateNotesAction`
- Pass to the action

### Testing Checklist

- [ ] Can select lecture type before recording
- [ ] Lecture type persists on the session
- [ ] STEM notes emphasize formulas and definitions
- [ ] Humanities notes emphasize arguments and quotes
- [ ] Discussion notes capture key points and disagreements
- [ ] Lab notes produce step-by-step procedures
- [ ] Review notes highlight exam-relevant material
- [ ] General still works as the default
- [ ] Nugget Notes adapt their output style to lecture type
- [ ] Lecture type visible in Study View session info

---

## Feature 3: Transcript ↔ Notes Citations

### The Idea

When the AI generates notes, each bullet/section should reference which part of the transcript it came from. In the study view, clicking a citation jumps to that moment in the audio. This transforms notes from "AI summary" into "indexed reference to the lecture."

### Current State

- Transcript segments have timestamps: `{ text, timestamp, isFinal }` (schema.ts:14-20)
- Study view already syncs audio playback with transcript segments (study-content.tsx:22-29)
- Study view already has click-to-seek on transcript segments (study-content.tsx:49-51)
- AI generates markdown notes, converted to TipTap JSON (notes-panel.tsx:227-228)
- No concept of citations exists yet

### Architecture Decision

**How to represent citations in TipTap:**

Use a **TipTap Mark** (like bold or link) rather than a Node. A citation mark wraps text and stores the source timestamp as an attribute. This means any piece of generated text can be a citation without disrupting the document structure.

```typescript
// Citation mark attributes
{
  type: 'citation',
  attrs: {
    timestamp: 45200,       // ms from recording start
    segmentText: 'the professor said...', // preview snippet
  }
}
```

In the editor, cited text gets a subtle visual indicator (small superscript icon or colored left border). In the study view, citations are clickable and seek the audio player.

### What Changes

#### 3a. TipTap Citation Mark extension

**New file:** `src/renderer/lib/citation-mark.ts`

A custom TipTap mark:

```typescript
import { Mark, mergeAttributes } from '@tiptap/core';

export const CitationMark = Mark.create({
  name: 'citation',

  addAttributes() {
    return {
      timestamp: { default: null },        // ms from recording start
      segmentText: { default: '' },        // preview snippet from transcript
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-citation': '',
        'data-timestamp': HTMLAttributes.timestamp,
        class: 'citation-mark',
        title: `@ ${formatTimestamp(HTMLAttributes.timestamp)}`,
      }),
      0, // content hole
    ];
  },
});
```

CSS for the citation mark:
```css
.citation-mark {
  border-bottom: 1px dotted var(--primary);
  cursor: pointer;
  position: relative;
}

.citation-mark::after {
  content: '⏱';
  font-size: 0.6em;
  vertical-align: super;
  margin-left: 1px;
  opacity: 0.5;
}

.citation-mark:hover {
  background-color: var(--primary) / 0.1;
}

.citation-mark:hover::after {
  opacity: 1;
}
```

#### 3b. Register citation mark in NotesPanel

**File:** `src/renderer/components/notes-panel.tsx`

Add `CitationMark` to the TipTap extensions array (line 76-113):
```typescript
import { CitationMark } from '@/lib/citation-mark';

// In extensions array:
CitationMark,
```

#### 3c. Update AI prompt to output citations

**File:** `convex/prompts.ts` (the new centralized prompts file from Feature 2)

Update `getNoteGenerationPrompt()` to instruct the AI to cite transcript segments:

```
CITATION INSTRUCTIONS:
The transcript segments below include timestamps. For each note you generate,
include a citation reference to the most relevant transcript timestamp.

Format each note like this:
- **Key concept**: explanation of the concept [cite:45200]

The [cite:XXXXX] tag references the transcript timestamp in milliseconds.
Match each note to the closest relevant transcript segment timestamp.
Only use timestamps that actually appear in the segments.

TRANSCRIPT SEGMENTS:
${segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n')}
```

The key insight: instead of passing a flat transcript string, we pass **timestamped segments** so the AI can reference specific timestamps.

#### 3d. Update AI action to send segments and parse citations

**File:** `convex/ai.ts`

Update args to accept segments:
```typescript
args: {
  transcript: v.string(),
  transcriptSegments: v.optional(v.array(v.object({
    text: v.string(),
    timestamp: v.number(),
    isFinal: v.boolean(),
  }))),
  sessionId: v.string(),
  lectureType: v.optional(v.string()),
  quickNotes: v.optional(v.string()),
},
```

In the handler, build the prompt using segments when available:
```typescript
const prompt = args.transcriptSegments
  ? getNoteGenerationPromptWithCitations(args.transcriptSegments, lectureType, args.quickNotes)
  : getNoteGenerationPrompt(args.transcript, lectureType, args.quickNotes);
```

Return both the raw notes AND parsed citations:
```typescript
return {
  notes: generatedNotes,
  citations: parseCitations(generatedNotes, args.transcriptSegments),
  success: true,
};
```

#### 3e. Citation parser utility

**New file:** `convex/citations.ts`

```typescript
interface Citation {
  noteText: string;       // The note text this citation belongs to
  timestamp: number;      // ms from recording start
  segmentText: string;    // The transcript segment text
}

export function parseCitations(
  markdownNotes: string,
  segments?: TranscriptSegment[],
): Citation[] {
  // Regex to find [cite:XXXXX] patterns
  const citePattern = /\[cite:(\d+)\]/g;
  const citations: Citation[] = [];

  // For each line with a citation, extract the note text and timestamp
  for (const line of markdownNotes.split('\n')) {
    const match = citePattern.exec(line);
    if (match) {
      const timestamp = parseInt(match[1], 10);
      const noteText = line.replace(citePattern, '').replace(/^[-*]\s*/, '').trim();
      const segment = segments?.find(s => s.timestamp === timestamp);

      citations.push({
        noteText,
        timestamp,
        segmentText: segment?.text || '',
      });
    }
  }

  return citations;
}
```

#### 3f. Markdown-to-TipTap converter: handle citations

**File:** `src/renderer/lib/markdown-to-tiptap.ts`

Update the converter to detect `[cite:XXXXX]` patterns and convert them to citation marks in the TipTap JSON:

When converting a text node like:
```
**Thermodynamics**: Energy cannot be created or destroyed [cite:45200]
```

The output TipTap JSON should wrap the text in a citation mark:
```json
{
  "type": "text",
  "text": "Thermodynamics: Energy cannot be created or destroyed",
  "marks": [
    { "type": "citation", "attrs": { "timestamp": 45200, "segmentText": "..." } }
  ]
}
```

The `[cite:XXXXX]` text itself is stripped — it becomes the mark attribute, not visible text.

#### 3g. NotesPanel: pass segments to generate action

**File:** `src/renderer/components/notes-panel.tsx`

In `handleGenerateNotes`, pass transcript segments:
```typescript
const data = await generateNotesAction({
  transcript: session.transcript,
  transcriptSegments: session.transcriptSegments,
  sessionId: sessionId as string,
  lectureType: session.lectureType,
  quickNotes: session.quickNotes,
});
```

When processing the response, the `markdownToTipTap` converter now handles citation marks automatically.

#### 3h. Study View: citation click → audio seek

**File:** `src/renderer/components/study-content.tsx`

The study view already has click-to-seek for transcript segments. For citations in notes:

Add a click handler on the notes tab content that detects clicks on `.citation-mark` elements:

```typescript
const handleNoteCitationClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  const citationEl = target.closest('.citation-mark');
  if (citationEl) {
    const timestamp = parseInt(citationEl.getAttribute('data-timestamp') || '0', 10);
    seek(timestamp / 1000); // Convert ms to seconds
  }
};
```

This requires rendering stored notes as HTML in the study view. Currently study-content.tsx renders `recording.notes` as plain text (line 133). This needs to change to render the TipTap JSON as HTML so citation marks are interactive.

Options:
1. **Render TipTap JSON with a read-only TipTap editor** (recommended — guarantees formatting fidelity)
2. Convert TipTap JSON to HTML string and use `dangerouslySetInnerHTML` (simpler but less safe)

**Recommended:** Use a lightweight read-only TipTap editor in the study view's Notes tab:
```typescript
const readOnlyEditor = useEditor({
  extensions: [...sameExtensions, CitationMark],
  content: parsedNotes,
  editable: false,
});
```

Then attach the click handler to the editor's DOM element.

#### 3i. Citation tooltip on hover

When hovering a citation mark in either the editor or study view, show a tooltip with:
- Timestamp (formatted as `MM:SS`)
- Preview of the transcript segment text
- "Click to hear" hint

Use the existing Radix `Tooltip` component (already in the project's UI library).

This can be done via TipTap's `addNodeView` or via CSS + `title` attribute for the simple case.

### Testing Checklist

- [ ] AI generates notes with `[cite:XXXXX]` references
- [ ] Citations appear as subtle visual marks in the editor
- [ ] Hovering a citation shows timestamp + transcript snippet
- [ ] Clicking a citation in study view seeks audio to that timestamp
- [ ] Citations survive save/load cycle (TipTap JSON round-trip)
- [ ] Notes without citations still work fine
- [ ] Citation marks don't break copy/paste or export
- [ ] Works when transcript segments are unavailable (graceful fallback)

---

## Build Order & Dependencies

```
Feature 2: Lecture-Type-Aware AI
├── 2a. Schema: add lectureType
├── 2b. Mutation: accept lectureType
├── 2c. UI: lecture type selector
├── 2d. Prompt templates (convex/prompts.ts) ← FOUNDATION for all 3 features
├── 2e. Update AI endpoints
└── 2f. Thread through pipeline

Feature 1: Dual-Input Synthesis (depends on 2d — prompts.ts exists)
├── 1a. Schema: add quickNotes
├── 1b. Mutation: accept quickNotes
├── 1c. UI: quick notes textarea
├── 1d. Update AI generation (uses prompts.ts)
├── 1e. Update Nugget Notes (uses prompts.ts)
├── 1f. Wire up RecordingPanel
└── 1g. Wire up NotesPanel

Feature 3: Transcript ↔ Notes Citations (depends on 2d — prompts.ts, and 1d — updated AI generation)
├── 3a. TipTap citation mark extension
├── 3b. Register in NotesPanel
├── 3c. Update prompts for citations
├── 3d. Update AI action (segments + parse)
├── 3e. Citation parser utility
├── 3f. Markdown-to-TipTap citation handling
├── 3g. Pass segments in NotesPanel
├── 3h. Study view: click citation → seek
└── 3i. Citation tooltip
```

### Why this order?

1. **Feature 2 first** because it creates `convex/prompts.ts` — the centralized prompt system that Features 1 and 3 both need. Building the lecture type system also requires the smallest schema change and gives immediate visible value.

2. **Feature 1 second** because it adds `quickNotes` to the schema and the AI pipeline. The prompt system from Feature 2 is already in place, so adding quick notes is just extending the prompt functions.

3. **Feature 3 last** because it's the most complex and depends on both the prompt system (Feature 2) and the updated AI pipeline (Feature 1). It introduces a new TipTap extension, a citation parser, and study view changes.

---

## Schema Changes Summary

All three features modify `convex/schema.ts`. Here's the final state of the sessions table:

```typescript
sessions: defineTable({
  userId: v.string(),
  title: v.string(),
  lectureType: v.optional(v.string()),        // Feature 2
  audioFilePath: v.optional(v.string()),
  transcript: v.optional(v.string()),
  transcriptSegments: v.optional(
    v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
        isFinal: v.boolean(),
      }),
    ),
  ),
  quickNotes: v.optional(v.string()),          // Feature 1
  notes: v.optional(v.string()),
  notesPlainText: v.optional(v.string()),
  duration: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
```

Both new fields are `v.optional()` — fully backwards-compatible with existing sessions.

---

## New Files Summary

| File | Feature | Purpose |
|------|---------|---------|
| `convex/prompts.ts` | 2 | Centralized AI prompt templates by lecture type |
| `convex/citations.ts` | 3 | Citation parser for `[cite:XXXXX]` patterns |
| `src/renderer/components/lecture-type-select.tsx` | 2 | Lecture type dropdown with icons |
| `src/renderer/components/quick-notes-input.tsx` | 1 | Collapsible textarea for user notes during recording |
| `src/renderer/lib/citation-mark.ts` | 3 | TipTap Mark extension for transcript citations |

---

## Version Bumping

Since these are new features enhancing Phases 1-2:

| Feature | Version | Reason |
|---------|---------|--------|
| Feature 2 (Lecture Types) | 3.4.0 | New feature: lecture-aware AI |
| Feature 1 (Dual-Input) | 3.5.0 | New feature: user notes synthesis |
| Feature 3 (Citations) | 3.6.0 | New feature: transcript-linked notes |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AI doesn't reliably output `[cite:XXXXX]` | Medium | Validate in parser; fall back to no citations. Use few-shot examples in prompt. |
| Citation timestamps don't match segments exactly | Medium | Use nearest-segment matching rather than exact match |
| Quick notes textarea clutters recording panel | Low | Collapsible by default; only show during recording |
| Lecture type selector adds friction before recording | Low | Default to "General"; remember last-used type per user |
| Prompt changes degrade note quality | Low | Test each lecture type prompt independently; keep "General" as the proven baseline |
