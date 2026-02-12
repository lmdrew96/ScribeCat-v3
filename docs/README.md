# ScribeCat v3

**ADHD-friendly lecture companion** — Record, transcribe, and study smarter

> A web app for recording lectures with real-time transcription, AI-powered note-taking, and gamified study tools. Built with React, Convex, and Claude AI.

---

## Current Status: v4.6 — Phase 3 (Learn)

| Phase | Name | Status |
|-------|------|--------|
| **1** | **Capture** — Recording + Live Transcription | Complete |
| **2** | **Process** — Notes Editor + AI Generation | Complete |
| **3** | **Learn** — Study Tools + Productivity | In Progress (AI tools done, StudyQuest pending) |
| **4** | **Connect** — Social + Study Rooms + Games | Not Started |

See **[Phase Implementation Guide](PHASES.md)** for detailed feature checklists.

---

## Features

### Recording & Transcription (Phase 1)
- Audio recording with device selection
- Real-time transcription via AssemblyAI
- Pause/resume recording with timestamps
- Audio playback synced to transcript (click-to-seek)
- Lecture type selection (STEM, Humanities, Discussion, Lab, Review, General)
- Session management with trash system (30-day retention)
- File upload + transcription for pre-recorded audio

### Notes Editor (Phase 2)
- TipTap rich text editor with full formatting toolbar
- Inline Excalidraw diagrams (lazy-loaded, drag/resize)
- Draggable/resizable images and textboxes (interact.js)
- AI note generation from transcript (lecture-type-aware prompts)
- Smart auto-save (750ms debounce + Cmd+S manual)

### AI Features (Phase 2-3)
- **Nugget's Notes** — Real-time AI bullet points during recording (two-model pipeline: Sonnet context + Haiku notes)
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

### UI
- 6 themes with glassmorphism effects (frosted glass panels, gradient backgrounds, glow accents)
- Mobile-responsive layout
- Resizable panels (Notes / Recording)

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
| **Drag/Resize** | interact.js | 1.10 |
| **Transcription** | AssemblyAI | Real-time WebSocket |
| **AI** | Anthropic Claude (Sonnet 4.5 + Haiku 4.5) | |
| **Linting** | Biome | 1.9+ |
| **Pre-commit** | Husky + lint-staged | |

---

## Project Structure

```
ScribeCat-v3/
├── convex/                    # Convex backend
│   ├── schema.ts             # Database schema (7 tables)
│   ├── sessions.ts           # Session CRUD
│   ├── ai.ts                 # AI note generation action
│   ├── nuggetNotes.ts        # Real-time Haiku note generation
│   ├── nuggetChat.ts         # AI chat endpoint
│   ├── lectureContext.ts     # Sonnet context extraction
│   ├── studyTools.ts         # Study tool AI actions
│   ├── studyToolPrompts.ts   # Study tool prompt templates
│   ├── prompts.ts            # Note generation prompts by lecture type
│   ├── citations.ts          # Citation parser
│   ├── audioStorage.ts       # Audio file storage
│   ├── transcription.ts      # AssemblyAI token generation
│   ├── productivity.ts       # Goals, streaks, achievements
│   ├── crons.ts              # Scheduled jobs (trash cleanup)
│   ├── http.ts               # HTTP action routes
│   └── auth.config.ts        # Clerk auth config
├── src/
│   └── renderer/             # React app
│       ├── App.tsx           # Root with Clerk auth gates
│       ├── index.tsx         # Entry point (Clerk + Convex providers)
│       ├── components/
│       │   ├── home-view.tsx         # Recording mode
│       │   ├── study-view.tsx        # Study mode
│       │   ├── recording-panel.tsx   # Audio recording + transcript
│       │   ├── notes-panel.tsx       # TipTap editor + AI generation
│       │   ├── study-content.tsx     # Study content viewer
│       │   ├── nugget-notes-panel.tsx # Real-time AI notes
│       │   ├── nugget-chat.tsx       # AI chat drawer
│       │   ├── recordings-sidebar.tsx # Session list
│       │   ├── top-bar.tsx           # Navigation + theme
│       │   ├── settings-modal.tsx    # User settings
│       │   ├── editor-toolbar.tsx    # TipTap formatting toolbar
│       │   ├── live-transcript.tsx   # Real-time transcript display
│       │   ├── lecture-type-select.tsx # Lecture type dropdown
│       │   ├── audio-waveform.tsx    # Waveform visualization
│       │   ├── file-upload-transcribe.tsx # File upload
│       │   ├── theme-provider.tsx    # Theme context
│       │   ├── study-tools/          # 7 AI study tool components
│       │   └── ui/                   # shadcn/ui components
│       ├── hooks/
│       │   ├── use-audio-recorder.ts   # Audio recording logic
│       │   ├── use-audio-player.ts     # Audio playback
│       │   ├── use-transcription.ts    # AssemblyAI integration
│       │   ├── use-nugget-notes.ts     # Two-model AI pipeline
│       │   ├── use-sessions.ts         # Session CRUD hook
│       │   ├── use-productivity.ts     # Goals + streaks
│       │   └── use-debounced-callback.ts
│       ├── lib/
│       │   ├── markdown-to-tiptap.ts   # MD → TipTap converter
│       │   ├── citation-mark.ts        # TipTap citation extension
│       │   ├── excalidraw-extension.tsx # TipTap Excalidraw block
│       │   ├── draggable-image-extension.tsx
│       │   ├── textbox-extension.tsx
│       │   ├── font-size-extension.ts
│       │   └── utils.ts
│       ├── types/
│       │   └── study-tools.ts
│       └── styles/
│           └── globals.css           # Tailwind + theme CSS
├── public/                    # Static assets
├── docs/                      # Documentation
├── .github/agents/            # GitHub Copilot agent configs
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

---

## License

MIT
