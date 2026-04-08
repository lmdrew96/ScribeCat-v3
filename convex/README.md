# ScribeCat v3 — Convex Backend

Server-side functions for the ScribeCat app. All functions run on the Convex platform.

## Files

| File | Type | Purpose |
|------|------|---------|
| `schema.ts` | Schema | Database schema — 23 tables |
| `sessions.ts` | Queries + Mutations | Session CRUD — list, get, create, update, soft delete, restore, permanent delete, trash listing |
| `ai.ts` | Action | Full note generation from transcript (Convex action, supports dual-input synthesis) |
| `generateNotes.ts` | HTTP Action | Full note generation from transcript (HTTP action) |
| `nuggetNotes.ts` | HTTP Action | Real-time note generation during recording |
| `nuggetChat.ts` | HTTP Action | AI chat with transcript/notes context |
| `lectureContext.ts` | HTTP Action | Lecture context extraction (feeds into Nugget Notes) |
| `scrubTranscript.ts` | HTTP Action | Transcript cleaning/scrubbing (sliding window) |
| `studyTools.ts` | Actions | 6 AI study tools — summary, key concepts, flashcards, quiz, concept map, ELI5 |
| `studyToolPrompts.ts` | Utility | Prompt templates for study tools + multiplayer games, lecture-type-aware |
| `studyGames.ts` | Mutations + Actions | Multiplayer games (Quiz Battle, Jeopardy) — lobby, answers, scoring |
| `studyRooms.ts` | Queries + Mutations | Study rooms — create, join, leave, close, pin session, heartbeat presence |
| `roomNotes.ts` | Queries + Mutations | Collaborative notes per study room |
| `prompts.ts` | Utility | Note generation prompt templates by lecture type (STEM, Humanities, etc.) |
| `citations.ts` | Utility | Parses `[cite:XXXXX]` patterns from AI-generated notes |
| `config.ts` | Config | Shared AI model configuration (`AI_MODEL` — currently Haiku 4.5) |
| `audioStorage.ts` | Mutations | Audio file upload to Convex storage + URL generation |
| `uploadImage.ts` | Mutations | Image upload handler |
| `transcription.ts` | Action | AssemblyAI temporary token generation for real-time transcription |
| `productivity.ts` | Queries + Mutations | Study goals, daily stats, streaks, break reminders, achievements |
| `studyQuest.ts` | Queries + Mutations | Cat companion — adopt, rename, change variant, XP awards, level up |
| `xpUtils.ts` | Utility | XP/level math functions (quadratic curve: `50 * L * (L+1)`) |
| `authHelpers.ts` | Utility | Shared auth helpers — `requireAuth()` + `requireAuthWithProfile()` |
| `userProfiles.ts` | Queries + Mutations | User profiles — create, get, username search, display name/avatar |
| `friends.ts` | Queries + Mutations | Friend requests — send, accept, decline, cancel, unfriend, list |
| `blocks.ts` | Queries + Mutations | Block/unblock users (asymmetric, removes friendships) |
| `messaging.ts` | Queries + Mutations | DM conversations + messages — send, list, mark read |
| `messagingHelpers.ts` | Utility | Shared messaging helpers (verifyFriendship) |
| `sessionSharing.ts` | Queries + Mutations | Session sharing — share, unshare, copy to library |
| `reportBug.ts` | HTTP Action | Bug report endpoint (creates GitHub Issues) |
| `crons.ts` | Cron Jobs | Scheduled trash cleanup (30-day retention) |
| `http.ts` | HTTP Routes | Routes for all HTTP actions |
| `auth.config.ts` | Config | Clerk JWT issuer domain for auth validation |

## Database Tables (23)

| Table | Purpose |
|-------|---------|
| `sessions` | Recording sessions (audio, transcript, notes, lecture type, course) |
| `sessionNotes` | Separated notes content (avoids 1MB document limit) |
| `userSettings` | Theme, break reminders, study goals, courses |
| `studyStats` | Daily study minutes, session counts, goal tracking |
| `achievements` | Unlocked achievement tracking |
| `catCompanion` | StudyQuest cat (name, variant, XP, level, mood, recent gains) |
| `studyToolResults` | Cached AI study tool output per session |
| `flashcardProgress` | Spaced repetition tracking per card |
| `quizAttempts` | Quiz answer history and scores |
| `chatHistory` | Persistent per-session Nugget Chat messages |
| `userProfiles` | Public identity (@username, display name, avatar) |
| `friendships` | Friend requests + accepted friends (status, requester/receiver) |
| `blocks` | Blocked users (asymmetric, persists independently) |
| `conversations` | DM conversations (sorted participant pairs) |
| `messages` | Individual DM messages |
| `conversationReads` | Per-user read cursors for unread tracking |
| `sharedSessions` | Session sharing permissions |
| `studyRooms` | Ephemeral group study rooms |
| `studyRoomMembers` | Room participants with presence |
| `studyRoomMessages` | Room chat messages |
| `roomNotes` | Collaborative notes per study room |
| `studyGames` | Game instances (Quiz Battle / Jeopardy) inside rooms |
| `studyGamePlayers` | Per-player game state, scores, answer tracking |

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
