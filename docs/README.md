# ScribeCat v3

**ADHD-friendly study companion** — Record, transcribe, and study smarter

> A web app for recording voice notes with real-time transcription, AI-powered note-taking, and gamified study tools. Built with React, Convex, and Claude AI.

---

## Current Status: v4.27.0 — Phase 4 (Connect) COMPLETE

| Phase | Name | Status |
|-------|------|--------|
| **1** | **Capture** — Recording + Live Transcription | Complete |
| **2** | **Process** — Notes Editor + AI Generation | Complete |
| **3** | **Learn** — Study Tools + StudyQuest | Complete |
| **4** | **Connect** — Social + Study Rooms + Games + Canvas LMS | Complete |

See **[Phase Implementation Guide](PHASES.md)** for detailed feature checklists.

---

## Features

### Recording & Transcription (Phase 1)
- Audio recording with device selection
- Real-time transcription via AssemblyAI
- Pause/resume recording with timestamps
- Audio playback synced to transcript (click-to-seek)
- Note type selection (STEM, Humanities, Discussion, Lab, Review, General)
- Session management with trash system (30-day retention)
- File upload + transcription for pre-recorded audio
- Course tagging with Canvas LMS import support

### Notes Editor (Phase 2)
- TipTap rich text editor with full formatting toolbar (8 theme-aware font colors)
- Inline Excalidraw diagrams (lazy-loaded, drag/resize)
- Draggable/resizable images and textboxes (interact.js)
- AI note generation from transcript (note-type-aware prompts)
- Smart auto-save (750ms debounce + Cmd+S manual)

### AI Features (Phase 2-3)
- **Nugget's Notes** — Real-time AI bullet points during recording (two-step pipeline: context extraction + note generation)
- **Nugget Chat** — Persistent per-session AI chat with clickable suggestions
- **Summary Generator** — Comprehensive session summaries
- **Key Concepts** — 5-7 important concepts with definitions
- **Flashcards** — Interactive cards with Browse/Learn modes and spaced repetition
- **Quiz Generator** — Multiple choice, configurable count, scoring + history
- **Concept Map** — Visual hierarchical SVG mind map
- **ELI5 Explainer** — Simple explanations with analogies

### Productivity (Phase 3)
- Study goals (daily/weekly)
- Streak tracking
- Break reminders (configurable intervals)
- 14 achievements

### StudyQuest Cat Companion (Phase 3)
- Tamagotchi-style pixel art cat companion (11 variants with sprite sheet animations)
- Cat mood reacts to study activity (idle, happy, studying, sleepy, excited)
- XP earned from study time, session completion, daily goals, tool use, achievements, games
- Level up system with quadratic XP curve
- Floating widget with adopt flow, variant picker, and name editor

### Friends & Social (Phase 4)
- User profiles with unique @usernames
- Friend requests (send, accept, decline, cancel)
- Friends list with cat companion info
- User search by username
- Block/unblock users (removes existing friendships)
- Pending request badge in navigation

### Direct Messaging (Phase 4)
- Real-time DM conversations with friends
- Session sharing via messages
- Notification sounds and unread tracking
- Online/offline presence indicators

### Study Rooms (Phase 4)
- Ephemeral group study rooms (create, join, leave)
- Room text chat with system messages
- Pin sessions for group study
- Collaborative room notes editor
- Multiplayer games: Quiz Battle and Jeopardy
- Game lobby with ready-up system
- Post-game scoreboard with podium and XP awards

### Exam Study Room (Phase 4)
- Multi-session exam prep rooms with optional exam date countdown
- Session Conductor AI (Sonnet-powered topic indexing on session add)
- 6 multi-session AI study tools (Summary, Key Concepts, Flashcards, Quiz, Concept Map, ELI5)
- Timed exam simulation (configurable questions + time limit, question navigation)
- Weak Spots panel — per-topic accuracy tracking from quiz/flashcard performance
- Targeted Review — AI-generated flashcards + quiz focused on weak topics
- Exam-mode Nugget Chat — context-aware AI Q&A across all room sessions
- Invite friends to exam rooms (host-only)
- Exam attempt history with scores and topic breakdowns
- Multiplayer games (Quiz Battle, Jeopardy) using exam room sessions

