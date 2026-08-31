# ScribeCat v3 — Phase Implementation Guide

> **Current Phase: 4 — Connect (COMPLETE)**, plus substantial post-Phase-4 expansion (see below)
>
> **Current Version: 5.20.3**
>
> Last updated: August 2026

---

## Phase Overview

| Phase | Name | Goal | Status |
|-------|------|------|--------|
| 1 | **Capture** | Recording + live transcription | Complete |
| 2 | **Process** | Notes editor + AI generation | Complete |
| 3 | **Learn** | Study tools + StudyQuest | Complete |
| 4 | **Connect** | Social + Study Rooms + Games + Canvas LMS | Complete |

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
  - [x] Authentication (Clerk, open signup — the @udel.edu restriction was lifted in v5.24.0)
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

## Phase 3: Learn — COMPLETE

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
- [x] Real-world test: 50+ minute lecture recording without issues

### Technical Notes

**Study Tools:** Each tool is a React component in `src/renderer/components/study-tools/`
**Prompts:** Centralized in `convex/studyToolPrompts.ts` with lecture-type variants
**Caching:** Results stored in `studyToolResults` table, keyed by session + tool type
**Spaced Repetition:** `flashcardProgress` table tracks per-card confidence + next review
**Quiz History:** `quizAttempts` table stores full answer history per session
**StudyQuest:** Cat companion in `src/renderer/components/study-quest/`, backend in `convex/studyQuest.ts`
**Sprites:** 11 cat variants × 8 animations as 32×32 sprite sheets in `public/cats/`
**XP System:** `convex/xpUtils.ts` (shared math), `catCompanion` table, XP awarded from `productivity.ts` and `studyTools.ts`

**Date Completed:** February 23, 2026

---

## Phase 4: Connect — COMPLETE

**Goal:** Social features and collaborative study

### Friends System — COMPLETE

- [x] User profiles with unique @usernames (permanent, 3-20 chars)
- [x] Search users by @username (search index, min 2 chars)
- [x] Send/accept/decline/cancel friend requests
- [x] Friends list with cat companion info
- [x] Block/unblock users (removes existing friendships)
- [x] Username setup modal (real-time validation + availability check)
- [x] `/friends` route with Friends, Requests, Search tabs
- [x] Pending request badge in TopBar navigation
- [x] Username display in Settings > Account
- [x] Shared auth helpers (`convex/authHelpers.ts`)

### Messaging — COMPLETE

- [x] Inbox view (two-panel: conversation list + active thread)
- [x] Direct messages between friends (1-on-1)
- [x] Unread indicators (per-conversation blue dot + TopBar badge)
- [x] Real-time updates via Convex auto-subscriptions
- [x] Session share messages (special card with View/Copy buttons)

### Session Sharing — COMPLETE

- [x] Share session with friend (auto-sends DM notification)
- [x] View shared session (read-only with StudyContent + StudyTools)
- [x] Copy to library (deep-copy session + notes, reuse audio file)
- [x] Share modal from study view (toggle share per friend)
- [x] Unshare to revoke access

### Study Rooms — COMPLETE

- [x] Create room (name + invite friends)
- [x] Invite friends directly (friends-only, no password/link)
- [x] Room text chat (real-time with system messages for join/leave/pin)
- [x] Participant list with presence (heartbeat-based, green/grey dots)
- [x] Pin session for shared viewing (host pins own session, read-only for all)
- [x] Pending room badge in TopBar for unjoined invites
- [x] Host close / member leave functionality

### Multiplayer Games — COMPLETE

