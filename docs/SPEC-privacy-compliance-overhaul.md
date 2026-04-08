# ScribeCat-v2: Privacy & Compliance Overhaul

## Context

ScribeCat is an Electron-based study companion app with audio recording, transcription, AI-powered study tools, and collaborative study rooms. After a compliance review, we identified that the current recording/transcription architecture poses legal and policy risks:

- **Delaware is a two-party consent state** — recording others without consent is illegal
- **University of Delaware** treats lecture recording as a DSS accommodation requiring signed agreements
- **UD's AI policy** defers to individual instructors, meaning AI-processed lecture content could violate course-specific rules
- **FERPA** — processing audio containing identifiable student voices through external APIs (AssemblyAI) creates privacy exposure

This spec covers the changes needed to make ScribeCat legally defensible and policy-compliant while preserving all core functionality.

---

## Phase 1: Consent Notice & Rebranding (Do First — Low Effort, High Impact)

### 1.1 Add Recording Consent Disclaimer

**Where:** Display a notice in the recording UI before the user can start recording. This should appear every time — not a one-time dismissal.

**Notice text:**
```
⚠️ Recording Notice

This feature records audio from your device's microphone. By proceeding, you confirm that:

• You have obtained consent from all parties who may be recorded
• You will use recordings only for personal study purposes
• You comply with all applicable laws and institutional policies regarding audio recording

In Delaware and other two-party consent states, recording someone without their knowledge or permission may be illegal.
```

**Implementation:**
- Add a consent modal/banner component to the recording UI in `src/renderer/`
- The "Start Recording" button should be disabled until the user acknowledges the notice
- Store acknowledgment in the current session only (not persisted — user must acknowledge each session)
- Add a checkbox: "I understand and agree" that enables the record button

### 1.2 Rebrand Recording Feature

**Goal:** Ensure the UI and any user-facing text frames recording as a personal study tool, not a lecture capture tool.

**Changes:**
- Rename any UI labels from "Lecture Recording" / "Record Lecture" → **"Voice Notes"** or **"Audio Notes"**
- Update any tooltip text, placeholder text, or helper text that references lectures
- In `src/renderer/index.html` (72KB — search for any "lecture" references in the recording section)
- In any component files under `src/renderer/components/` that reference recording
- Update `README.md` to reflect the rebranding

**Do NOT rename:**
- Internal code identifiers (class names, function names, IPC channels) — those can stay as-is for now to avoid breaking changes. Just the user-facing strings.

---

## Phase 2: Terms of Service & Privacy Policy

### 2.1 Create Legal Documents

**Create two new files:**

#### `docs/TERMS_OF_SERVICE.md`

Must cover:
- **Acceptable Use:** Users are responsible for obtaining consent before recording. Users must comply with their institution's policies and applicable laws. ScribeCat is intended for personal study use.
- **Prohibited Uses:** Recording without consent of all parties. Using ScribeCat to circumvent institutional recording policies. Distributing or sharing recordings without consent.
- **AI Processing Disclosure:** Transcription text (not audio) may be sent to third-party AI services (Anthropic Claude API) for summarization, flashcard generation, and study tool features. Audio is processed via [AssemblyAI / local Whisper — update per Phase 3].
- **Data Retention:** Audio recordings are automatically deleted after 6 months. Text transcripts and notes persist until the user deletes them.
- **User Content:** Users retain ownership of their recordings and notes. ScribeCat does not claim rights to user content.
- **Disclaimer:** ScribeCat is provided as-is. ADHDesigns is not liable for misuse of the recording feature.
- **Age Requirement:** Users must be 13+ (COPPA compliance).

#### `docs/PRIVACY_POLICY.md`

Must cover:
- **Data Collected:** Audio recordings (stored locally), transcription text, session metadata, user notes, Supabase account data (if cloud sync enabled), Google Drive OAuth tokens (if connected)
- **Third-Party Services:**
  - AssemblyAI: receives audio data for transcription (note: this changes in Phase 3)
  - Anthropic Claude API: receives transcription text only for AI features
  - Supabase: cloud storage for session sync
  - Google Drive: optional integration for file export
