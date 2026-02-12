# ScribeCat v3 — Phase Implementation Guide

> **Current Phase: 3 — Learn**
>
> **Current Version: 4.6.12**
>
> Last updated: February 2026

---

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | **Capture** | Recording + live transcription | Complete |
| 2 | **Process** | Notes editor + AI generation | Complete |
| 3 | **Learn** | Study tools + StudyQuest | In Progress |
| 4 | **Connect** | Social + Study Rooms + Games | Not Started |

---

## Phase 1: Capture — COMPLETE

**Goal:** Record lectures with live transcription. Build a rock-solid foundation.

### Features

- [x] **Audio Recording**
  - [x] Device selection dropdown
  - [x] Start/stop/pause/resume controls
  - [x] Recording timer
  - [x] Real-time waveform visualization

- [x] **Transcription**
  - [x] AssemblyAI real-time integration
  - [x] Live transcript display (scrolling)
  - [x] Partial + final transcript handling
  - [x] Timestamp tracking per segment

- [x] **Session Management**
  - [x] Create new session
  - [x] Auto-save during recording
  - [x] List sessions (Study Mode sidebar)
  - [x] Delete session (move to trash)
  - [x] Trash system (30-day retention via cron job)

- [x] **Playback**
  - [x] Play recorded audio (Convex storage)
  - [x] Sync playback position with transcript
  - [x] Seek by clicking transcript segments

- [x] **Infrastructure**
  - [x] Convex backend setup
  - [x] Authentication (Clerk, restricted to @udel.edu)
  - [x] Theme system (6 themes via CSS vars + glassmorphism)
  - [x] Resizable panels (Notes / Recording)

### Technical Notes

**Audio capture:** Web Audio API (MediaRecorder) in browser
**Transcription:** AssemblyAI WebSocket (API key on Convex server, token endpoint)
**Storage:** Audio files in Convex file storage, metadata in Convex DB
**Auth:** Clerk with ConvexProviderWithClerk

**Date Completed:** January 1, 2026

---

## Phase 2: Process — COMPLETE

**Goal:** AI-powered note-taking with a rich editor

### Features

- [x] **TipTap Rich Text Editor**
  - [x] Basic formatting (bold, italic, underline, strikethrough)
  - [x] Headings (H1-H3), lists, blockquotes
  - [x] Superscript, subscript, hyperlink
  - [x] Alignment (left, center, justify, right)
  - [x] Highlighter (theme-dependent preset colors)
  - [x] Font size dropdown (px)
  - [x] Tables (insert, edit, resize)
  - [x] Code blocks
  - [x] Undo/redo
  - [x] Smart auto-save (750ms debounce + Cmd+S manual)

- [x] **Excalidraw Diagrams**
  - [x] "Add Diagram" button in toolbar
  - [x] Inline Excalidraw canvas (lazy-loaded)
  - [x] Diagrams stored as JSON
  - [x] Resize/reposition diagram blocks
  - [x] Double-click to edit, view-only by default

- [x] **Drag/Resize Objects** (interact.js)
  - [x] Images: insert, resize, drag
  - [x] Textboxes: insert, resize, drag
  - [x] Diagram blocks: resize, drag
  - [x] Alt+drag for unconstrained resize

- [x] **Live AI Note Generation**
  - [x] "Generate Notes" button in toolbar
  - [x] Takes transcript + lecture type context -> structured markdown notes
  - [x] Markdown-to-TipTap converter (with citation mark support)
  - [x] Appends to existing notes
  - [x] Loading state + error handling
  - [x] Uses Claude via Convex action

- [x] **Nugget's Notes (Real-Time AI)**
  - [x] Two-model pipeline (Sonnet context + Haiku notes)
  - [x] Context updates every ~2 min / 200 words
  - [x] Note generation every ~45s / 30 words
  - [x] Note bubbles UI with insert-to-editor button
  - [x] Collapsible panel in recording view

- [x] **Nugget Chat**
  - [x] Persistent per-session chat history (stored in Convex)
  - [x] Includes transcript + notes context
  - [x] Clickable suggestion prompts
  - [x] Streaming responses

- [x] **Lecture Type System**
  - [x] 6 types: STEM, Humanities, Discussion, Lab/Demo, Review, General
  - [x] Type-specific AI prompt templates (`convex/prompts.ts`)
  - [x] Selector in recording panel
  - [x] Flows through to Nugget Notes and full note generation

- [x] **Citation System**
  - [x] TipTap citation mark extension (`lib/citation-mark.ts`)
  - [x] Citation parser (`convex/citations.ts`)
  - [x] Markdown-to-TipTap handles `[cite:XXXXX]` patterns
  - [x] Visual citation marks in editor and study view

- [x] **File Upload + Transcription**
  - [x] Upload pre-recorded audio files
  - [x] AssemblyAI batch transcription
  - [x] Creates session from uploaded file

### Technical Notes

