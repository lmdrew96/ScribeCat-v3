/**
 * User-facing changelog.
 *
 * Entries are hand-written from the release history in plain language — this is
 * what users read, not a commit log. Newest first; `CHANGELOG[0]` is treated as
 * the current release everywhere else in the app.
 *
 * When you cut a release, add an entry here with the same version you put in
 * package.json. The "What's New" badge keys off `version`, so an entry with a
 * version newer than the one a user last saw is what makes the dot appear.
 */

export type ChangeKind = 'added' | 'improved' | 'fixed';

export interface ChangelogChange {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogEntry {
  /** Canonical semver used for ordering and unseen-comparison. */
  version: string;
  /**
   * Display override for entries that cover a run of releases that shipped
   * together (e.g. '5.7.0 – 5.14.0'). Ordering still uses `version`.
   */
  label?: string;
  /** ISO date (YYYY-MM-DD) the release shipped. */
  date: string;
  title: string;
  changes: ChangelogChange[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '5.23.0',
    date: '2026-08-31',
    title: "What's New, in the app",
    changes: [
      {
        kind: 'added',
        text: 'This changelog! Settings → What’s New shows what changed in every release, and a dot appears on the settings gear when there’s something you haven’t read.',
      },
    ],
  },
  {
    version: '5.22.0',
    date: '2026-08-31',
    title: 'Recording survives a wandering tab',
    changes: [
      {
        kind: 'fixed',
        text: 'Your transcript and session timer keep running when you switch tabs or click into another window.',
      },
      {
        kind: 'fixed',
        text: 'A recording that fails to start now cleans up after itself instead of leaving a half-open microphone.',
      },
      {
        kind: 'improved',
        text: 'Bug reports sent through Nugget include the app version you were actually running.',
      },
    ],
  },
  {
    version: '5.21.0',
    date: '2026-08-25',
    title: 'A friendlier first run',
    changes: [
      {
        kind: 'added',
        text: 'New users get a short walkthrough the first time they open ScribeCat.',
      },
      { kind: 'fixed', text: 'The welcome dialog closes properly when you dismiss it.' },
      {
        kind: 'improved',
        text: 'Reworded the welcome copy to better describe what ScribeCat is for.',
      },
    ],
  },
  {
    version: '5.20.0',
    date: '2026-08-11',
    title: 'Faster, sturdier file storage',
    changes: [
      {
        kind: 'improved',
        text: 'Audio and document storage moved to Cloudflare R2 — uploads and playback are quicker and handle big files better.',
      },
      { kind: 'fixed', text: 'Uploads and audio playback no longer get blocked on some networks.' },
      {
        kind: 'improved',
        text: 'Generate Notes reports problems inline instead of firing a browser popup at you.',
      },
      {
        kind: 'improved',
        text: 'StudyQuest shows a clear desktop-only notice on phones rather than loading a game that will not fit.',
      },
    ],
  },
  {
    version: '5.19.0',
    date: '2026-05-24',
    title: 'Find any session fast',
    changes: [
      {
        kind: 'added',
        text: 'Search, sort, and course grouping in the session sidebar — no more scrolling to find last week’s lecture.',
      },
    ],
  },
  {
    version: '5.18.0',
    date: '2026-05-15',
    title: 'Connect ScribeCat to your other tools',
    changes: [
      {
        kind: 'added',
        text: 'A ScribeCat MCP server, so AI assistants can read your sessions. Generate and revoke API keys in Settings → Account.',
      },
      { kind: 'added', text: 'Setup instructions live alongside your API keys.' },
      { kind: 'added', text: 'An orange cat variant joined StudyQuest.' },
      {
        kind: 'fixed',
        text: 'The merge-sessions dialog scrolls instead of overflowing the screen.',
      },
    ],
  },
  {
    version: '5.17.0',
    date: '2026-05-14',
    title: 'Merge fragmented recordings',
    changes: [
      {
        kind: 'added',
        text: 'Combine several recordings from the same class into one session, transcript and all.',
      },
      {
        kind: 'improved',
        text: 'The course field is a dropdown of your saved courses instead of free text.',
      },
    ],
  },
  {
    version: '5.16.0',
    date: '2026-05-12',
    title: 'Handwriting, flagged words, and a failsafe',
    changes: [
      {
        kind: 'added',
        text: 'Draw Note — sketch during a recording with an Apple Pencil and it saves alongside your notes.',
      },
      {
        kind: 'added',
        text: 'Tap any word in the live transcript to flag it, then fix all the flagged ones after class.',
      },
      {
        kind: 'added',
        text: 'Forgot to stop recording? ScribeCat checks in at the three-hour mark before ending it for you.',
      },
      { kind: 'improved', text: 'Refreshed the Nugget theme with the ADHDesigns brand palette.' },
    ],
  },
  {
    version: '5.15.0',
    date: '2026-05-08',
    title: 'The StudyQuest shop is open',
    changes: [{ kind: 'added', text: 'Spend the coins you earn studying on gear and potions.' }],
  },
  {
    version: '5.14.0',
    label: '5.7.0 – 5.14.0',
    date: '2026-05-04',
    title: 'StudyQuest becomes a real game',
    changes: [
      { kind: 'added', text: 'An explorable town to wander between study sessions.' },
      { kind: 'added', text: 'Procedurally generated dungeons with a minimap.' },
      { kind: 'added', text: 'Turn-based combat — answer questions to land hits.' },
      { kind: 'added', text: 'Cat evolution tiers with new looks at levels 5, 10, and 20.' },
      { kind: 'added', text: 'An inventory and equipment system you can equip from a bag panel.' },
      {
        kind: 'added',
        text: 'Healing potions you can use mid-battle, and item drops when you win.',
      },
    ],
  },
  {
    version: '5.5.0',
    date: '2026-05-02',
    title: 'Know who said what',
    changes: [
      {
        kind: 'added',
        text: 'Detect Speakers labels each voice in a finished recording, so discussions read like a script.',
      },
      { kind: 'fixed', text: 'The study sidebar session list scrolls again.' },
      { kind: 'fixed', text: 'Recording survives iPad multi-window audio interruptions.' },
    ],
  },
  {
    version: '5.4.0',
    date: '2026-04-22',
    title: 'Recording reliability pass',
    changes: [
      {
        kind: 'fixed',
        text: 'Long sessions no longer fail to save audio — recordings upload in chunks as you go.',
      },
      { kind: 'fixed', text: 'The live transcript no longer freezes about two minutes in.' },
      { kind: 'improved', text: 'Cleaner transcript rendering with fewer gaps and no save races.' },
      {
        kind: 'improved',
        text: 'Better battery life — background work pauses while the tab is hidden.',
      },
    ],
  },
  {
    version: '5.3.0',
    date: '2026-04-20',
    title: 'Easter eggs and Nyan Cat themes',
    changes: [
      { kind: 'added', text: 'Five hidden easter eggs ported over from ScribeCat v2.' },
      { kind: 'added', text: 'Two unlockable Nyan Cat themes, hidden until you find the trigger.' },
      {
        kind: 'improved',
        text: 'Cat Party rains actual cat sprites, and they land on their feet.',
      },
    ],
  },
  {
    version: '5.2.0',
    date: '2026-04-18',
    title: 'Flashcards that remember you',
    changes: [
      {
        kind: 'added',
        text: 'Flashcards use spaced repetition, resurfacing cards right before you forget them.',
      },
      {
        kind: 'improved',
        text: 'Audio save and recovery problems surface as toasts instead of failing quietly.',
      },
    ],
  },
  {
    version: '5.1.0',
    date: '2026-04-17',
    title: 'Your name, not "Student"',
    changes: [{ kind: 'added', text: 'Set and edit a display name in Settings → Account.' }],
  },
  {
    version: '5.0.0',
    date: '2026-04-15',
    title: 'Crash recovery and a real mobile app',
    changes: [
      {
        kind: 'added',
        text: 'Crash recovery — if the browser dies mid-recording, ScribeCat offers your audio back when you return.',
      },
      { kind: 'improved', text: 'Every screen works properly on phones and tablets.' },
      {
        kind: 'fixed',
        text: 'A round of exam room fixes for Nugget chat, countdowns, and note formatting.',
      },
    ],
  },
  {
    version: '4.31.0',
    label: '4.27.0 – 4.31.0',
    date: '2026-04-01',
    title: 'Exam rooms and document upload',
    changes: [
      {
        kind: 'added',
        text: 'Exam Study Rooms — prep across several sessions at once with an AI Session Conductor.',
      },
      {
        kind: 'added',
        text: 'Upload documents and images and have their text pulled out automatically.',
      },
      {
        kind: 'added',
        text: 'Timezone awareness, so study stats and AI reminders match your actual clock.',
      },
      { kind: 'added', text: 'Exam room editing and session viewing for room members.' },
    ],
  },
  {
    version: '4.26.0',
    date: '2026-03-20',
    title: 'Privacy and compliance overhaul',
    changes: [
      {
        kind: 'added',
        text: 'A consent flow, full Terms of Service, and a Privacy Policy readable in the app.',
      },
      { kind: 'added', text: 'Audio auto-deletion so recordings do not linger forever.' },
    ],
  },
  {
    version: '4.25.0',
    date: '2026-03-15',
    title: 'Sessions that survive anything',
    changes: [
      {
        kind: 'improved',
        text: 'Recording keeps going through navigation, screen sleep, expired logins, and closed tabs.',
      },
      { kind: 'improved', text: 'Eight editor font colors, picked from a swatch grid.' },
    ],
  },
  {
    version: '4.20.0',
    label: '4.18.0 – 4.24.0',
    date: '2026-03-05',
    title: 'Install it, get notified, study together',
    changes: [
      {
        kind: 'added',
        text: 'ScribeCat installs as an app on your phone or desktop, and works offline.',
      },
      { kind: 'added', text: 'Notification sounds and browser push alerts.' },
      {
        kind: 'added',
        text: 'Collaborative notes in study rooms, with live cursors for everyone editing.',
      },
      { kind: 'added', text: 'Report a bug straight from Nugget Chat.' },
      { kind: 'improved', text: 'Real-time transcript cleanup while you record, not just after.' },
    ],
  },
  {
    version: '4.12.0',
    label: '4.12.0 – 4.17.0',
    date: '2026-02-20',
    title: 'ScribeCat gets social',
    changes: [
      { kind: 'added', text: 'Friends — profiles, requests, search, and blocking.' },
      { kind: 'added', text: 'Direct messaging and session sharing.' },
      { kind: 'added', text: 'Study rooms with shared sessions and group chat.' },
      { kind: 'added', text: 'Multiplayer Quiz Battle and Jeopardy inside study rooms.' },
      { kind: 'added', text: 'Canvas LMS integration for pulling in your course list.' },
    ],
  },
  {
    version: '4.11.0',
    date: '2026-02-14',
    title: 'Meet your study cat',
    changes: [
      {
        kind: 'added',
        text: 'StudyQuest — a cat companion that earns XP and levels up as you study.',
      },
    ],
  },
  {
    version: '4.7.0',
    label: '4.7.0 – 4.10.0',
    date: '2026-02-10',
    title: 'Nugget grows up',
    changes: [
      {
        kind: 'added',
        text: 'Nugget Chat moved app-wide, with better context and formatted replies.',
      },
      { kind: 'added', text: 'Nugget Notes are saved and get their own tab in study mode.' },
      { kind: 'added', text: 'Shareable URLs for every session and view.' },
    ],
  },
  {
    version: '4.5.0',
    label: '4.0.0 – 4.6.0',
    date: '2026-01-25',
    title: 'ScribeCat becomes a web app',
    changes: [
      { kind: 'added', text: 'Moved off the desktop app — ScribeCat now runs in any browser.' },
      { kind: 'added', text: 'Proper accounts through Clerk.' },
      { kind: 'added', text: 'Goals, streaks, and achievements.' },
      { kind: 'added', text: 'Seven AI study tools built on your transcripts and notes.' },
      { kind: 'improved', text: 'The glassmorphism look, plus a trash view with restore.' },
    ],
  },
];

/** The release the running build represents. */
export const LATEST_VERSION = CHANGELOG[0].version;

/**
 * Compares two dot-separated version strings.
 * Returns a negative number if `a` is older than `b`, positive if newer, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Entries newer than `sinceVersion`. A null/absent version means the user has
 * never opened the changelog, in which case nothing is "unseen" — we don't want
 * to greet a brand-new user with 20 releases of history they never missed.
 */
export function entriesSince(sinceVersion: string | null): ChangelogEntry[] {
  if (!sinceVersion) return [];
  return CHANGELOG.filter((entry) => compareVersions(entry.version, sinceVersion) > 0);
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Formats an entry's ISO date for display. Parsed as UTC so it never shifts a day. */
export function formatEntryDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}