### Privacy & Compliance (v4.26.0)
- Recording consent modal before first recording
- Terms of Service and Privacy Policy with formatted markdown rendering
- Audio auto-deletion (configurable retention, cron-based cleanup)
- "Lecture" → "Study session" rebranding for legal clarity

### Session Resilience
- Recording persists across route navigation (RecordingContext in AppLayout)
- Screen Wake Lock prevents sleep during recording
- Clerk auth keep-alive prevents session expiry during long recordings
- `beforeunload` guard prevents accidental tab close during recording
- Mini recording indicator with controls on non-home routes

### UI
- 6 themes with glassmorphism effects (frosted glass panels, gradient backgrounds, glow accents)
- 8 font colors per theme for the notes editor
- Mobile-responsive layout
- Resizable panels (Notes / Recording)
- PWA support with installable app icons

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or npm)
- [Convex](https://convex.dev) account
- [Clerk](https://clerk.com) account
- [AssemblyAI](https://www.assemblyai.com) API key
- [Anthropic](https://console.anthropic.com) API key

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd ScribeCat-v3
   pnpm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env.local` and fill in the values:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   ```
   VITE_CONVEX_URL=           # From `npx convex dev`
   VITE_CLERK_PUBLISHABLE_KEY=  # From Clerk dashboard
   ```

   Set these in the **Convex dashboard** (environment variables):
   ```
   ASSEMBLYAI_API_KEY=        # From AssemblyAI dashboard
   ANTHROPIC_API_KEY=         # From Anthropic console
   CLERK_JWT_ISSUER_DOMAIN=   # From Clerk dashboard (JWT templates)
   ```

3. **Start Convex backend (Terminal 1):**
   ```bash
   pnpm convex:dev
   ```

4. **Start dev server (Terminal 2):**
   ```bash
   pnpm dev
   ```

   App runs at `http://localhost:5173`

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **UI** | React | 19.2 |
| **Language** | TypeScript | 5.x (strict mode) |
| **Styling** | Tailwind CSS 4 + shadcn/ui | |
| **Build** | Vite | 7.x |
| **Backend** | Convex | 1.31+ |
| **Auth** | Clerk + Convex integration | |
| **Rich Text** | TipTap | 3.14 |
| **Diagrams** | Excalidraw | 0.18 |
| **Routing** | TanStack Router | 1.x |
| **Drag/Resize** | interact.js | 1.10 |
| **Transcription** | AssemblyAI | Real-time WebSocket |
| **AI** | Anthropic Claude (Haiku 4.5, all endpoints) | |
| **Linting** | Biome | 1.9+ |
| **Pre-commit** | Husky + lint-staged | |

---

## Project Structure

```
ScribeCat-v3/
├── convex/                    # Convex backend (42 files, 31 tables)
│   ├── schema.ts             # Database schema
│   ├── sessions.ts           # Session CRUD
│   ├── ai.ts                 # AI note generation (Convex action)
│   ├── generateNotes.ts      # AI note generation (HTTP action)
│   ├── nuggetNotes.ts        # Real-time note generation
│   ├── nuggetChat.ts         # AI chat endpoint
│   ├── lectureContext.ts     # Context extraction
│   ├── studyTools.ts         # Study tool AI actions
│   ├── studyToolPrompts.ts   # Study tool + game prompt templates
│   ├── studyGames.ts         # Multiplayer games (Quiz Battle, Jeopardy)
│   ├── studyRooms.ts         # Study rooms
│   ├── roomNotes.ts          # Collaborative room notes
│   ├── examRooms.ts          # Exam room CRUD, invites, messaging
│   ├── examBrain.ts          # Session Conductor AI (topic index extraction)
│   ├── examChat.ts           # Exam room Nugget chat
│   ├── examTools.ts          # Multi-session exam study tools
│   ├── examToolPrompts.ts    # Exam tool prompt templates
│   ├── examSimulation.ts     # Timed practice exam generation
│   ├── examGames.ts          # Exam room game instantiation
│   ├── weakSpots.ts          # Per-topic accuracy + targeted review
│   ├── audioCleanup.ts       # Audio auto-deletion for privacy
│   ├── scrubTranscript.ts    # Transcript cleaning/scrubbing
│   ├── prompts.ts            # Note generation prompts by lecture type
│   ├── citations.ts          # Citation parser
│   ├── config.ts             # Shared AI model configuration
│   ├── audioStorage.ts       # Audio file storage
│   ├── uploadImage.ts        # Image upload handler
│   ├── transcription.ts      # AssemblyAI token generation
│   ├── productivity.ts       # Goals, streaks, achievements
│   ├── studyQuest.ts         # Cat companion queries/mutations
│   ├── xpUtils.ts            # XP/level math functions
│   ├── authHelpers.ts        # Shared auth helpers
│   ├── userProfiles.ts       # User profiles + username search
│   ├── friends.ts            # Friend requests + friend list
│   ├── blocks.ts             # Block/unblock users
│   ├── messaging.ts          # DM conversations + messages
│   ├── messagingHelpers.ts   # Shared messaging helpers
│   ├── sessionSharing.ts     # Session sharing permissions
│   ├── reportBug.ts          # Bug report endpoint
│   ├── crons.ts              # Scheduled jobs (trash cleanup)
│   ├── http.ts               # HTTP action routes
│   └── auth.config.ts        # Clerk auth config
├── src/
│   └── renderer/             # React app
│       ├── App.tsx           # Root with Clerk auth gates
│       ├── index.tsx         # Entry point (Clerk + Convex providers)
│       ├── router.tsx        # TanStack Router config
│       ├── contexts/
│       │   ├── session-context.tsx    # App-wide session/chat state
│       │   └── recording-context.tsx  # Persistent recording state
│       ├── components/
│       │   ├── app-layout.tsx        # Root layout (providers, guards, TopBar)
│       │   ├── home-view.tsx         # Recording mode
│       │   ├── study-view.tsx        # Study mode
│       │   ├── recording-panel.tsx   # Recording UI (presentational)
│       │   ├── notes-panel.tsx       # TipTap editor + AI generation
│       │   ├── study-content.tsx     # Study content viewer
│       │   ├── nugget-notes-panel.tsx # Real-time AI notes
│       │   ├── nugget-chat.tsx       # AI chat drawer
│       │   ├── recordings-sidebar.tsx # Session list
│       │   ├── top-bar.tsx           # Navigation + theme
│       │   ├── settings-modal.tsx    # User settings
│       │   ├── editor-toolbar.tsx    # TipTap formatting toolbar
│       │   ├── landing-page.tsx      # Public landing page
│       │   ├── shared-session-view.tsx # Shared session viewer
│       │   ├── mini-recording-indicator.tsx # Recording pill on non-home routes
│       │   ├── recording-navigation-guard.tsx # beforeunload guard
│       │   ├── study-tools/          # 6 AI study tool components
│       │   ├── study-quest/          # StudyQuest cat companion
│       │   ├── friends/              # Friends system
│       │   ├── messages/             # Direct messaging
│       │   │   ├── messages-view.tsx        # Main /messages page
│       │   │   ├── conversation-list.tsx    # DM conversation list
│       │   │   ├── conversation-thread.tsx  # Individual DM thread
│       │   │   └── share-session-modal.tsx  # Share session via DM
│       │   ├── rooms/                # Study rooms + games
│       │   │   ├── study-rooms-view.tsx     # Main /rooms page
│       │   │   ├── room-list.tsx            # Room browser
│       │   │   ├── room-view.tsx            # Room view (chat + games)
│       │   │   ├── room-chat.tsx            # Room text chat
│       │   │   ├── room-notes-editor.tsx    # Collaborative notes
│       │   │   ├── create-room-modal.tsx    # Room creation
│       │   │   ├── pin-session-modal.tsx    # Pin session selector
│       │   │   ├── game-launcher.tsx        # Game type dropdown
│       │   │   ├── game-view.tsx            # Game router
│       │   │   ├── game-lobby.tsx           # Pre-game lobby
│       │   │   ├── quiz-battle.tsx          # Quiz Battle game
│       │   │   ├── jeopardy-game.tsx        # Jeopardy game
│       │   │   └── game-results.tsx         # Post-game scoreboard
│       │   ├── exam/                 # Exam Study Room
│       │   │   ├── exam-study-view.tsx      # Main /exam page
│       │   │   ├── exam-room-view.tsx       # Active exam room (tabbed)
│       │   │   ├── exam-room-list.tsx       # Room list sidebar
│       │   │   ├── create-exam-room-modal.tsx
│       │   │   ├── exam-session-list.tsx    # Sessions tab
│       │   │   ├── exam-session-picker.tsx  # Add sessions modal
│       │   │   ├── exam-invite-modal.tsx    # Invite friends
│       │   │   ├── exam-tools.tsx           # 6 AI study tools
│       │   │   ├── exam-simulation.tsx      # Timed practice exam
│       │   │   ├── exam-chat.tsx            # Nugget AI chat
│       │   │   └── weak-spots-panel.tsx     # Topic accuracy tracking
│       │   └── ui/                   # shadcn/ui components
│       ├── hooks/                    # 24 custom hooks
│       │   ├── use-audio-recorder.ts
│       │   ├── use-audio-player.ts
│       │   ├── use-transcription.ts
│       │   ├── use-nugget-notes.ts
│       │   ├── use-sessions.ts
│       │   ├── use-productivity.ts
│       │   ├── use-study-quest.ts
│       │   ├── use-user-profile.ts
│       │   ├── use-friends.ts
│       │   ├── use-messaging.ts
│       │   ├── use-session-sharing.ts
│       │   ├── use-study-rooms.ts
│       │   ├── use-study-games.ts
│       │   ├── use-notification-sounds.ts
│       │   ├── use-notification-watcher.ts
│       │   ├── use-presence.ts
│       │   ├── use-wake-lock.ts
│       │   ├── use-session-keep-alive.ts
│       │   ├── use-exam-room.ts           # Exam room queries + mutations
│       │   ├── use-exam-tools.ts          # Exam study tool generation
│       │   ├── use-exam-simulation.ts     # Timed exam state management
│       │   ├── use-weak-spots.ts          # Topic accuracy tracking
│       │   ├── use-debounced-callback.ts
│       │   └── use-is-mobile.ts
│       ├── lib/
│       │   ├── markdown-to-tiptap.ts
│       │   ├── render-markdown.tsx        # Shared MD renderer for AI content
│       │   ├── citation-mark.ts
│       │   ├── excalidraw-extension.tsx
│       │   ├── draggable-image-extension.tsx
│       │   ├── textbox-extension.tsx
│       │   ├── font-size-extension.ts
│       │   ├── notification-sounds.ts
│       │   ├── push-notifications.ts
│       │   └── utils.ts
│       ├── types/
│       │   ├── study-tools.ts
│       │   └── friends.ts
│       └── styles/
│           └── globals.css           # Tailwind + 6 themes (8 font colors each)
├── public/                    # Static assets
│   └── cats/                 # 11 cat variant sprite sheets (32x32 frames)
├── docs/                      # Documentation
├── .github/                   # GitHub config
└── biome.json                 # Linting/formatting config
```

---

## Development Commands

```bash
# Development
pnpm dev              # Start Vite dev server (requires convex:dev running)
pnpm convex:dev       # Start Convex backend

# Building
pnpm build            # Production build (Vite)
pnpm compile          # TypeScript type-checking only
pnpm clean            # Delete dist/ folder

# Code Quality (runs automatically on commit via Husky)
pnpm lint             # Check with Biome
pnpm lint:fix         # Auto-fix issues
pnpm format           # Format all files

# Deployment
pnpm convex:deploy    # Deploy Convex functions to production
```

---

## Documentation

- **[Phase Implementation Guide](PHASES.md)** — Feature roadmap and checklists
- **[Notion-Inspired Features](NOTION-INSPIRED-FEATURES.md)** — Lecture types, dual-input synthesis, citations
- **[Nugget Integration Handoff](nugget-integration-handoff.md)** — AI note-taking system architecture
- **[Privacy Compliance Spec](SPEC-privacy-compliance-overhaul.md)** — Consent, legal docs, audio deletion

---

## License

MIT
