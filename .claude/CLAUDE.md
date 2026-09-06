# Claude Code Instructions for ScribeCat v3

> Project-specific instructions. This file is the source of truth for remote/mobile sessions, where `~/.claude/CLAUDE.md` does NOT sync — the essential global rules are inlined below rather than deferred to it.

## Project Overview

Vite + React + Convex + TypeScript, using **pnpm**. After modifying dependencies or moving packages between deps/devDeps, always run `pnpm install` to regenerate the lockfile before committing.

ScribeCat v3 is the ADHD-friendly lecture companion — a **pure web app** on Vercel.
Recording + transcription → AI notes → Study tools → Collaborative studying

**Current phase:** 4 (Connect) complete, plus substantial post-Phase-4 expansion. See `docs/PHASES.md` for version history and scope — always check it before starting work.

**Previous version:** https://github.com/lmdrew96/scribecat-v2 — reference only, do NOT copy-paste code.

For stack details, read `package.json`. For structure, read the tree. For schema, read `convex/schema.ts`. Those are authoritative; a copy here would only go stale.

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

Execute tasks fully. No loose ends. No "the rest follows the same pattern."

### EACH PHASE = WORKING APP

At the end of each phase the app must be fully functional for what's been built so far.

---

## Global Rules (inlined — `~/.claude/CLAUDE.md` does not reach remote sessions)

### Destructive actions — never without asking
- **Never** delete or overwrite `.env`, `.env.local`, or any credentials file. A real Clerk key has been lost this way.
- **Never** stop, kill, or restart a dev server or any process you did not personally start in this session. If a port is occupied, find the process, say so, and ask. Hard rule, not a judgment call.
- **Never** run `npx convex env list --prod`, `convex env get`, or anything that can print production secrets without Nae's explicit consent *in that session*. Past consent doesn't carry. This has caused two API key leaks.
- If an action can't be undone by `git revert`, confirm first.

### Git workflow
- **Every commit gets a version number.** No exceptions for "quick fix" or "just a docs change."
- Format: `v5.20.4: Brief description`
- Patch = bug fixes · Minor = new features · Major = breaking changes / phase completion
- Before committing: `pnpm clean && pnpm build` passes, feature tested manually, version bumped in `package.json`.

### ChaosPatch workflow
- **File follow-ups before closing the parent patch.** If notes or spec contain "worth a follow-up patch," a `## Follow-up` section, or anything deferred — `cp_add_patch` each one, *then* complete the parent. Notes on a closed patch are not a backlog; nobody reads them again.
- **Corrections update the spec, not just the notes.** Appending "actually criterion 2 is wrong" while leaving criterion 2 in place means the next reader hits the wrong version first.
- 'Open' patches are NEW features to implement, not existing code to mark done.

### Tangle — session start
Call `note_recall` (with the `project` shorthand) as the **first tool call of every session**, before reading files or planning. Not conditional on the task looking complex. Capture as you go with `note_capture` (honest `confidence`), and `note_resolve` when a note plays out — that's the calibration signal.

### Working style
- Recommend ONE approach, explain why, then do it. Don't present five options.
- Make judgment calls and state your reasoning. Nae will push back if she disagrees.
- **Only leave work for Nae to write when she explicitly asks** (`let-me-drive`). Don't stub things out proactively or leave TODOs for her to fill in.
- Verify before asserting. Check API formats and runtime support first; don't assume from general knowledge.
- Match the fix to the problem — smallest change that fully fixes it.
- Don't drive-by refactor. Flag unrelated cleanup separately.

---

## Code Standards (ScribeCat-Specific)

### TypeScript — strict mode is non-negotiable
- `"strict": true` already configured.
- **NEVER use `any`** — Biome blocks commits containing it.
- Use Convex type generation (`npx convex codegen`).
- If you don't know the type, use `unknown` and narrow it.

### Biome
Single quotes, semicolons always, 2-space indent, 100 char width.
`noExplicitAny: "error"`, `noArrayIndexKey: "warn"`, `noNonNullAssertion: "warn"`.

### Files and naming
- Max 500 lines per file, single responsibility, co-locate related code.
- Components: `PascalCase` exports in `kebab-case.tsx` files.
- Hooks: `use-kebab-case.ts` · Utils: `camelCase.ts`
- **Convex files: `camelCase.ts`** — Convex does NOT allow hyphens in module paths.
- Convex functions: `camelCase`

### Before writing DB code
Read `convex/schema.ts` first and confirm every field exists with the right type. **Never repurpose an existing field for unrelated data** — add a proper one.

### Feature completeness
Every feature is implemented end-to-end — backend, frontend, UI — before committing. No backend function without the UI that calls it.

---

## Convex Patterns

Queries use `query({ args, handler })` with `ctx.db.query(...).withIndex(...)`. Mutations use `mutation({ args, handler })` with `ctx.db.insert/patch`. AI endpoints use `httpAction`. React consumes via `useQuery(api.x.y)` / `useMutation`.

