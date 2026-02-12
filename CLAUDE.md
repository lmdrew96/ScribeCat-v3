# Claude Code Instructions for ScribeCat v3

## About This Project

ScribeCat v3 is the ADHD-friendly lecture companion app — a **pure web app** deployed on Vercel.

**What it does:** Recording + transcription -> AI notes -> Study tools -> Collaborative studying

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4 + shadcn/ui, TipTap editor, Excalidraw diagrams, Convex backend, Clerk auth, AssemblyAI transcription, Claude AI

**Current Version:** 4.6.12 | **Current Phase:** 3 (Learn) — AI study tools complete, StudyQuest pending

**Previous Version:** https://github.com/lmdrew96/scribecat-v2 (reference only — do NOT copy-paste code)

---

## Core Philosophy

### NO BANDAID FIXES — ONLY ROOT CAUSE SOLUTIONS

If something's broken, fix it properly. Don't patch over symptoms.

| BAD | GOOD |
|-----|------|
| "Let's add a try-catch to hide that error" | "That error means X is misconfigured. Let's fix the config." |
| "Just restart the service when it fails" | "The service fails because of Y. Let's fix Y." |
| "Add a timeout to work around the race condition" | "There's a race condition between A and B. Let's fix the sequencing." |

### COMPLETE ALL ASPECTS OF EVERY PLAN

When given a task, execute it fully. No loose ends. No "the rest follows the same pattern."

### EACH PHASE = WORKING APP

This project is built in phases. At the end of each phase, the app must be **fully functional** for what's been built so far.

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
│   ├── ai.ts                 # AI note generation (Convex action)
│   ├── nuggetNotes.ts        # Real-time Haiku note generation (HTTP action)
│   ├── nuggetChat.ts         # AI chat endpoint (HTTP action)
│   ├── lectureContext.ts     # Sonnet context extraction (HTTP action)
│   ├── studyTools.ts         # Study tool AI actions
│   ├── studyToolPrompts.ts   # Study tool prompt templates
│   ├── prompts.ts            # Note generation prompts by lecture type
│   ├── citations.ts          # Citation parser for [cite:XXXXX] patterns
│   ├── audioStorage.ts       # Audio file upload/storage
│   ├── transcription.ts      # AssemblyAI token generation
│   ├── productivity.ts       # Goals, streaks, achievements
│   ├── crons.ts              # Scheduled jobs (trash cleanup)
│   ├── http.ts               # HTTP action routes
│   ├── auth.config.ts        # Clerk JWT config
│   └── _generated/           # Auto-generated types (DO NOT EDIT)
├── src/
│   └── renderer/             # React app
│       ├── App.tsx           # Root with Clerk auth gates
│       ├── index.tsx         # Entry point (Clerk + Convex providers)
│       ├── components/
│       │   ├── home-view.tsx         # Recording mode (main view)
│       │   ├── study-view.tsx        # Study mode (sessions + tools)
│       │   ├── recording-panel.tsx   # Audio recording + transcript + nugget notes
│       │   ├── notes-panel.tsx       # TipTap editor + AI generation
│       │   ├── study-content.tsx     # Study content viewer (notes + transcript + tools)
│       │   ├── nugget-notes-panel.tsx # Real-time AI note bubbles
│       │   ├── nugget-chat.tsx       # AI chat drawer
│       │   ├── recordings-sidebar.tsx # Session list + trash
│       │   ├── top-bar.tsx           # Navigation + theme selector
│       │   ├── settings-modal.tsx    # User settings (goals, breaks, themes)
│       │   ├── editor-toolbar.tsx    # TipTap formatting toolbar
│       │   ├── live-transcript.tsx   # Real-time transcript display
│       │   ├── lecture-type-select.tsx # Lecture type dropdown
│       │   ├── audio-waveform.tsx    # Waveform visualization
│       │   ├── file-upload-transcribe.tsx # File upload + transcription
│       │   ├── theme-provider.tsx    # Theme context provider
│       │   ├── study-tools/          # 7 AI study tool components
│       │   │   ├── index.tsx         # Study tools container
│       │   │   ├── summary-tool.tsx
│       │   │   ├── key-concepts-tool.tsx
│       │   │   ├── flashcard-tool.tsx
│       │   │   ├── quiz-tool.tsx
│       │   │   ├── concept-map-tool.tsx
│       │   │   ├── eli5-tool.tsx
│       │   │   ├── generate-button.tsx
│       │   │   └── use-study-tool.ts # Shared hook for tool generation
│       │   └── ui/                   # shadcn/ui components
│       ├── hooks/
│       │   ├── use-audio-recorder.ts   # MediaRecorder wrapper
│       │   ├── use-audio-player.ts     # Audio playback + seeking
│       │   ├── use-transcription.ts    # AssemblyAI WebSocket
│       │   ├── use-nugget-notes.ts     # Two-model AI pipeline orchestrator
│       │   ├── use-sessions.ts         # Session CRUD hook
│       │   ├── use-productivity.ts     # Goals + streaks + achievements
│       │   ├── use-debounced-callback.ts
│       │   └── use-is-mobile.ts
│       ├── lib/
│       │   ├── markdown-to-tiptap.ts   # MD -> TipTap JSON converter
│       │   ├── citation-mark.ts        # TipTap citation mark extension
│       │   ├── excalidraw-extension.tsx # TipTap Excalidraw node
│       │   ├── draggable-image-extension.tsx
│       │   ├── textbox-extension.tsx
│       │   ├── font-size-extension.ts
│       │   └── utils.ts               # cn() helper
│       ├── types/
│       │   └── study-tools.ts
│       └── styles/
│           └── globals.css           # Tailwind imports + 6 theme definitions
├── public/                    # Static assets
├── docs/                      # Documentation
│   ├── PHASES.md             # Phase implementation guide
│   ├── NOTION-INSPIRED-FEATURES.md
│   └── nugget-integration-handoff.md
├── biome.json                 # Biome linting/formatting config
├── vite.config.ts             # Vite build config
├── tsconfig.json              # TypeScript strict config
├── .env.example               # Environment variable template
└── .env.local                 # Local environment variables (gitignored)
```

---

## Database Schema (Convex)

7 tables in `convex/schema.ts`:

| Table | Purpose |
|-------|---------|
| `sessions` | Recording sessions (audio, transcript, notes, lecture type) |
| `userSettings` | Theme, break reminders, study goals |
| `studyStats` | Daily study minutes, session counts, goal tracking |
| `achievements` | Unlocked achievement tracking |
| `studyToolResults` | Cached AI study tool output per session |
| `flashcardProgress` | Spaced repetition tracking per card |
| `quizAttempts` | Quiz answer history and scores |
| `chatHistory` | Persistent per-session Nugget Chat messages |

---

## Environment Variables

**Local `.env.local`** (client-side, VITE_ prefix):
```
VITE_CONVEX_URL=              # From `npx convex dev`
VITE_CLERK_PUBLISHABLE_KEY=   # From Clerk dashboard
```

**Convex Dashboard** (server-side):
```
ASSEMBLYAI_API_KEY=           # Real-time transcription
ANTHROPIC_API_KEY=            # AI note generation + study tools
CLERK_JWT_ISSUER_DOMAIN=      # Clerk JWT validation
```

---

## Phase Development

**See `/docs/PHASES.md` for the current phase, feature checklists, and acceptance criteria.**

This project is built in 4 phases:
1. **Capture** — Recording + transcription (COMPLETE)
2. **Process** — Notes editor + AI generation (COMPLETE)
3. **Learn** — Study tools + StudyQuest (IN PROGRESS — AI tools done, StudyQuest pending)
4. **Connect** — Social + Study Rooms + Games (NOT STARTED)

Always check PHASES.md before starting work to know what's in scope.

---

## Convex Patterns

### Query Pattern
```typescript
import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .order('desc')
      .collect();
  },
});
```

### Mutation Pattern
```typescript
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
  args: { userId: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('sessions', {
      ...args,
      duration: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  },
});
```

### HTTP Action Pattern (for AI endpoints)
```typescript
import { httpAction } from './_generated/server';