- [x] **Quiz Battle** — 10-question head-to-head competitive quiz
  - [x] AI generates questions from pinned session (transcript + notes)
  - [x] Server-side answer validation (correct answers hidden from client)
  - [x] Speed bonus scoring (100 base + up to 50 for fast answers)
  - [x] Answer privacy (other players' picks hidden until reveal)
  - [x] Auto-reveal when all players answer
  - [x] Host skip for disconnected players
- [x] **Jeopardy** — 5 categories x 5 questions (25 total)
  - [x] AI generates category board from pinned session
  - [x] Turn-based cell selection (rotate by join order)
  - [x] Difficulty scaling (100-500 point values)
  - [x] Category grid UI with revealed/unrevealed cells
- [x] **Shared game infrastructure**
  - [x] Game lobby with ready-up system
  - [x] Real-time sync via Convex subscriptions
  - [x] Score tracking with live scoreboard
  - [x] Results screen with podium display (cat sprites)
  - [x] XP rewards (15 winner, 10 participants)
  - [x] System messages in room chat (game start/finish/cancel)
  - [x] Games require pinned session (ties games to studying)
  - [x] All room members auto-join as players

### Privacy & Compliance — COMPLETE

- [x] Recording consent modal (displayed before first recording)
- [x] Terms of Service and Privacy Policy (formatted markdown rendering with tables)
- [x] Legal doc links in landing page footer
- [x] Audio auto-deletion (configurable retention, `audioCleanup.ts` cron)
- [x] "Lecture" → "Study session" rebranding throughout app for legal clarity
- [x] Contact email updated to nae@adhdesigns.dev

### Exam Study Room — COMPLETE

- [x] **Room Management**
  - [x] Create exam room with name and optional exam date (countdown display)
  - [x] Invite friends (host-only, friends-only)
  - [x] Join/leave/archive rooms
  - [x] Online member count with heartbeat presence
  - [x] `/exam` and `/exam/$examRoomId` routes
- [x] **Session Conductor AI** (`convex/examBrain.ts`)
  - [x] Sonnet-powered topic index extraction on session add
  - [x] Structured brain context (topics, concepts, session mapping)
  - [x] Powers all downstream AI tools with multi-session awareness
- [x] **Multi-Session Study Tools** (all use brain context)
  - [x] Summary — comprehensive overview across all sessions
  - [x] Key Concepts — importance-ranked concept definitions
  - [x] Flashcards — interactive cards with difficulty labels
  - [x] Quiz — practice questions with explanations
  - [x] Concept Map — visual node graph of topic relationships
  - [x] ELI5 — simple explanations with analogies and examples
- [x] **Exam Simulation**
  - [x] Timed practice exams (configurable questions: 15/20/30, time: 15/30/45/60 min)
  - [x] Question navigation grid
  - [x] Auto-submit on time expiry
  - [x] Attempt history with scores + time tracking
  - [x] Topic breakdown statistics per attempt
- [x] **Weak Spots & Targeted Review**
  - [x] Per-topic accuracy tracking from quiz/flashcard performance
  - [x] Topic bars ranked weakest-first
  - [x] AI-generated targeted review (flashcards + quiz for weak topics)
  - [x] Reset weak spots
- [x] **Exam Chat**
  - [x] Nugget AI chat in exam mode (per-room, per-user history)
  - [x] Context-aware Q&A across all room sessions
  - [x] Markdown rendering for AI responses
- [x] **Games**
  - [x] Quiz Battle and Jeopardy via shared `studyGames` table with `examRoomId`
  - [x] XP rewards for game participation

### Canvas LMS Integration — COMPLETE (import flow later simplified)

- [x] `course` field on sessions (first-class, not just title prefix)
- [x] Course filter dropdown in recordings sidebar
- [x] Course field is a manual dropdown (v5.17.1)
- [ ] ~~Canvas import dialog in Settings (JSON paste from extension)~~ — **removed in v5.17.2** ("remove defunct Canvas browser extension import from settings"). The `course` field is now entered manually; there's no in-app destination for the extension's clipboard output anymore.
- [x] ~~Chrome browser extension (`browser-extension/`, Manifest V3) for Canvas course detection~~ — **removed in v5.21.4**. It had no consumer since the Settings paste-import UI was removed in v5.17.2; deleted rather than wired back since course entry is now manual.

### Technical Notes

**Friends System:** 3 new tables (`userProfiles`, `friendships`, `blocks`) with compound indexes for bidirectional queries
**Auth Helpers:** Shared `convex/authHelpers.ts` (extracted from 4 files) — `requireAuth()` + `requireAuthWithProfile()`
**Username Search:** Convex `searchIndex` on `username` field for prefix matching
**Convex Module Naming:** Filenames cannot contain hyphens — use camelCase (e.g., `authHelpers.ts`, not `auth-helpers.ts`)
**Messaging:** 4 new tables (`conversations`, `messages`, `conversationReads`, `sharedSessions`). Sorted participantIds for conversation dedup. Individual message rows (not array-in-doc) for scalability. `conversationReads` table for per-user unread tracking.
**Session Sharing:** Share record + auto-DM notification. `copyToLibrary` deep-copies session + sessionNotes, references same `audioStorageId` (no file duplication).
**Study Rooms:** 3 new tables (`studyRooms`, `studyRoomMembers`, `studyRoomMessages`). Ephemeral rooms closed by host. Heartbeat presence (30s mutation, 60s online threshold). Pinned sessions reuse `StudyContent` + `StudyTools` for read-only viewing.
**Multiplayer Games:** 2 new tables (`studyGames`, `studyGamePlayers`). Games live inside rooms, require pinned session. AI generates questions via `callClaude` (reused from `studyTools.ts`). Quiz Battle uses `getQuizPrompt`, Jeopardy uses `getJeopardyPrompt`. Server-side answer checking — `submitAnswer` validates against stored questions, clients never see correct answers. Answer privacy via query filtering. Auto-advance on all answered. Speed bonus for Quiz Battle. Turn rotation for Jeopardy. XP awarded via `awardXpHelper`.
**Canvas LMS:** No new tables — `course` field added to `sessions` table with `by_user_course` index. Courses stored as `string[]` in existing `userSettings`. Originally paired with a `browser-extension/` (vanilla JS, Manifest V3) that detected courses on `*.instructure.com` via 4 DOM strategies and a JSON paste flow in settings (no server-side Canvas API needed) — the paste flow was removed in v5.17.2 in favor of manual entry, and the now-orphaned extension itself was removed in v5.21.4. Course filter in sidebar is client-side.
**Privacy & Compliance:** Recording consent modal (`legal-doc-modal.tsx`), TOS/Privacy Policy with formatted markdown rendering (headings, tables, bold, links). Audio auto-deletion via `audioCleanup.ts` cron job. "Lecture" → "Study session" rebranding for legal defensibility.
**Exam Study Room:** 8 new tables (`examRooms`, `examRoomMembers`, `examRoomSessions`, `examRoomMessages`, `examToolResults`, `examChatHistory`, `weakSpots` + reused `studyGames`). Session Conductor AI (`examBrain.ts`) uses Sonnet to extract structured topic indexes when sessions are added — downstream tools use this brain context instead of raw transcripts (cost-effective: Sonnet for indexing, Haiku for per-request chat/tools). 11 frontend components in `src/renderer/components/exam/`, 4 hooks (`use-exam-room`, `use-exam-tools`, `use-exam-simulation`, `use-weak-spots`), 7 backend files (`examRooms`, `examBrain`, `examChat`, `examTools`, `examToolPrompts`, `examSimulation`, `examGames`, `weakSpots`). Routes: `/exam` and `/exam/$examRoomId`.
**Shared Markdown Renderer:** `src/renderer/lib/render-markdown.tsx` — extracted from `nugget-chat.tsx` and shared across exam chat, exam tools, study tools, and weak spots panel for consistent AI content rendering.

**Date Completed:** April 2026

---

## Post-Phase 4: Ongoing Expansion — v4.28.0 to v5.20.3

Phase 4 (Connect) shipped complete in April 2026. Development continued past the phase framework — the major systems added since aren't tracked against phase acceptance criteria, but they're real, shipped, and in daily use:

- **StudyQuest RPG** (v5.7.0–5.18.2): A full game layer beyond the Phase 3 Tamagotchi MVP — Excalibur.js-powered explorable town, procedurally generated dungeon with minimap, turn-based combat, cat evolution tiers (visual milestones at L5/L10/L20), equipment + inventory system, shop economy, and battle item drops. Game engine lives in `src/renderer/components/study-quest/game/` (~2,600 lines); widget/inventory/shop UI adds another ~1,300 lines. Backend: `convex/shop.ts`, `inventory.ts`, `items.ts`.
- **ScribeCat MCP Server** (v5.18.0): Read-only HTTP API (`convex/mcpApi.ts`) so external MCP clients can list/get/search sessions and list courses. Authenticated via user-generated, SHA-256-hashed API keys (`convex/apiKeys.ts`).
- **File storage migration to Cloudflare R2** (v5.20.0–5.20.1): Moved all file storage (audio, editor images, parsed documents) off Convex file storage to R2 via `@convex-dev/r2`, after the Convex free-tier file storage limit was exceeded and disabled deployments. Convex core bumped 1.31.2 → 1.43.0.
- **Speaker detection** (v5.5.0): Post-recording diarization via `convex/speakerDetection.ts`.
- **Session resilience & recovery** (v5.0.0, v5.4.0): Crash recovery, progressive chunk upload for long sessions, battery efficiency (pause idle work when the tab is hidden).
- **Handwriting notes** (v5.16.0): Apple Pencil drawing canvas, uploaded as a document.
- **Session merge** (v5.17.0): Combine fragmented recordings into one session.
- **Failsafe recording + flagged transcript words** (v5.16.0): 3-hour forgot-to-stop prompt; click-to-flag incorrect transcript words during recording for post-edit.
- **Session organization** (v5.19.0): Search, sort, and course grouping in the recordings sidebar.

**Technical Notes:** See the full version table below for the complete, version-by-version breakdown of everything in this window, including bugfixes not called out above.

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
| 4.11.3 | Feb 2026 | Update docs with StudyQuest completion and new project structure |
| 4.11.4 | Feb 2026 | Mark Phase 3 complete, advance to Phase 4 |
| 4.12.0 | Feb 2026 | Friends system — user profiles, friend requests, search, blocks |
| 4.12.1 | Feb 2026 | Fix Convex module naming (auth-helpers → authHelpers) |
| 4.13.0 | Feb 2026 | Session titles, courses, font colors, wellness breaks, settings improvements |
| 4.13.1 | Feb 2026 | Fix settings modal width, Nugget Notes toggle, font color/highlight dropdowns |
| 4.13.2 | Feb 2026 | Put session type and course selection on same line |
| 4.14.0 | Feb 2026 | Direct messaging and session sharing |
| 4.15.0 | Feb 2026 | Study rooms — group study with shared sessions and chat |
| 4.16.0 | Feb 2026 | Multiplayer games — Quiz Battle and Jeopardy in study rooms |
| 4.17.0 | Feb 2026 | Canvas LMS integration — course field, filter, import, browser extension |
| 4.17.1 | Feb 2026 | Inline title and course editing on session details page |
| 4.18.0 | Mar 2026 | Bug reporting via Nugget Chat — auto-creates GitHub Issues |
| 4.19.0 | Mar 2026 | Notification sounds, browser push alerts, and badge caps |
| 4.20.0 | Mar 2026 | PWA support — installable, service worker, app manifest |
| 4.20.1 | Mar 2026 | Fix settings category text contrast across all themes |
| 4.21.0 | Mar 2026 | Collaborative notes in study rooms |
| 4.21.1 | Mar 2026 | Fix N+1 queries, unsafe JSON.parse, and study tool boilerplate |
| 4.21.2 | Mar 2026 | Real-time cursor presence in collaborative notes |
| 4.21.3 | Mar 2026 | Fix session share View button crashing for sender |
| 4.22.0 | Mar 2026 | Friend online status across app, fix cat sprite clipping |
| 4.22.1-4 | Mar 2026 | UI polish — room sprites, notes layout, transcript formatting |
| 4.23.0 | Mar 2026 | Real-time transcript scrubbing (sliding 800-word window) |
| 4.23.1 | Mar 2026 | Reduce Nugget note redundancy via dedup context and slower interval |
| 4.24.0 | Mar 2026 | Fun descriptive landing page for unauthenticated users |
| 4.24.1-3 | Mar 2026 | Cat sprite scaling, @udel.edu enforcement in code |
| 4.24.4-5 | Mar 2026 | OpenGraph preview image, PWA manifest improvements |
| 4.24.6-7 | Apr 2026 | PWA cache limits, lazy microphone permission |
| 4.24.8-10 | Apr 2026 | Safari PWA icon, AudioWorklet downsampler, mic permission fix |
| 4.25.0 | Apr 2026 | Session resilience — recording survives navigation, screen sleep, auth expiry, tab close |
| 4.25.1 | Apr 2026 | Expand editor font colors to 8, fix cleaned transcript display in study view |
| 4.25.2 | Apr 2026 | Update all docs, replace font color dropdown with swatch grid |
| 4.26.0 | Apr 2026 | Privacy & compliance overhaul — consent modal, legal docs, audio auto-deletion |
| 4.26.1 | Apr 2026 | Complete lecture→study rebranding audit |
| 4.26.2 | Apr 2026 | Add TOS/Privacy links to landing page footer, tweak copy |
| 4.26.3 | Apr 2026 | Fix audioCleanup query crash — graceful auth fallback |
| 4.26.4 | Apr 2026 | Fix manifest.json syntax error |
| 4.26.5 | Apr 2026 | Render TOS and Privacy Policy as formatted markdown |
| 4.26.6 | Apr 2026 | Add table rendering to legal docs, update contact email |
| 4.27.0 | Apr 2026 | Exam Study Room — multi-session exam prep with Session Conductor AI |
| 4.27.1 | Apr 2026 | Shared markdown renderer + doc sync for v4.25.2–v4.27.0 features |
| 4.28.0 | Apr 2026 | Timezone awareness — user setting, study stats fix, AI time context |
| 4.28.1-3 | Apr 2026 | Exam simulation question count, dark-theme button contrast, per-user question scoping fixes |
| 4.29.0 | Apr 2026 | Document/image upload with AI text extraction |
| 4.29.1-3 | Apr 2026 | Document parsing fixes — URL sources, markdown rendering, base64 encoding |
| 4.30.0 | Apr 2026 | `documentText` schema field, parsing fixes, full TypeScript error cleanup |
| 4.30.1-3 | Apr 2026 | Image upload JPEG conversion, OOM fix (URL sources over base64), markdown heading rendering |
| 4.31.0 | Apr 2026 | Exam room editing + session viewing for members |
| 5.0.0 | Apr 2026 | Crash recovery + full mobile responsiveness |
| 5.0.1-8 | Apr 2026 | Exam brain context fixes — Nugget chat wiring, countdown logic, markdown renderer, centralized Anthropic API calls, Sonnet model ID fix |
| 5.1.0 | Apr 2026 | Collect and edit display name — replace "Student" default |
| 5.2.0 | Apr 2026 | Audit cleanup — remove dead endpoint, wire flashcard spaced repetition |
| 5.2.1 | Apr 2026 | Surface audio save + recovery errors via toasts |
| 5.3.0 | Apr 2026 | Easter eggs ported from v2 + Nyan Cat themes |
| 5.3.1-3 | Apr 2026 | Nyan theme gating, Clerk telemetry CSP fix, Cat Party sprite rain |
| 5.4.0 | Apr 2026 | Progressive chunk upload — fix silent audio save failures on long sessions |
| 5.4.1-3 | Apr–May 2026 | Transcript scrub/render fixes, battery efficiency (pause idle work when tab hidden) |
| 5.5.0 | May 2026 | Detect Speakers button — post-recording diarization |
| 5.5.1-2 | May 2026 | Sidebar scroll fix, iPad multi-window audio interruption survival |
| 5.7.0 | May 2026 | StudyQuest game — Excalibur engine + explorable town |
| 5.8.0 | May 2026 | StudyQuest Phase 2 — procgen dungeon + minimap |
| 5.9.0 | May 2026 | StudyQuest Phase 3 — turn-based combat |
| 5.9.1 | May 2026 | Battle action menu + question modal moved to React overlay |
| 5.10.0 | May 2026 | Cat evolution tiers — visual milestones at L5/L10/L20 |
| 5.11.0 | May 2026 | StudyQuest inventory + equipment foundation |
| 5.12.0 | May 2026 | StudyQuest inventory UI — equip/unequip from a Dialog panel |
| 5.13.0 | May 2026 | Healing potions wired into battle as the Item action |
| 5.14.0 | May 2026 | Battle drops — items roll into your bag on victory |
| 5.15.0 | May 2026 | StudyQuest shop — spend coins on gear and potions |
| 5.16.0 | May 2026 | Failsafe recording, flagged transcript words, handwriting notes (Apple Pencil), ADHDesigns brand theme for Nugget |
| 5.17.0 | May 2026 | Session merge — combine fragmented recordings into one |
| 5.17.1-2 | May 2026 | Course field as dropdown, remove defunct Canvas browser extension import |
| 5.18.0 | May 2026 | ScribeCat MCP server — API key management + session endpoints |
| 5.18.1-3 | May 2026 | MCP setup instructions in Settings, orange cat variant, merge-modal overflow fix |
| 5.19.0 | May 2026 | Session organization — search, sort, and course grouping in sidebar |
| 5.20.0 | Aug 2026 | Migrate file storage from Convex to Cloudflare R2 |
| 5.20.1 | Aug 2026 | Fix CSP blocking R2 uploads and playback |
| 5.20.2 | Aug 2026 | Replace alert() and strip debug logs from Generate Notes flow |
| 5.20.3 | Aug 2026 | Fix pre-commit hook not executable — lint-staged was silently skipped |
