# Claude Code Instructions for ScribeCat v3

## Project Overview

This is a Vite + React + Convex + TypeScript project using pnpm. After modifying dependencies or moving packages between deps/devDeps, always run `pnpm install` to regenerate the lockfile before committing.

---

## About This Project

ScribeCat v3 is the ADHD-friendly lecture companion app — a **pure web app** deployed on Vercel.

**What it does:** Recording + transcription -> AI notes -> Study tools -> Collaborative studying

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4 + shadcn/ui, TipTap editor, Excalidraw diagrams, Convex backend, Clerk auth, AssemblyAI transcription, Claude AI

**Current Version:** 4.12.1 | **Current Phase:** 4 (Connect) — Friends system complete, messaging next

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
| **Routing** | TanStack Router 1.x | URL-based routing with type-safe params |
| **Drag/Resize** | interact.js 1.10 | For editor objects |
| **Transcription** | AssemblyAI | Real-time WebSocket STT |
| **AI** | Anthropic Claude | Haiku 4.5 (all endpoints, centralized in `convex/config.ts`) |
| **Linting/Formatting** | Biome 1.9 | Fast, all-in-one |
| **Pre-commit hooks** | Husky + lint-staged | Prevents bad commits |

---

## Project Structure

```
ScribeCat-v3/
├── convex/                    # Convex backend (server-side)
│   ├── schema.ts             # Database schema (12 tables)
│   ├── authHelpers.ts        # Shared auth helpers (requireAuth, requireAuthWithProfile)
│   ├── sessions.ts           # Session CRUD queries/mutations
│   ├── ai.ts                 # AI note generation (Convex action)
│   ├── generateNotes.ts      # AI note generation (HTTP action)
│   ├── nuggetNotes.ts        # Real-time note generation (HTTP action)
│   ├── nuggetChat.ts         # AI chat endpoint (HTTP action)
│   ├── lectureContext.ts     # Context extraction (HTTP action)
│   ├── studyTools.ts         # Study tool AI actions
│   ├── studyToolPrompts.ts   # Study tool prompt templates
│   ├── prompts.ts            # Note generation prompts by lecture type
│   ├── citations.ts          # Citation parser for [cite:XXXXX] patterns
│   ├── config.ts             # Shared AI model configuration
│   ├── audioStorage.ts       # Audio file upload/storage
│   ├── uploadImage.ts        # Image upload handler
│   ├── transcription.ts      # AssemblyAI token generation
│   ├── productivity.ts       # Goals, streaks, achievements
│   ├── studyQuest.ts         # Cat companion queries/mutations
│   ├── xpUtils.ts            # XP/level math functions
│   ├── userProfiles.ts       # User profiles + username search
│   ├── friends.ts            # Friend requests + friend list
│   ├── blocks.ts             # Block/unblock users
│   ├── crons.ts              # Scheduled jobs (trash cleanup)
│   ├── http.ts               # HTTP action routes
│   ├── auth.config.ts        # Clerk JWT config
│   └── _generated/           # Auto-generated types (DO NOT EDIT)
├── src/
│   └── renderer/             # React app
│       ├── App.tsx           # Root with Clerk auth gates
│       ├── index.tsx         # Entry point (Clerk + Convex providers)
│       ├── router.tsx        # TanStack Router config (routes + type registration)
│       ├── contexts/
│       │   └── session-context.tsx   # App-wide session/recording/chat state
│       ├── components/
│       │   ├── app-layout.tsx        # Root layout (TopBar + Outlet + NuggetChat)
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
│       │   ├── study-tools/          # 6 AI study tool components
│       │   │   ├── index.tsx         # Study tools container
│       │   │   ├── summary-tool.tsx
│       │   │   ├── key-concepts-tool.tsx
│       │   │   ├── flashcard-tool.tsx
│       │   │   ├── quiz-tool.tsx
│       │   │   ├── concept-map-tool.tsx
│       │   │   ├── eli5-tool.tsx
│       │   │   ├── generate-button.tsx
│       │   │   └── use-study-tool.ts # Shared hook for tool generation
│       │   ├── study-quest/          # StudyQuest cat companion
│       │   │   ├── study-quest-widget.tsx  # Floating widget (adopt, collapsed, expanded)
│       │   │   ├── cat-display.tsx         # Sprite sheet animation renderer
│       │   │   ├── cat-sprites.ts          # Sprite config, mood mapping, variant list
│       │   │   ├── xp-progress.tsx         # Level badge + XP bar + recent gains
│       │   │   └── cat-name-editor.tsx     # Inline-editable cat name
│       │   ├── friends/              # Friends system (Phase 4)
│       │   │   ├── friends-view.tsx         # Main /friends page with tabs
│       │   │   ├── friends-list.tsx         # Friends tab content
│       │   │   ├── friend-requests.tsx      # Requests tab (incoming + sent)
│       │   │   ├── user-search.tsx          # Search tab with username lookup
│       │   │   ├── user-card.tsx            # Reusable user display card
│       │   │   └── username-setup-modal.tsx # First-time @username creation
│       │   └── ui/                   # shadcn/ui components
│       ├── hooks/
│       │   ├── use-audio-recorder.ts   # MediaRecorder wrapper
│       │   ├── use-audio-player.ts     # Audio playback + seeking
│       │   ├── use-transcription.ts    # AssemblyAI WebSocket
│       │   ├── use-nugget-notes.ts     # Two-model AI pipeline orchestrator
│       │   ├── use-sessions.ts         # Session CRUD hook
│       │   ├── use-productivity.ts     # Goals + streaks + achievements
│       │   ├── use-study-quest.ts     # Cat companion state + mood + actions
│       │   ├── use-user-profile.ts    # User profile + username setup
│       │   ├── use-friends.ts         # Friends queries + mutations
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
│       │   ├── study-tools.ts
│       │   └── friends.ts
│       └── styles/
│           └── globals.css           # Tailwind imports + 6 theme definitions
├── public/                    # Static assets
│   └── cats/                 # 11 cat variant sprite sheets (32×32 pixel art)
├── docs/                      # Documentation
│   ├── README.md             # Project README (features, setup, tech stack)
│   ├── PHASES.md             # Phase implementation guide
│   ├── NOTION-INSPIRED-FEATURES.md
│   └── nugget-integration-handoff.md
├── .github/                   # GitHub config
│   ├── agents/               # Copilot agent configs (Brainstorm, Explain Error)
│   └── instructions/         # Copilot instructions
├── biome.json                 # Biome linting/formatting config
├── vite.config.ts             # Vite build config
├── tsconfig.json              # TypeScript strict config
├── .env.example               # Environment variable template
└── .env.local                 # Local environment variables (gitignored)
```