export const generateNotes = httpAction(async (ctx, request) => {
  const { transcript, lectureType } = await request.json();
  // ... call Anthropic API
  return new Response(JSON.stringify({ notes }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Using in React
```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

function SessionList() {
  const sessions = useQuery(api.sessions.list, { userId });
  const createSession = useMutation(api.sessions.create);

  if (!sessions) return <Loading />;
  return sessions.map((s) => <SessionCard key={s._id} session={s} />);
}
```

---

## Auth System (Clerk)

Authentication uses **Clerk** with the **ConvexProviderWithClerk** integration.

```typescript
// src/renderer/index.tsx — provider setup
<ClerkProvider publishableKey={clerkPubKey}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

```typescript
// src/renderer/App.tsx — auth gates
<AuthLoading>...</AuthLoading>
<Unauthenticated><SignIn /></Unauthenticated>
<Authenticated><AuthenticatedApp /></Authenticated>
```

User ID comes from Clerk's JWT, validated by Convex via `auth.config.ts`.

---

## AI Architecture

### Two-Model Pipeline (Nugget's Notes)
During recording, two models work together:

| Model | Role | Frequency | File |
|-------|------|-----------|------|
| **Sonnet 4.5** | Context Analyzer | Every ~2 min / 200 words | `convex/lectureContext.ts` |
| **Haiku 4.5** | Note Writer | Every ~45s / 30 words | `convex/nuggetNotes.ts` |

Orchestrated by `src/renderer/hooks/use-nugget-notes.ts`.

### Full Note Generation
Post-recording or on-demand via "Generate Notes" button:
- Uses Sonnet 4.5 via `convex/ai.ts`
- Lecture-type-aware prompts from `convex/prompts.ts`
- Outputs markdown, converted to TipTap JSON by `lib/markdown-to-tiptap.ts`

### Study Tools
7 tools in `convex/studyTools.ts` with prompts in `convex/studyToolPrompts.ts`:
- Summary, Key Concepts, Flashcards, Quiz, Concept Map, ELI5, Chat

---

## Theme System

6 themes defined via CSS variables in `src/renderer/styles/globals.css`:

1. **Nugg's Favorite** (default)
2. **Purring Pastels** — light, muted pastels
3. **Void Kitty** — true dark, high contrast
4. **Chaos Cat** — fun wildcard
5. **High Contrast Dark** — accessibility
6. **High Contrast Light** — accessibility

All themes include glassmorphism effects (frosted glass panels, gradient backgrounds, glow accents).

Theme switching via `ThemeProvider` context (`src/renderer/components/theme-provider.tsx`).

---

## How to Communicate with Nae

### Lead with ACTION, then explain WHY
```
GOOD: "Run `pnpm build` to compile. This ensures TypeScript catches errors."
BAD:  "You might want to consider building the project..."
```

### No Decision Paralysis
- Max 2-3 options
- **Always recommend ONE** with reasoning
- "Use Option A because X is your priority"

### Keep It Simple
- 3-5 concrete steps max
- Code examples > long explanations
- Pivot quickly if something isn't working

### Never Do This
- Dump 5+ options without a recommendation
- Use vague language like "you could try..."
- Suggest bandaid fixes
- Leave tasks partially done
- Over-explain when action is needed

---

## Build Commands

```bash
# Development
pnpm dev              # Vite dev server (requires convex:dev running)
pnpm convex:dev       # Start Convex backend

# Building
pnpm build            # Production build (Vite)
pnpm compile          # TypeScript type-checking only (tsc --noEmit)
pnpm clean            # Delete dist/ folder

# Code Quality (runs automatically on commit via Husky)
pnpm lint             # Check with Biome
pnpm lint:fix         # Auto-fix issues
pnpm format           # Format all files

# Deployment
pnpm convex:deploy    # Deploy Convex to production
```

**Always run `pnpm clean` before building if something seems broken.**

---

## Code Standards

### TypeScript — STRICT MODE IS NON-NEGOTIABLE
- `"strict": true` in tsconfig.json — already configured
- **NEVER use `any`** — Biome will block commits that contain `any`
- Use Convex's type generation (`npx convex codegen`)
- If you don't know the type, use `unknown` and narrow it

```typescript
// BAD — will be blocked by Biome
function process(data: any) { ... }

// GOOD — proper typing
function process(data: TranscriptSegment) { ... }

// ACCEPTABLE — unknown with narrowing
function process(data: unknown) {
  if (isTranscriptSegment(data)) { ... }
}
```

### Biome Config
- Single quotes, semicolons always, 2-space indent, 100 char line width
- Ignores: `node_modules`, `dist`, `convex/_generated`, config files
- `noExplicitAny: "error"`, `noArrayIndexKey: "warn"`, `noNonNullAssertion: "warn"`

### Files
- Max 500 lines per file
- Single responsibility
- Co-locate related code

### Components
- Functional components + hooks
- Props interfaces defined
- Error boundaries for major sections

### Naming
- Components: `PascalCase.tsx` (but file names are `kebab-case.tsx`)
- Hooks: `use-kebab-case.ts`
- Utils: `camelCase.ts`
- Convex functions: `camelCase`

### Before **Every** Commit
- Update the version number in package.json applying semantic versioning
- Husky will automatically run, but you can manually check:
  ```bash
  pnpm lint        # Check for issues
  pnpm lint:fix    # Auto-fix what's fixable
  ```

---

## Debugging Tips

### Browser DevTools
- Open: Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)
- Check Console for Convex query errors, auth issues

### Convex Dashboard
- View data, run queries, check function logs
- `npx convex dashboard`

### Common Issues
| Problem | Solution |
|---------|----------|
| Convex not connecting | Check `pnpm convex:dev` is running |
| Types out of sync | Run `npx convex codegen` |
| Build fails mysteriously | `pnpm clean` then rebuild |
| Audio not working | Check browser microphone permissions |
| Auth not working | Check VITE_CLERK_PUBLISHABLE_KEY in .env.local |
| AI actions failing | Check ANTHROPIC_API_KEY in Convex dashboard env vars |

---

## Git Workflow

### Commit Format
```
v4.6.12: Brief description of change
```

### Version Bumping
- **Patch** (4.6.12 -> 4.6.13): Bug fixes
- **Minor** (4.6.12 -> 4.7.0): New features
- **Major** (4.6.12 -> 5.0.0): Breaking changes / phase completion

### Before Committing
1. `pnpm clean && pnpm build` passes
2. Test the feature manually
3. Update version in package.json
4. Commit with version in message

---

## Remember

You're helping a busy ADHD student who's juggling school, work, and this passion project. Be:
- **Clear** — no ambiguity
- **Actionable** — tell them what to do
- **Supportive** — small wins matter
- **Thorough** — finish what you start

Fix things properly the first time. Complete every task fully. Ship working software.
