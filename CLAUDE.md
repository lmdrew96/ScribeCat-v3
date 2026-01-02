# Claude Code Instructions for ScribeCat v3

## About This Project

ScribeCat v3 is a **complete rebuild** of the ADHD-friendly lecture companion app.

**What it does:** Recording + transcription → AI notes → Study tools → Collaborative studying

**Tech Stack:** Electron + React, TypeScript, Tailwind + shadcn/ui, TipTap editor, Excalidraw diagrams, Convex backend, AssemblyAI transcription, Claude AI

**Previous Version:** https://github.com/lmdrew96/scribecat-v2 (reference only — do NOT copy-paste code)

---

## Core Philosophy

### 🚨 NO BANDAID FIXES — ONLY ROOT CAUSE SOLUTIONS

If something's broken, fix it properly. Don't patch over symptoms.

| ❌ BAD | ✅ GOOD |
|--------|---------|
| "Let's add a try-catch to hide that error" | "That error means X is misconfigured. Let's fix the config." |
| "Just restart the service when it fails" | "The service fails because of Y. Let's fix Y." |
| "Add a timeout to work around the race condition" | "There's a race condition between A and B. Let's fix the sequencing." |

### 🚨 COMPLETE ALL ASPECTS OF EVERY PLAN

When given a task, execute it fully. No loose ends. No "the rest follows the same pattern."

| ❌ BAD | ✅ GOOD |
|--------|---------|
| Implementing 3 of 5 planned functions | Implementing all 5 functions completely |
| Creating a component without styles or integration | Delivering the complete, working feature |
| "I'll wire up the backend later" | Feature works end-to-end before moving on |

### 🚨 EACH PHASE = WORKING APP

This project is built in phases. At the end of each phase, the app must be **fully functional** for what's been built so far. No "we'll connect it later."

---

## Tech Stack Details

| Layer | Technology | Notes |
|-------|------------|-------|
| **Desktop** | Electron | Main process + renderer |
| **UI** | React | v0-generated components |
| **Styling** | Tailwind CSS + shadcn/ui | CSS variables for theming |
| **State/Backend** | Convex | Realtime-first, TypeScript-native |
| **Rich Text** | TipTap | ProseMirror-based |
| **Diagrams** | Excalidraw | Embedded React component |
| **Drag/Resize** | interact.js | For editor objects |
| **Transcription** | AssemblyAI | Real-time STT |
| **AI** | Anthropic Claude | claude-sonnet-4-5-20250929 |
| **Auth** | Convex Auth | Built-in |
| **Linting/Formatting** | Biome | Fast, all-in-one |
| **Pre-commit hooks** | Husky + lint-staged | Prevents bad commits |

---

## Dev Tooling Setup

### MUST be configured at project init. Non-negotiable.

### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**No `any` types. Ever.** If you're tempted to use `any`, define a proper type or use `unknown` and narrow it.

---

### Biome (Linting + Formatting)

**Install:**
```bash
npm install --save-dev @biomejs/biome
npx biome init
```

**biome.json:**
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

**Add scripts to package.json:**
```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write ."
  }
}
```

---

### Husky + lint-staged (Pre-commit Hooks)

**This blocks commits if code doesn't pass checks.** Prevents broken code from ever entering the repo.

**Install:**
```bash
npm install --save-dev husky lint-staged
npx husky init
```

**Add to package.json:**
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "biome check --apply",
      "biome format --write"
    ]
  }
}
```

**Update .husky/pre-commit:**
```bash
npx lint-staged
```

**What this does:**
- Every time you commit, Husky runs
- lint-staged only checks files you're committing (fast!)
- Biome fixes what it can, fails if there are errors
- If it fails, commit is blocked until you fix the issues

---

### VS Code Integration (Optional but Recommended)

**.vscode/settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  }
}
```

**.vscode/extensions.json:**
```json
{
  "recommendations": ["biomejs.biome"]
}
```

---

## Project Structure