- **Data Storage:** Audio files stored locally in Electron app data directory. Cloud-synced data stored in Supabase (user's account).
- **Data Retention:** Audio auto-deletes after 6 months. Transcripts persist until user deletion.
- **Data Sharing:** No data is sold or shared with third parties for advertising. Third-party services receive only what is necessary for their function.
- **User Rights:** Users can delete all their data at any time. Export functionality available via Google Drive integration.
- **Contact:** lmdrew96@gmail.com

### 2.2 Surface Legal Docs in App

- Add a "Terms of Service" and "Privacy Policy" link in the app's Settings page (`src/renderer/settings.ts`)
- Display TOS acceptance on first launch / account creation
- These should open the markdown files rendered in-app or link to hosted versions

---

## Phase 3: Whisper Migration (Bigger Lift — Separate Branch)

### 3.1 Replace AssemblyAI with Local Whisper

**Goal:** All speech-to-text processing happens on-device. No audio data leaves the user's machine.

**Architecture:**
```
Audio (microphone) → Local Whisper (main process) → Text transcript → Claude API (for AI features)
```

**Implementation approach:**

Option A — `whisper-node` (Node.js bindings for whisper.cpp):
- npm package, integrates into Electron main process
- Ships the whisper model file (~75MB for base, ~500MB for small) bundled with app or downloaded on first use
- Recommended model: `whisper-base.en` for English-only (good balance of speed/quality)

Option B — `whisper.cpp` as a sidecar binary:
- Bundle the compiled whisper.cpp binary with the Electron app
- Call it via `child_process.spawn()` from the main process
- More complex packaging but potentially better performance

**Recommendation:** Start with Option A (`whisper-node`). Simpler integration, and if performance is an issue, migrate to Option B later.

**Files to modify:**
- `src/infrastructure/services/transcription/` — replace or add a `WhisperTranscriptionService.ts` alongside `TranscriptionEnhancer.ts`
- `src/main/recording-manager.ts` — update the transcription provider logic (currently hardcoded to `'assemblyai'`)
- `.env.example` — remove `ASSEMBLYAI_API_KEY` (or mark as deprecated/optional)
- `package.json` — add `whisper-node` dependency
- `electron-builder.json` — ensure Whisper model files are included in the build

**Migration notes:**
- Keep AssemblyAI as a fallback option in settings (some users may prefer cloud transcription for quality)
- Default to Whisper (local) for all new installations
- Add a setting toggle: "Transcription Engine: Local (Whisper) | Cloud (AssemblyAI)"
- If AssemblyAI is selected, show a privacy notice: "Audio will be sent to AssemblyAI's servers for processing"

### 3.2 Update Privacy Policy Post-Migration

After Whisper is integrated:
- Update `docs/PRIVACY_POLICY.md` to reflect that audio is processed locally by default
- Update the third-party services section to note AssemblyAI is optional
- This is a major privacy win worth highlighting in the README/marketing

---

## Phase 4: Auto-Deletion (Can Be Done Independently)

### 4.1 Implement 6-Month Audio Auto-Deletion

**Where:** Add a cleanup routine in the main process that runs on app startup.

**Logic:**
1. On app launch, scan the audio storage directory (managed by `FileAudioRepository`)
2. For each audio file, check the associated session's `createdAt` timestamp
3. If `createdAt` is older than 6 months, delete the audio file
4. Update the session metadata to reflect that audio has been deleted (keep the transcript/notes/summary)
5. Log deletions for debugging

**Files to modify:**
- Create `src/application/use-cases/CleanupExpiredAudioUseCase.ts`
- Modify `src/main/main.ts` or `ServiceBootstrapper.ts` to run cleanup on startup
- Modify `FileAudioRepository` to support deletion
- Add a user setting for retention period (default: 6 months, options: 1/3/6/12 months, never)

**Important:** Only delete audio files, NOT transcripts, notes, summaries, or session metadata. The text content is not a privacy risk and has ongoing study value.

### 4.2 Notify Users Before Deletion

- 7 days before auto-deletion, show a notification: "X recordings will be automatically deleted in 7 days. You can export them from Settings."
- Provide a "Keep" button to extend retention by another 6 months for specific recordings

---

## Phase 5: Future — Study Room Consent Flow (Not Urgent)

**Context:** Study rooms currently use Yjs (`SupabaseYjsProvider.ts`) for real-time text collaboration only. No voice/recording features exist yet. When voice chat is added:

- Before any recording starts in a study room, ALL participants must see and accept a consent prompt
- Recording cannot begin until every participant has accepted
- Any participant can revoke consent, which stops recording immediately
- Recordings from study rooms should follow the same auto-deletion policy

**This is not needed now** — build it when voice chat is actually implemented.

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| New: Recording consent modal component | Create | 1 |
| `src/renderer/index.html` | Search/replace "lecture" → "voice notes" in UI text | 1 |
| `src/renderer/` components referencing recording | Rebrand user-facing strings | 1 |
| `README.md` | Update feature descriptions | 1 |
| `docs/TERMS_OF_SERVICE.md` | Create | 2 |
| `docs/PRIVACY_POLICY.md` | Create | 2 |
| `src/renderer/settings.ts` | Add TOS/Privacy links | 2 |
| `src/infrastructure/services/transcription/WhisperTranscriptionService.ts` | Create | 3 |
| `src/main/recording-manager.ts` | Update transcription provider logic | 3 |
| `.env.example` | Deprecate AssemblyAI key | 3 |
| `package.json` | Add whisper-node | 3 |
| `electron-builder.json` | Bundle Whisper model | 3 |
| `src/application/use-cases/CleanupExpiredAudioUseCase.ts` | Create | 4 |
| `src/main/ServiceBootstrapper.ts` | Add cleanup on startup | 4 |
| `src/infrastructure/repositories/FileAudioRepository.ts` | Add deletion support | 4 |

---

## Priority Order

1. **Phase 1** — Consent notice + rebranding (do immediately, <1 day of work)
2. **Phase 2** — TOS + Privacy Policy (do next, ~half day to draft and integrate)
3. **Phase 4** — Auto-deletion (independent, ~1 day)
4. **Phase 3** — Whisper migration (biggest lift, ~2-3 days, do on separate branch)
5. **Phase 5** — Study room consent (future, build when voice chat ships)
