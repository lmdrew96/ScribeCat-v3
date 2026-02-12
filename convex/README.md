# ScribeCat v3 — Convex Backend

Server-side functions for the ScribeCat app. All functions run on the Convex platform.

## Files

| File | Type | Purpose |
|------|------|---------|
| `schema.ts` | Schema | Database schema — 7 tables (sessions, userSettings, studyStats, achievements, studyToolResults, flashcardProgress, quizAttempts, chatHistory) |
| `sessions.ts` | Queries + Mutations | Session CRUD — list, get, create, update, soft delete, restore, permanent delete, trash listing |
| `ai.ts` | Action | Full note generation from transcript using Claude Sonnet 4.5 |
| `nuggetNotes.ts` | HTTP Action | Real-time note generation during recording using Claude Haiku 4.5 |
| `nuggetChat.ts` | HTTP Action | AI chat with transcript/notes context using Claude Sonnet 4.5 |
| `lectureContext.ts` | HTTP Action | Lecture context extraction using Claude Sonnet 4.5 (feeds into Nugget Notes) |
| `studyTools.ts` | Actions | 7 AI study tools — summary, key concepts, flashcards, quiz, concept map, ELI5, chat |
| `studyToolPrompts.ts` | Utility | Prompt templates for study tools, lecture-type-aware |
| `prompts.ts` | Utility | Note generation prompt templates by lecture type (STEM, Humanities, etc.) |
| `citations.ts` | Utility | Parses `[cite:XXXXX]` patterns from AI-generated notes |
| `audioStorage.ts` | Mutations | Audio file upload to Convex storage + URL generation |
| `transcription.ts` | Action | AssemblyAI temporary token generation for real-time transcription |
| `productivity.ts` | Queries + Mutations | Study goals, daily stats, streaks, break reminders, achievements |
| `crons.ts` | Cron Jobs | Scheduled trash cleanup (30-day retention) |
| `http.ts` | HTTP Routes | Routes for nuggetNotes, nuggetChat, lectureContext HTTP actions |
| `auth.config.ts` | Config | Clerk JWT issuer domain for auth validation |

## Environment Variables (set in Convex Dashboard)

```
ANTHROPIC_API_KEY      # For all Claude AI calls
ASSEMBLYAI_API_KEY     # For transcription token generation
CLERK_JWT_ISSUER_DOMAIN # For auth validation
```

## Patterns

- **Queries** return data reactively (auto-update on changes)
- **Mutations** modify data (insert, update, delete)
- **Actions** call external APIs (Anthropic, AssemblyAI) — cannot be reactive
- **HTTP Actions** handle raw HTTP requests (used for streaming AI responses)

See [Convex docs](https://docs.convex.dev/functions) for more.