```
scribecat-v3/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # Entry point
│   │   └── ipc/              # IPC handlers
│   ├── preload/              # Context bridge (preload.ts)
│   ├── renderer/             # React app
│   │   ├── App.tsx           # Root component
│   │   ├── components/       # UI components
│   │   │   ├── editor/       # TipTap + Excalidraw integration
│   │   │   ├── recording/    # Audio capture + transcription UI
│   │   │   ├── study/        # Study tools UI
│   │   │   ├── social/       # Friends, rooms, chat, games
│   │   │   └── game/         # StudyQuest JRPG
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   └── styles/           # Tailwind config + theme CSS
│   └── convex/               # Convex schema + functions
├── convex/                   # Convex backend (if separate)
├── assets/                   # Images, sprites, audio
├── browser-extension/        # Canvas LMS integration
└── electron-builder.json     # Build config
```

---

## Phase Development

**See `/docs/PHASES.md` for the current phase, feature checklists, and acceptance criteria.**

This project is built in 4 phases:
1. **Capture** — Recording + transcription
2. **Process** — Notes editor + AI generation
3. **Learn** — Study tools + StudyQuest
4. **Connect** — Social + Study Rooms + Games

Always check PHASES.md before starting work to know what's in scope.

---

## Convex Patterns

### Schema Definition
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    userId: v.string(),
    title: v.string(),
    audioUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
    notes: v.optional(v.string()),
    duration: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
```

### Query Pattern
```typescript
// convex/sessions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();
  },
});
```

### Mutation Pattern
```typescript
// convex/sessions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { 
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      ...args,
      duration: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  },
});
```

### Using in React
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function SessionList({ userId }) {
  const sessions = useQuery(api.sessions.list, { userId });
  const createSession = useMutation(api.sessions.create);
  
  // sessions is undefined while loading, then array
  if (!sessions) return <Loading />;
  
  return sessions.map(s => <SessionCard key={s._id} session={s} />);
}
```

---

## TipTap Editor Setup

### Basic Configuration
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

const editor = useEditor({
  extensions: [
    StarterKit,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
  ],
  content: '',
  onUpdate: ({ editor }) => {
    // Auto-save here
    debouncedSave(editor.getHTML());
  },
});
```

### Auto-Save Pattern
```typescript
const debouncedSave = useMemo(
  () => debounce((content: string) => {
    saveNotes({ sessionId, content });
  }, 2000),
  [sessionId]
);
```

---

## Excalidraw Integration

### Embedding in Notes
```typescript
import { Excalidraw } from "@excalidraw/excalidraw";

function DiagramEditor({ initialData, onChange }) {
  return (
    <div style={{ height: "400px" }}>
      <Excalidraw
        initialData={initialData}
        onChange={(elements, state) => {
          onChange({ elements, state });
        }}
      />
    </div>
  );
}
```

### Storing Diagram Data
Excalidraw outputs JSON. Store it as a string in Convex:
```typescript
diagrams: defineTable({
  sessionId: v.id("sessions"),
  data: v.string(), // JSON.stringify({ elements, state })
  position: v.object({ x: v.number(), y: v.number() }),
  size: v.object({ width: v.number(), height: v.number() }),
})
```

---

## AssemblyAI Integration

### Real-Time Transcription Setup
```typescript
// Use AssemblyAI's real-time WebSocket
import { RealtimeTranscriber } from 'assemblyai';

const transcriber = new RealtimeTranscriber({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
  sampleRate: 16000,
});

transcriber.on('transcript', (transcript) => {
  if (transcript.message_type === 'FinalTranscript') {
    appendToTranscript(transcript.text);
  }
});

// Connect and stream audio
await transcriber.connect();
// ... stream audio chunks
```

### IPC Pattern for Audio
Audio capture happens in renderer (Web Audio API), but API keys stay in main process:
```typescript
// Main process: expose API key securely
ipcMain.handle('transcription:getToken', async () => {
  // Generate temporary token or return key securely
});

// Renderer: use token for WebSocket connection
const token = await window.electronAPI.getTranscriptionToken();
```

---

## Theme System

### CSS Variables Approach
```css
/* styles/themes.css */
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent: #e74c3c;
  --border: #3d3d3d;
}

