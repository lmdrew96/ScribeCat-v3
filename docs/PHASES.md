# ScribeCat v3 — Phase Implementation Guide

> **Current Phase: 3 — Learn**
>
> **Current Version: 4.11.2**
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
  - [x] Two-step pipeline (context extraction + note generation, both Haiku 4.5)
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
**AI:** Claude Haiku 4.5 for all endpoints (centralized in `convex/config.ts`)
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
All 6 study tools use lecture-type-aware prompts and cache results in `studyToolResults` table.

Nugget Chat (persistent AI chat with session-based history + clickable suggestions) is a separate app-level component, not a study tool tab.

### Productivity & Gamification — COMPLETE

- [x] Study goals (daily/weekly, configurable in settings)
- [x] Streak tracking (daily study streaks)
- [x] Break reminders (configurable intervals)
- [x] Achievements (14 achievements with unlock tracking)

### StudyQuest (Cat Companion) — COMPLETE

**MVP (Tamagotchi-style):**
- [x] Cat companion with pixel art sprite sheets (11 variants from ScribeCat v2)
- [x] Cat reacts to study activity (idle, happy, studying, sleepy, excited moods)
- [x] XP earned from study time, session completion, goals, tools, achievements
- [x] Level up system (quadratic XP curve)
- [x] Sprite sheet animations (idle, idle2, sitting, sleep, run, jump, attack, hurt)
- [x] Floating widget (bottom-left) with adopt flow, variant picker, name editor
- [x] XP progress bar with recent gains feed

**Future (post-MVP):**
- [ ] JRPG exploration
- [ ] Turn-based battles
- [ ] Quests tied to study goals

### Remaining for Phase 3 Completion

- [x] StudyQuest cat companion (MVP Tamagotchi)
- [ ] Real-world test: 50+ minute lecture recording without issues

### Technical Notes

**Study Tools:** Each tool is a React component in `src/renderer/components/study-tools/`
**Prompts:** Centralized in `convex/studyToolPrompts.ts` with lecture-type variants
**Caching:** Results stored in `studyToolResults` table, keyed by session + tool type
**Spaced Repetition:** `flashcardProgress` table tracks per-card confidence + next review
**Quiz History:** `quizAttempts` table stores full answer history per session
**StudyQuest:** Cat companion in `src/renderer/components/study-quest/`, backend in `convex/studyQuest.ts`
**Sprites:** 11 cat variants × 8 animations as 32×32 sprite sheets in `public/cats/`
**XP System:** `convex/xpUtils.ts` (shared math), `catCompanion` table, XP awarded from `productivity.ts` and `studyTools.ts`

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
| 4.6.1 | Feb 2026 | Trash view with restore and permanent delete |
| 4.6.2 | Feb 2026 | Sidebar alignment and metadata offset fixes |
| 4.6.3 | Feb 2026 | Audio player first-click and playback fixes |
| 4.6.4 | Feb 2026 | Fix Convex browser import warnings and audio CORS |
| 4.6.5 | Feb 2026 | Remove Web Audio API from playback (CORS fix) |
| 4.6.6 | Feb 2026 | Fix CSP blocking Clerk workers and Convex storage audio |
| 4.6.8 | Feb 2026 | Fix race condition uploading empty audio blobs |
| 4.6.9 | Feb 2026 | Fix Infinity duration on WebM playback |
| 4.6.10 | Feb 2026 | Remove waveform from audio player |
| 4.6.11 | Feb 2026 | Remove redundant Quick Notes from recording panel |
| 4.6.12 | Feb 2026 | Fix Nugget to process all unprocessed transcript after stop |
| 4.6.13 | Feb 2026 | Major documentation update |
| 4.6.14 | Feb 2026 | Dual-input synthesis — feed user's notes into all AI prompts |
| 4.7.0 | Feb 2026 | Lift Nugget Chat to app level with smarter context + markdown rendering |
| 4.7.1 | Feb 2026 | Nugget Chat button visibility improvement |
| 4.7.2 | Feb 2026 | Fix notes editor save cycle and resolve all TypeScript errors |
| 4.7.3 | Feb 2026 | Major documentation update — sync all docs with actual project state |
| 4.8.0 | Feb 2026 | Persist nugget notes and add Nugget Notes tab in study mode |
| 4.8.1 | Feb 2026 | Fix notes and nugget notes not saving after recording stops |
| 4.8.2 | Feb 2026 | Move Nugget Chat button from floating overlay to header |
| 4.8.3 | Feb 2026 | Fix circular structure JSON error in study tool generation |
| 4.8.4 | Feb 2026 | Fix Nugget Chat scrolling and transcript auto-scroll snapping |
| 4.8.5 | Feb 2026 | Cap study tools content area at 40vh with scroll overflow |
| 4.8.6 | Feb 2026 | Rewrite concept map with tree layout and theme-safe colors |
| 4.8.7 | Feb 2026 | Fix concept map SVG colors — use raw CSS vars, not hsl() wrappers |
| 4.8.8 | Feb 2026 | Add collapse/expand toggle to study tools card |
| 4.9.0 | Feb 2026 | Add URL-based routing with TanStack Router |
| 4.9.1 | Feb 2026 | Fix ADHDesigns link to use .dev domain |
| 4.10.0 | Feb 2026 | Lightweight sidebar queries and doc sync |
| 4.10.3 | Feb 2026 | Lightweight sidebar queries and doc sync (patches) |
| 4.11.0 | Feb 2026 | StudyQuest cat companion with XP and leveling system |
| 4.11.1 | Feb 2026 | Replace CSS pixel art with real sprite sheets from v2 |
| 4.11.2 | Feb 2026 | Fix trash button hidden behind StudyQuest widget |
