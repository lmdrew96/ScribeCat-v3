# Nugget Integration Handoff — ScribeCat v3

> **Status: COMPLETE** — Both Nugget's Notes and Nugget Chat are fully implemented and working.
>
> **Goal:** Port the real-time AI note-taking system ("Nugget's Notes") and AI Chat from v2 into v3, using v3's working TipTap insertion logic.

---

## Overview

Nugget is ScribeCat's AI assistant (named after Nae's cat 🐱). It has two features:

1. **Nugget's Notes** — Real-time AI-generated notes during recording (two-model pipeline)
2. **Nugget Chat** — AI chatbot that can answer questions about transcript/notes

---

## Architecture: Two-Model Pipeline

The magic of Nugget's Notes is a two-model system that generates contextually-aware notes in real-time:

| Model | Role | Frequency | Purpose |
|-------|------|-----------|---------|
| **Sonnet 4.5** | Context Analyzer | Every ~2 min / 200 words | Extracts themes, current topic, definitions, lecture structure |
| **Haiku 4.5** | Note Writer | Every ~45s / 30 words | Writes 1-3 bullet notes using Sonnet's context |

**Why this works:** Sonnet (smart but slower) builds understanding. Haiku (fast and cheap) uses that understanding to write quick notes. Result: contextually-aware notes generated every 45 seconds during a lecture.

---

## Files to Reference from v2

**Repository:** https://github.com/lmdrew96/scribecat-v2

| File | What It Does | Port Strategy |
|------|--------------|---------------|
| `src/renderer/ai/LectureContextService.ts` | Sonnet context extraction | Convert to Convex action |
| `src/renderer/ai/NuggetNotesService.ts` | Haiku note generation | Convert to Convex action |
| `src/renderer/ai/NuggetNotesOrchestrator.ts` | Coordinates timing, buffering, auto-save | Adapt as React hook |
| `src/renderer/ai/NuggetNotesPanel.ts` | Note bubbles UI | Convert to React component |
| `src/renderer/ai/ChatUI.ts` | Chat interface with tabs | Convert to React component |
| `src/renderer/ai/AIManager.ts` | Chat logic + history | Adapt for Convex |

---

## v3 Implemented Files

| File | What It Does |
|------|------------|
| `convex/nuggetNotes.ts` | Haiku-powered real-time note generation (HTTP action) |
| `convex/lectureContext.ts` | Sonnet-powered context extraction (HTTP action) |
| `convex/nuggetChat.ts` | AI chat endpoint (HTTP action) |
| `src/renderer/hooks/use-nugget-notes.ts` | Two-model pipeline orchestrator hook |
| `src/renderer/components/nugget-notes-panel.tsx` | Note bubbles UI with insert button |
| `src/renderer/components/nugget-chat.tsx` | AI chat drawer with persistent history |
| `src/renderer/components/recording-panel.tsx` | Hosts Nugget Notes panel |
| `src/renderer/components/study-content.tsx` | Hosts Nugget Chat |
| `convex/schema.ts` | `chatHistory` table for persistent chat |

---

## Implementation Tasks

### 1. Create Convex Actions for Two-Model Pipeline

**File: `convex/lectureContext.ts`**

```typescript
// Sonnet-powered context extraction
// Called every ~2 minutes during recording
// Input: Recent transcript (~3 min worth)
// Output: { themes, currentTopic, definitions, structureHint }
```

Reference the prompt from v2's `LectureContextService.ts` (lines 77-85):
```
Analyze this lecture transcript and extract structured context. Be very concise.

PREVIOUS CONTEXT:
${prevContext}

RECENT TRANSCRIPT:
"${transcript.slice(-1500)}"

Return ONLY valid JSON (no markdown, no explanation):
{"themes":["theme1","theme2"],"currentTopic":"topic being discussed now","definitions":["term: definition"],"structureHint":"brief note about lecture flow"}
```

**File: `convex/nuggetNotes.ts`**

```typescript
// Haiku-powered note generation
// Called every ~45 seconds during recording
// Input: Recent transcript (~100 words) + context from Sonnet
// Output: Array of 1-3 note strings
```