---

## Database Schema (Convex)

12 tables in `convex/schema.ts`:

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
| `catCompanion` | StudyQuest cat (name, variant, XP, level, mood, recent gains) |
| `userProfiles` | Public identity (@username, display name, avatar) |
| `friendships` | Friend requests + accepted friends (status, requester/receiver) |
| `blocks` | Blocked users (asymmetric, persists independently) |

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

All AI endpoints use **Haiku 4.5** via centralized `AI_MODEL` in `convex/config.ts`.

### Two-Step Pipeline (Nugget's Notes)
During recording, two steps run at different intervals:

| Step | Role | Frequency | File |
|------|------|-----------|------|
| Context Extraction | Extracts themes, topics, definitions | Every ~2 min / 200 words | `convex/lectureContext.ts` |
| Note Generation | Writes 1-3 bullet notes using context | Every ~45s / 30 words | `convex/nuggetNotes.ts` |

Orchestrated by `src/renderer/hooks/use-nugget-notes.ts`.

### Full Note Generation
Post-recording or on-demand via "Generate Notes" button:
- Uses `convex/ai.ts` (Convex action) or `convex/generateNotes.ts` (HTTP action)
- Supports dual-input synthesis (user's existing notes + transcript)
- Lecture-type-aware prompts from `convex/prompts.ts`
- Outputs markdown, converted to TipTap JSON by `lib/markdown-to-tiptap.ts`

### Study Tools
6 tools in `convex/studyTools.ts` with prompts in `convex/studyToolPrompts.ts`:
- Summary, Key Concepts, Flashcards, Quiz, Concept Map, ELI5

### Nugget Chat
Separate app-level AI chat (`src/renderer/components/nugget-chat.tsx`):
- Persistent per-session chat history (stored in `chatHistory` table)
- Context-aware (transcript + notes)
- Backend: `convex/nuggetChat.ts`

---

## StudyQuest (Cat Companion)

Tamagotchi-style pixel art cat with XP/leveling tied to study activity.

### Architecture
| Layer | File | Role |
|-------|------|------|
| **XP Math** | `convex/xpUtils.ts` + `src/shared/xp-utils.ts` | Quadratic curve: `50 * L * (L+1)` |
| **Backend** | `convex/studyQuest.ts` | Queries, mutations, `awardXpHelper` |
| **XP Integration** | `convex/productivity.ts`, `convex/studyTools.ts` | Award XP on study time, tool use |
| **Hook** | `src/renderer/hooks/use-study-quest.ts` | State, mood resolution, actions |
| **Sprites** | `src/renderer/components/study-quest/cat-sprites.ts` | Config, mood→animation mapping |
| **Renderer** | `src/renderer/components/study-quest/cat-display.tsx` | Sprite sheet animation via `background-position` |
| **Widget** | `src/renderer/components/study-quest/study-quest-widget.tsx` | Floating bottom-left UI |

### XP Sources
| Source | Amount |
|--------|--------|
| Study time | 2 XP/min |
| Session complete | +25 XP |
| Daily goal met | +50 XP |
| Study tool use | +10 XP |
| Achievement unlock | +30 XP |

### Cat Variants
11 variants with 8 sprite animations each (32×32 frames in horizontal PNG strips):
- bengal, black, demon, egypt, grey, siamese, tricolor, vampire, white, wizard, xmas

### Mood System
Priority-based client-side resolution: excited > happy > studying > sleepy > idle. Derived from `isRecording`, `lastActivityAt`, stored mood, and current hour.

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

## Build & Quality

After every implementation, run `pnpm build` and fix any TypeScript/Biome errors before committing. Never commit code that doesn't compile clean.

When editing a file, always check if removed imports/exports/fields are used elsewhere in the codebase before deleting them. Use Grep to verify no other references exist.

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
- Convex files: `camelCase.ts` (Convex does NOT allow hyphens in module paths — only alphanumeric, underscores, periods)
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
v4.9.1: Brief description of change
```

### Version Bumping
- **Patch** (4.9.1 -> 4.9.2): Bug fixes
- **Minor** (4.9.1 -> 4.10.0): New features
- **Major** (4.9.1 -> 5.0.0): Breaking changes / phase completion

### Before Committing
1. `pnpm clean && pnpm build` passes
2. Test the feature manually
3. Update version in package.json
4. Commit with version in message

### After Completing Changes
After completing all changes, always commit and push to main unless explicitly told otherwise. Use conventional commit messages with version bumps when appropriate (e.g., `v4.10.0: Add flashcard spaced repetition`).

---

## Communication

When fixing bugs, carefully re-read the user's request to understand the exact domain (e.g., "input modality" vs "error type", "code work" vs "content"). If ambiguous, ask for clarification before implementing.

---

## Documentation

When updating documentation or performing audits, always check ALL subdirectories (especially `docs/`, `docs/subdirs/`) in a single pass. Do not wait for the user to remind you about missed directories.

---

## Styling & Theming

When implementing CSS changes involving colors or theming, never wrap raw hex values in `hsl()` — check the existing pattern in `src/renderer/styles/globals.css` for how CSS variables and color values are used in the project before applying changes.

---

## Remember

You're helping a busy ADHD student who's juggling school, work, and this passion project. Be:
- **Clear** — no ambiguity
- **Actionable** — tell them what to do
- **Supportive** — small wins matter
- **Thorough** — finish what you start

Fix things properly the first time. Complete every task fully. Ship working software.