[data-theme="soft-focus"] {
  --bg-primary: #faf8f5;
  --bg-secondary: #f0ebe3;
  --text-primary: #2d2d2d;
  --text-secondary: #6b6b6b;
  --accent: #d4a574;
  --border: #e0d8cc;
}
```

### Switching Themes
```typescript
function setTheme(themeName: string) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('theme', themeName);
}
```

### Available Themes
1. **Nugg's Favorite** (default) — #88739E, #DEA549, #8CBDB9, #DBD5E2, #244952, #96D080
2. **Purring Pastels** — light, muted pastels
3. **Void Kitty** — true dark, high contrast
4. **Chaos Cat** — fun wildcard
5. **High Contrast Dark** — accessibility
6. **High Contrast Light** — accessibility

---

## How to Communicate with Nae ⚡

### Lead with ACTION, then explain WHY
```
✅ "Run `npm run build` to compile. This ensures TypeScript catches errors."
❌ "You might want to consider building the project..."
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
npm run dev          # Development with hot reload

# Building
npm run build        # Full production build
npm run compile      # TypeScript compilation only
npm run clean        # Delete dist/ folder

# Code Quality (runs automatically on commit via Husky)
npm run lint         # Check for issues
npm run lint:fix     # Auto-fix issues
npm run format       # Format all files

# Testing
npm run test         # Run tests
```

**Always run `npm run clean` before building if something seems broken.**

---

## Code Standards

### TypeScript — STRICT MODE IS NON-NEGOTIABLE
- `"strict": true` in tsconfig.json — already configured
- **NEVER use `any`** — Biome will block commits that contain `any`
- Use Convex's type generation (`npx convex codegen`)
- If you don't know the type, use `unknown` and narrow it

```typescript
// ❌ BAD — will be blocked by Biome
function process(data: any) { ... }

// ✅ GOOD — proper typing
function process(data: TranscriptSegment) { ... }

// ✅ ACCEPTABLE — unknown with narrowing
function process(data: unknown) {
  if (isTranscriptSegment(data)) { ... }
}
```

### Files
- Max 500 lines per file
- Single responsibility
- Co-locate related code

### Components
- Functional components + hooks
- Props interfaces defined
- Error boundaries for major sections

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Convex functions: `camelCase`

### Before **Every** Commit
- Update the version number in package.json applying semantic versioning
- Husky will automatically run, but you can manually check:
  ```bash
  npm run lint        # Check for issues
  npm run lint:fix    # Auto-fix what's fixable
  ```

---

## Testing

```bash
npm run test              # Watch mode
npm run test:run          # Run once
npm run test:coverage     # Coverage report
```

**Stack:** Vitest + React Testing Library

**Priority:** Test critical paths first (recording, saving, auth)

---

## Security

- **NEVER expose API keys in renderer process**
- API keys live in main process, accessed via IPC
- Validate all user input
- Sanitize content before rendering

---

## Debugging Tips

### Electron DevTools
- Main process: Terminal output
- Renderer: Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)

### Convex Dashboard
- View data, run queries, check function logs
- `npx convex dashboard`

### Common Issues
| Problem | Solution |
|---------|----------|
| Convex not connecting | Check `convex dev` is running |
| Types out of sync | Run `npx convex codegen` |
| Build fails mysteriously | `npm run clean` then rebuild |
| Audio not working | Check device permissions in system settings |

---

## Git Workflow

### Commit Format
```
v0.1.0: Brief description of change
```

### Version Bumping
- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features
- **Major** (0.1.0 → 1.0.0): Breaking changes / phase completion

### Before Committing
1. `npm run clean && npm run build` passes
2. Test the feature manually
3. Update version in package.json
4. Commit with version in message

---

## Reference: v2 Code

The v2 codebase can be referenced for:
- AssemblyAI integration patterns (`src/renderer/audio/`)
- AI prompt structures (`src/renderer/ai/`)
- Jeopardy game logic (`src/renderer/components/games/`)
- Canvas browser extension (`browser-extension/`)

**DO NOT copy-paste.** The architecture is different. Understand the pattern, then implement fresh for v3.

---

## Remember

You're helping a busy ADHD student who's juggling school, work, and this passion project. Be:
- **Clear** — no ambiguity
- **Actionable** — tell them what to do
- **Supportive** — small wins matter
- **Thorough** — finish what you start

Fix things properly the first time. Complete every task fully. Ship working software.