Reference the prompt from v2's `NuggetNotesService.ts` (lines 85-93):
```
Create 1-3 concise bullet notes from this lecture segment.

CONTEXT: ${contextStr}

TRANSCRIPT:
"${transcript.slice(-500)}"

Output ONLY bullet points (no intro, no explanation). Each must start with "- ":
```

### 2. Create Nugget Notes Hook

**File: `src/renderer/hooks/useNuggetNotes.ts`**

This hook orchestrates the two-model pipeline. Port logic from `NuggetNotesOrchestrator.ts`:

```typescript
interface NuggetNote {
  id: string;
  text: string;
  timestamp: number;      // When generated (ms)
  recordingTime: number;  // Recording position (seconds)
}

interface UseNuggetNotesReturn {
  notes: NuggetNote[];
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  startRecording: () => void;
  stopRecording: (finalTranscript?: string) => Promise<void>;
  processTranscriptChunk: (transcript: string, durationMinutes: number) => Promise<void>;
  clearNotes: () => void;
}
```

**Key timing logic from v2:**
- Context update: Every 2 minutes AND 200+ new words
- Note generation: Every 45 seconds AND 30+ new words
- Keep last ~100 words for note generation
- Keep last ~1500 chars for context analysis

### 3. Create Nugget Notes Panel Component

**File: `src/renderer/components/nugget-notes-panel.tsx`**

UI showing clickable note bubbles. Each bubble has:
- Note text
- [+] button to insert into TipTap

```tsx
interface NuggetNotesPanelProps {
  notes: NuggetNote[];
  isRecording: boolean;
  onInsertNote: (noteText: string) => void;  // <-- This is the key!
}
```

**Styling reference from v2** (`NuggetNotesPanel.ts`):
- Note bubbles with subtle background
- Hover effect on [+] button
- "Listening..." state when recording with no notes yet
- "No notes yet — Start recording" empty state

### 4. Wire Up Note Insertion (THE IMPORTANT PART)

v3 already has working insertion logic in `notes-panel.tsx`. The `handleGenerateNotes` function:
1. Calls the AI
2. Converts markdown to TipTap JSON
3. Inserts into the editor

**For Nugget Notes, create a simpler insertion function:**

```typescript
// In notes-panel.tsx or a shared util
const insertNoteAtCursor = (editor: Editor, noteText: string) => {
  if (!editor) return;
  
  // Insert as a bullet point
  editor
    .chain()
    .focus()
    .insertContent(`<li><p>${noteText}</p></li>`)
    .run();
};
```

**Or append to end:**
```typescript
const appendNote = (editor: Editor, noteText: string) => {
  if (!editor) return;
  
  editor
    .chain()
    .focus('end')
    .insertContent(`<p>• ${noteText}</p>`)
    .run();
};
```

### 5. Add Nugget Notes Panel to Recording Panel

**File: `src/renderer/components/recording-panel.tsx`**

Add a collapsible/tabbed section below the transcript:

```
┌─────────────────────────────────┐
│ Live Transcript                 │
│ [Transcript content...]         │
├─────────────────────────────────┤
│ 🐱 Nugget's Notes        [▼]   │
│ ┌─────────────────────────────┐ │
│ │ • First insight here   [+] │ │
│ │ • Second insight here  [+] │ │
│ │ • Third insight here   [+] │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [Waveform]                      │
│ [Record Button] 00:00           │
└─────────────────────────────────┘
```

### 6. Create Nugget Chat Component

**File: `src/renderer/components/nugget-chat.tsx`**

A floating button + drawer for AI chat. Port from v2's `ChatUI.ts`:

**Features:**
- Floating cat button (bottom-right of screen)
- Slide-in drawer when clicked
- Chat history with user/assistant messages
- Checkboxes: "Include transcript" / "Include notes"
- Streaming responses
- Keyboard shortcuts (Escape to close, Enter to send)

**Chat uses Sonnet** (not Haiku) for quality responses about content.

### 7. Create Convex Action for Chat

**File: `convex/nuggetChat.ts`**

```typescript
// Chat endpoint
// Input: message, conversationHistory, optional transcript, optional notes
// Output: Streaming response (or full response)
```

---

## UI/UX Details

