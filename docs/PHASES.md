# ScribeCat v3 — Phase Implementation Guide

> **Current Phase: 3 — Learn**
> 
> Last updated: January 2026

---

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | **Capture** | Recording + live transcription | ✅ Complete |
| 2 | **Process** | Notes editor + AI generation | ✅ Complete |
| 3 | **Learn** | Study tools + StudyQuest | ⬜ Not Started |
| 4 | **Connect** | Social + Study Rooms + Games | ⬜ Not Started |

---

## Phase 1: Capture ✅ COMPLETE

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
  - [x] Trash system (30-day retention)

- [x] **Playback**
  - [x] Play recorded audio
  - [x] Sync playback position with transcript
  - [x] Seek by clicking transcript segments

- [x] **Infrastructure**
  - [x] Convex backend setup
  - [x] Authentication (Convex Auth)
  - [x] Theme system (6 themes via CSS vars)
  - [x] Resizable panels (Notes ↔ Recording)

### Acceptance Criteria

- [ ] Can record a 50+ minute lecture without crashes or audio issues _(needs real-world test)_
- [x] Live transcription appears within 1-2 seconds of speech
- [x] Can pause and resume recording with correct timestamps
- [x] Sessions persist after app restart
- [x] Playback syncs correctly with transcript
- [x] All 6 themes apply correctly
- [x] Panels resize smoothly with drag handle

### Technical Notes

**Audio capture:** Web Audio API in renderer process  
**Transcription:** AssemblyAI WebSocket (API key in main process, token passed to renderer)  
**Storage:** Audio files in Electron user data directory, metadata in Convex

**Date Completed:** January 1, 2026

---

## Phase 2: Process ✅ COMPLETE

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
  - [x] Takes transcript → structured markdown notes
  - [x] Markdown-to-TipTap converter
  - [x] Appends to existing notes
  - [x] Loading state + error handling
  - [x] Uses Claude via Convex action

### Acceptance Criteria

- [x] Can type rich notes with all formatting options
- [x] Tables work correctly (add rows/cols, resize)
- [x] Can create and edit inline diagrams
- [x] Can drag/resize images, textboxes, diagrams
- [x] AI generates coherent notes from transcript
- [x] Notes auto-save without data loss

### Technical Notes

**Editor:** TipTap v3.14.0 with 15+ extensions  
**Diagrams:** Excalidraw 0.18.0 with React.lazy code-splitting  
**Drag/Resize:** interact.js 1.10.27 with aspect ratio constraints  
**AI:** Claude claude-sonnet-4-5-20250929 via Convex action  
**Storage:** Notes as TipTap JSON + plain text for search indexing

**Date Completed:** January 2, 2026

---

## Phase 3: Learn

**Goal:** AI study tools and gamification

### AI Study Tools

- [ ] **Summary Generator** — comprehensive session summaries
- [ ] **Key Concepts** — 5-7 important concepts with definitions
- [ ] **Flashcard Generator** — interactive cards, Review/Learn modes
- [ ] **Quiz Generator** — multiple choice, configurable count
- [ ] **Concept Map** — visual hierarchical mind map
- [ ] **ELI5 Explainer** — simple explanations with analogies
- [ ] **AI Chat** — ask questions about transcript/notes

### StudyQuest (JRPG)

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

### Productivity & Gamification

- [ ] Study goals (daily/weekly)
- [ ] Streak tracking
- [ ] Break reminders (configurable intervals)
- [ ] Achievements (~15-20 to start)

### Acceptance Criteria

- [ ] All 7 AI tools generate useful output
- [ ] StudyQuest cat responds to study activity
- [ ] Goals and streaks track correctly
- [ ] Break reminders fire at correct intervals
- [ ] Achievements unlock appropriately

---

## Phase 4: Connect

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

### Acceptance Criteria

- [ ] Can add friends and see online status
- [ ] Can message friends
- [ ] Can share sessions (view or copy)
- [ ] Study rooms work without bugs
- [ ] Both games playable and synced
- [ ] Canvas integration pulls course list

---

## Definition of Done (All Phases)

Before marking a phase complete:

- [ ] All features work without critical bugs
- [ ] UI matches design system (themes, spacing, etc.)
- [ ] Data persists correctly (Convex)
- [ ] Loading states present
- [ ] Error states handled gracefully
- [ ] Keyboard shortcuts functional
- [ ] Basic accessibility (keyboard nav, contrast)
- [ ] Tested on real use cases (not just happy path)

---

## Migration Notes

### From v2 — Reference Only

These v2 patterns should be referenced but NOT copy-pasted:

| Feature | v2 Location | Notes |
|---------|-------------|-------|
| AssemblyAI | `src/renderer/audio/` | Adapt for new architecture |
| AI prompts | `src/renderer/ai/` | Reuse prompt structures |
| Jeopardy | `src/renderer/components/games/` | Port game logic |
| Canvas extension | `browser-extension/` | Review and port |

**The architecture is completely different.** Understand the pattern, implement fresh.