**Editor:** TipTap v3.14.0 with 15+ extensions
**Diagrams:** Excalidraw 0.18.0 with React.lazy code-splitting
**Drag/Resize:** interact.js 1.10.27 with aspect ratio constraints
**AI:** Claude Sonnet 4.5 (notes, context, chat) + Haiku 4.5 (real-time bullets)
**Storage:** Notes as TipTap JSON + plain text for search indexing
**Prompts:** Centralized in `convex/prompts.ts` and `convex/studyToolPrompts.ts`

**Date Completed:** January 2, 2026

---

## Phase 3: Learn — IN PROGRESS

**Goal:** AI study tools and gamification

### AI Study Tools — COMPLETE

- [x] **Summary Generator** — comprehensive session summaries
- [x] **Key Concepts** — 5-7 important concepts with definitions
- [x] **Flashcard Generator** — interactive cards, Browse/Learn modes with spaced repetition
- [x] **Quiz Generator** — multiple choice, configurable count (5/10/15/20), scoring + history
- [x] **Concept Map** — visual hierarchical SVG mind map
- [x] **ELI5 Explainer** — simple explanations with analogies + real-world examples
- [x] **AI Chat** — persistent Nugget Chat with session-based history + clickable suggestions

All study tools use lecture-type-aware prompts and cache results in `studyToolResults` table.

### Productivity & Gamification — COMPLETE

- [x] Study goals (daily/weekly, configurable in settings)
- [x] Streak tracking (daily study streaks)
- [x] Break reminders (configurable intervals)
- [x] Achievements (14 achievements with unlock tracking)

### StudyQuest (JRPG) — NOT STARTED

**MVP (Tamagotchi-first):**
- [ ] Cat companion with pixel art sprites
- [ ] Cat reacts to study activity (happy, sleepy, etc.)
- [ ] XP earned from study time
- [ ] Level up system
- [ ] Simple idle animations

**Future (post-MVP):**
- [ ] JRPG exploration
- [ ] Turn-based battles
- [ ] Quests tied to study goals

### Remaining for Phase 3 Completion

- [ ] StudyQuest cat companion (MVP Tamagotchi)
- [ ] Real-world test: 50+ minute lecture recording without issues

### Technical Notes

**Study Tools:** Each tool is a React component in `src/renderer/components/study-tools/`
**Prompts:** Centralized in `convex/studyToolPrompts.ts` with lecture-type variants
**Caching:** Results stored in `studyToolResults` table, keyed by session + tool type
**Spaced Repetition:** `flashcardProgress` table tracks per-card confidence + next review
**Quiz History:** `quizAttempts` table stores full answer history per session

---

## Phase 4: Connect — NOT STARTED

**Goal:** Social features and collaborative study

### Friends System

- [ ] Search users by @username
- [ ] Send/accept/decline friend requests
- [ ] Friends list with online presence
- [ ] Block/remove friends

### Messaging

- [ ] Inbox view
- [ ] Direct messages
- [ ] Unread indicators
- [ ] Notifications

### Session Sharing

- [ ] Share session with friend
- [ ] View (read-only) OR copy to library
- [ ] Share via direct send or link

### Study Rooms (Simplified)

- [ ] Create room (name, optional password)
- [ ] Invite friends (direct or link)
- [ ] Room text chat
- [ ] Participant list + presence
- [ ] Share screen OR share session (read-only)
- [ ] Launch games from room

### Multiplayer Games

- [ ] **Quiz Battle** — head-to-head competitive
- [ ] **Jeopardy** — category-based classic format

Both games:
- [ ] AI generates questions from study materials
- [ ] Real-time sync via Convex
- [ ] Score tracking

### Canvas LMS Integration

- [ ] Browser extension for course list
- [ ] Organize sessions by course
- [ ] Import course info

---

## Definition of Done (All Phases)

Before marking a phase complete:

- [ ] All features work without critical bugs
- [ ] UI matches design system (themes, spacing, glassmorphism)
- [ ] Data persists correctly (Convex)
- [ ] Loading states present
- [ ] Error states handled gracefully
- [ ] Basic accessibility (keyboard nav, contrast)
- [ ] Tested on real use cases (not just happy path)

---

## Version History

| Version | Date | Milestone |
|---------|------|-----------|
| 3.0.0 | Dec 2025 | Initial Electron app |
| 3.4.0 | Jan 2026 | Notion-inspired features (lecture types, citations, file upload) |
| 4.0.0 | Jan 2026 | Electron -> pure web app migration |
| 4.1.0 | Jan 2026 | Clerk auth (replacing anonymous Convex auth) |
| 4.2.0 | Jan 2026 | Productivity system (goals, streaks, achievements) |
| 4.3.0 | Jan 2026 | Mobile-responsive UI |
| 4.4.0 | Jan 2026 | AI study tools (7 tools) |
| 4.5.0 | Jan 2026 | Glassmorphism UI refresh |
| 4.6.0 | Feb 2026 | Delete/trash recordings, audio fixes |