### Nugget Notes Panel States

1. **Not recording, no notes:** 
   - Icon + "No notes yet"
   - "Start recording to generate AI notes"

2. **Recording, no notes yet:**
   - Icon + "Listening..."
   - "Nugget will generate notes as you record"

3. **Recording, has notes:**
   - List of note bubbles
   - Each with [+] insert button
   - "Notes in progress..." indicator at bottom

4. **Stopped recording, has notes:**
   - List of note bubbles (still insertable)
   - No "in progress" indicator

### Note Bubble Design

```
┌────────────────────────────────────────┬─────┐
│ The mitochondria is the powerhouse...  │ [+] │
└────────────────────────────────────────┴─────┘
```

- Soft background color (theme-dependent)
- Rounded corners
- [+] button on hover or always visible
- Click [+] → inserts into TipTap at cursor

### Chat Drawer Design

Port the v2 design but with v3's theme system:
- Tabs: "Chat" | "Notes" (or just Chat if Notes panel is separate)
- Welcome message from Nugget
- Message bubbles (user right-aligned, Nugget left-aligned)
- Context checkboxes at bottom
- Input field + send button

---

## Data Flow

```
Recording starts
       │
       ▼
Transcript chunk arrives (every ~30s from AssemblyAI)
       │
       ├──► Check: 2+ min AND 200+ words since last context update?
       │         │
       │         YES ──► Call Sonnet (lectureContext action)
       │                      │
       │                      ▼
       │                 Update stored context
       │
       ├──► Check: 45s+ AND 30+ words since last note generation?
       │         │
       │         YES ──► Call Haiku (nuggetNotes action) with context
       │                      │
       │                      ▼
       │                 Add notes to state
       │                      │
       │                      ▼
       │                 UI updates with new bubbles
       │
       ▼
   (repeat)
```

---

## Environment Variables

Add to Convex dashboard (should already exist from generateNotes):
- `ANTHROPIC_API_KEY` — Used for all AI calls

---

## Model Strings

- **Sonnet 4.5:** `claude-sonnet-4-5-20250929`
- **Haiku 4.5:** `claude-haiku-4-5-20251001`

(Note: v2 used older model strings — update to current)

---

## Testing Checklist

- [x] Context updates every ~2 minutes during recording
- [x] Notes generate every ~45 seconds during recording
- [x] Notes appear in panel as bubbles
- [x] Clicking [+] inserts note into TipTap editor
- [x] Notes persist after recording stops
- [x] Chat drawer opens/closes properly
- [x] Chat responds with context from transcript
- [x] Chat responds with context from notes
- [x] Persistent chat history per session (stored in `chatHistory` table)
- [x] Clickable suggestion prompts in chat
- [x] Works with all 6 themes

---

## Files to Create (Summary)

```
convex/
  lectureContext.ts      # Sonnet context extraction
  nuggetNotes.ts         # Haiku note generation  
  nuggetChat.ts          # Chat endpoint

src/renderer/
  hooks/
    useNuggetNotes.ts    # Orchestrator hook
  components/
    nugget-notes-panel.tsx   # Note bubbles UI
    nugget-chat.tsx          # Chat drawer
```

---

## Files to Modify

```
src/renderer/components/
  recording-panel.tsx    # Add Nugget Notes panel
  notes-panel.tsx        # Export/share insertion logic
  study-view.tsx         # Add floating chat button
```

---

## Key Insight

**v2's problem:** The note insertion didn't work because the editor integration was buggy.

**v3's advantage:** TipTap insertion already works perfectly via `handleGenerateNotes`.

**Solution:** Use the same insertion pattern for individual Nugget notes. The `editor.chain().focus().insertContent()` pattern is proven to work.

---

## Decisions Made

1. **Panel location:** Below transcript in recording panel (collapsible)
2. **Insert behavior:** Insert at cursor via `editor.chain().focus().insertContent()`
3. **Note format:** Plain text bullets with [+] insert button
4. **Auto-insert option:** Not implemented — manual insert via bubble click
5. **Chat persistence:** Per-session chat history stored in `chatHistory` Convex table
6. **Chat suggestions:** Clickable suggestion chips based on session content