Read existing files in `convex/` for the current idiom rather than working from the examples that used to live here — `sessions.ts` is a good reference for query/mutation shape, `nuggetNotes.ts` for HTTP actions.

Shared helpers worth knowing before writing new code:
- `convex/authHelpers.ts` — `requireAuth`, `requireAuthWithProfile`
- `convex/studyTools.ts` — exports `callClaude`, `extractJson`
- `convex/studyRooms.ts` — `requireRoomMember` / `requireRoomHost`, `postSystemMessage`
- `convex/messagingHelpers.ts` — `verifyFriendship`
- `convex/config.ts` — centralized `AI_MODEL` (Haiku 4.5 for all endpoints)

---

## AI Architecture

All AI endpoints use **Haiku 4.5** via `AI_MODEL` in `convex/config.ts`. Don't hardcode a model, and don't reach for Opus-tier by default.

**Two-step pipeline (Nugget's Notes)** — during recording, two steps run at different intervals:

| Step | Role | Frequency | File |
|------|------|-----------|------|
| Context Extraction | Themes, topics, definitions | ~2 min / 200 words | `convex/lectureContext.ts` |
| Note Generation | 1–3 bullet notes using context | ~45s / 30 words | `convex/nuggetNotes.ts` |

Orchestrated by `src/renderer/hooks/use-nugget-notes.ts`.

Full note generation runs post-recording via `convex/ai.ts`, supports dual-input synthesis (existing notes + transcript), uses lecture-type-aware prompts from `convex/prompts.ts`, and outputs markdown converted by `lib/markdown-to-tiptap.ts`.

---

## Session Resilience Architecture

**Key design decision:** recording hooks live in `AppLayout`, not `HomeView`. Navigating away from `/` no longer kills the recording.

| Layer | File | Purpose |
|-------|------|---------|
| RecordingContext | `contexts/recording-context.tsx` | Owns audio/transcription/notes hooks; syncs to SessionContext |
| Wake Lock | `hooks/use-wake-lock.ts` | Keeps screen awake while recording |
| Auth Keep-Alive | `hooks/use-session-keep-alive.ts` | `session.touch()` every 4 min, prevents Clerk expiry |
| Navigation Guard | `components/recording-navigation-guard.tsx` | Blocks `beforeunload` during recording |
| Mini Indicator | `components/mini-recording-indicator.tsx` | Floating pill + controls on non-home routes |

---

## Environment Variables

Names only — values live in `.env.local` and the Convex dashboard.

**Client (`.env.local`, VITE_ prefix):** `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_R2_PUBLIC_URL`

**Server (Convex dashboard):** `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `GITHUB_TOKEN` (PAT, public_repo scope — bug reports), `GITHUB_REPO`, `R2_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`

---

## Build Commands

```bash
pnpm dev              # Vite dev server (requires convex:dev running)
pnpm convex:dev       # Convex backend
pnpm build            # Production build
pnpm compile          # tsc --noEmit, type-check only
pnpm clean            # Delete dist/
pnpm lint / lint:fix / format   # Biome (also runs on commit via Husky)
pnpm convex:deploy    # Deploy Convex to production
```

**Run `pnpm clean` before building if something seems broken.**

Note on `tsc --noEmit`: **no output means no errors.** Don't re-run it, and don't append `2>&1` or `echo $?` to investigate the silence. Silence is success.

---

## Debugging

Don't assume the code is at fault. Check caching, third-party API behavior, and environment differences (dev vs prod, cold starts) before rewriting.

| Problem | Solution |
|---------|----------|
| Convex not connecting | Is `pnpm convex:dev` running? |
| Types out of sync | `npx convex codegen` |
| Build fails mysteriously | `pnpm clean`, then rebuild |
| Audio not working | Browser microphone permissions |
| Auth not working | `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` |
| AI actions failing | `ANTHROPIC_API_KEY` in Convex dashboard env vars |

Convex dashboard: `npx convex dashboard` — view data, run queries, check function logs.

---

## Styling & Theming

6 themes via CSS variables in `src/renderer/styles/globals.css`: Nugg's Favorite (default), Purring Pastels, Void Kitty, Chaos Cat, High Contrast Dark, High Contrast Light. All include glassmorphism. Each defines `--font-color-1` through `--font-color-8` for the editor toolbar. Switching via `ThemeProvider`.

**Never wrap raw hex values in `hsl()`.** Check the existing pattern in `globals.css` before applying color changes.

For vague style requests ("futuristic," "minimalist"), get a reference and write a concrete spec before touching CSS. A palette swap is not a theme.

---

## Markdown Rendering

Any component displaying user-written or AI-generated text **must render markdown**. Visible `**bold**` or `# headings` is always a bug.

Check for an existing renderer in the project before adding a dependency. Test with real AI output — inline formatting, headings, lists, fenced code blocks, tables, nesting. Always sanitize; never `dangerouslySetInnerHTML` on raw markdown.

---

## Documentation

When updating docs or running audits, check ALL subdirectories (especially `docs/` and its subdirs) in a single pass. Don't wait to be reminded about missed directories.
