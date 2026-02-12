## About This Project

ScribeCat v3 is the ADHD-friendly lecture companion app — a **pure web app**.

**What it does:** Recording + transcription -> AI notes -> Study tools -> Collaborative studying

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4 + shadcn/ui, TipTap editor, Excalidraw diagrams, Convex backend, Clerk auth, AssemblyAI transcription, Claude AI

**Current Version:** 4.6.12 | **Current Phase:** 3 (Learn) — AI study tools complete, StudyQuest pending

---

## Core Philosophy

- **NO BANDAID FIXES** — Only root cause solutions
- **COMPLETE ALL TASKS** — No loose ends, no "the rest follows the same pattern"
- **EACH PHASE = WORKING APP** — Fully functional at all times

---

## Tech Stack Details

| Layer | Technology | Notes |
|-------|------------|-------|
| **UI** | React 19 | Functional components + hooks |
| **Styling** | Tailwind CSS 4 + shadcn/ui | CSS variables for theming, glassmorphism |
| **Build** | Vite 7 | Dev server on port 5173 |
| **State/Backend** | Convex 1.31+ | Realtime-first, TypeScript-native |
| **Auth** | Clerk + Convex | @udel.edu restriction, JWT integration |
| **Rich Text** | TipTap 3.14 | 15+ extensions, ProseMirror-based |
| **Diagrams** | Excalidraw 0.18 | Lazy-loaded React component |
| **Drag/Resize** | interact.js 1.10 | For editor objects |
| **Transcription** | AssemblyAI | Real-time WebSocket STT |
| **AI** | Anthropic Claude | Sonnet 4.5 + Haiku 4.5 |
| **Linting/Formatting** | Biome 1.9 | Fast, all-in-one |
| **Pre-commit hooks** | Husky + lint-staged | Prevents bad commits |

---

## Project Structure

```
ScribeCat-v3/
├── convex/                    # Convex backend (server-side)
│   ├── schema.ts             # Database schema (7 tables)
│   ├── sessions.ts           # Session CRUD queries/mutations
│   ├── ai.ts                 # AI note generation action
│   ├── nuggetNotes.ts        # Real-time Haiku note generation (HTTP action)
│   ├── nuggetChat.ts         # AI chat endpoint (HTTP action)
│   ├── lectureContext.ts     # Sonnet context extraction (HTTP action)
│   ├── studyTools.ts         # Study tool AI actions
│   ├── studyToolPrompts.ts   # Study tool prompt templates
│   ├── prompts.ts            # Note generation prompts by lecture type
│   ├── citations.ts          # Citation parser
│   ├── audioStorage.ts       # Audio file upload/storage
│   ├── transcription.ts      # AssemblyAI token generation
│   ├── productivity.ts       # Goals, streaks, achievements
│   ├── crons.ts              # Scheduled jobs (trash cleanup)
│   ├── http.ts               # HTTP action routes
│   └── auth.config.ts        # Clerk JWT config
├── src/renderer/              # React app
│   ├── App.tsx               # Root with Clerk auth gates
│   ├── index.tsx             # Entry point (Clerk + Convex providers)
│   ├── components/           # UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities + TipTap extensions
│   ├── types/                # TypeScript types
│   └── styles/               # Tailwind + theme CSS
├── biome.json                 # Linting config
├── vite.config.ts             # Build config
└── tsconfig.json              # TypeScript strict config
```

---

## Database Schema (Convex)

7 tables: `sessions`, `userSettings`, `studyStats`, `achievements`, `studyToolResults`, `flashcardProgress`, `quizAttempts`, `chatHistory`

---

## Auth System

Clerk with ConvexProviderWithClerk. User ID from Clerk JWT, validated by Convex via `auth.config.ts`.

---

## Code Standards

- **TypeScript strict mode** — `"strict": true`, no `any` types ever
- **Biome** — Single quotes, semicolons always, 2-space indent, 100 char line width
- **Max 500 lines per file**, single responsibility
- **Naming:** Components `PascalCase.tsx` (files `kebab-case.tsx`), hooks `use-kebab-case.ts`, Convex functions `camelCase`
- **Before every commit:** Update version in package.json (semver), Husky runs Biome automatically

---

## Build Commands

```bash
pnpm dev              # Vite dev server
pnpm convex:dev       # Convex backend
pnpm build            # Production build
pnpm compile          # TypeScript check only
pnpm lint             # Biome check
pnpm lint:fix         # Auto-fix
```

---

## Git Workflow

Commit format: `v4.6.12: Brief description of change`

Version bumping: Patch = bug fixes, Minor = new features, Major = breaking changes
