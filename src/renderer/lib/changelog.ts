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
    version: '5.35.2',
    label: '5.34.3 \u2013 5.35.2',
    date: '2026-09-24',
    title: 'Tighter locks, lighter recordings',
    changes: [
      {
        kind: 'fixed',
        text: 'Study room and exam room headers now fit their buttons to the room\u2019s own width, not the whole window \u2014 so a narrow room on a big monitor shows compact icons instead of a pile-up.',
      },
      {
        kind: 'improved',
        text: 'Recording is lighter again. Saving the transcript no longer rewrites your session every few seconds, so your session list stops reloading in the background while you record.',
      },
      {
        kind: 'fixed',
        text: 'A session can only be opened, or run through the study tools, by the account that recorded it. Sharing and study rooms work exactly as before.',
      },
    ],
  },
  {
    version: '5.34.2',
    label: '5.33.0 \u2013 5.34.2',
    date: '2026-09-22',
    title: 'A tidier, more readable app',
    changes: [
      {
        kind: 'fixed',
        text: 'The ScribeCat wordmark no longer sits underneath the navigation on narrower windows.',
      },
      {
        kind: 'fixed',
        text: 'Exam room headers and session rows now wrap cleanly instead of stacking one word per line over the buttons.',
      },
      {
        kind: 'fixed',
        text: 'The document upload card keeps its file-limit hint inside the card, and "Draw handwriting" now looks like the button it is.',
      },
      {
        kind: 'fixed',
        text: 'The editor\u2019s font-size picker shows the whole size again instead of clipping it.',
      },
      {
        kind: 'improved',
        text: 'Purring Pastels got a contrast pass \u2014 links, highlights, warnings and secondary text are legible now instead of washing into the background.',
      },
      {
        kind: 'improved',
        text: 'Every icon-only control has a tooltip and a screen-reader label \u2014 including the record button, which had no name at all.',
      },
      {
        kind: 'fixed',
        text: 'On narrower windows the navigation no longer clips \u201cExam\u201d; the wordmark steps aside instead.',
      },
      {
        kind: 'improved',
        text: 'Long course names, topic names and display names ellipsis properly instead of shoving the rest of the row off-screen.',
      },
      {
        kind: 'fixed',
        text: 'The theme swatches in Settings stay inside their cards on smaller windows \u2014 the picker now reflows to fewer columns instead of squeezing the cards narrower than the colours they hold.',
      },
    ],
  },
  {
    version: '5.32.5',
    label: '5.32.2 \u2013 5.32.5',
    date: '2026-09-21',
    title: 'Lighter while recording, quicker to update',
    changes: [
      {
        kind: 'improved',
        text: 'Recording is much lighter on the connection. ScribeCat was re-reading your whole transcript, and the details of every session you own, every time it saved \u2014 hundreds of times a lecture. Now it only loads what a screen is actually showing.',
      },
      {
        kind: 'fixed',
        text: 'The \u201cnew version available\u201d notice now turns up within seconds of an update instead of sitting on a stale page \u2014 including when you click back to ScribeCat from another app, which used to leave a tab waiting indefinitely. It still stays out of the way while you\u2019re recording, and still never refreshes on its own.',
      },
    ],
  },
  {
    version: '5.32.1',
    label: '5.28.0 \u2013 5.32.1',
    date: '2026-09-19',
    title: 'Jump back to the moment',
    changes: [
      {
        kind: 'added',
        text: 'After you stop recording, click any timestamp in Nugget\u2019s Notes to open the saved recording and play from that moment.',
      },
      {
        kind: 'added',
        text: 'Wondering where one of Nugget\u2019s notes came from? Click it in a saved session to see the part of the transcript it was written from. Works for recordings made from now on.',
      },
      {
        kind: 'fixed',
        text: 'Nugget\u2019s note timestamps now point to when something was said, not to when Nugget finished writing it down \u2014 so clicking one no longer lands you after the part you wanted. (Recordings made from now on.)',
      },
      {
        kind: 'added',
        text: 'ScribeCat now tells you when a new version is ready, so a tab left open for days doesn\u2019t quietly run old code. It never shows up while you\u2019re recording, and it never refreshes on its own.',
      },
      {
        kind: 'fixed',
        text: 'Long lectures could hit a storage ceiling that silently stopped the transcript saving partway through. Transcripts are now stored separately from the rest of the session, so length is no longer a limit.',
      },
      {
        kind: 'fixed',
        text: 'Recordings that were showing a length of 0:00 \u2014 or a nonsense negative length \u2014 now show how long they actually were.',
      },
      {
        kind: 'fixed',
        text: 'A recording\u2019s length is now saved as you record instead of only when you stop, so a session can no longer end up listed as 0:00 if something goes wrong at the end.',
      },
      {
        kind: 'fixed',
        text: 'If the end of a transcript fails to save, ScribeCat now tells you instead of leaving you to notice later. Your audio and notes are saved separately and are unaffected.',
      },
      {
        kind: 'fixed',
        text: 'Someone viewing a session you shared with them can no longer rename it or change its course.',
      },
      {
        kind: 'fixed',
        text: 'If you paused a recording, clicking a transcript line or a note afterwards played the audio too late \u2014 by however long you were paused. Transcript times now follow the recording itself. (Recordings made from now on.)',
      },
      {
        kind: 'fixed',
        text: 'The last few notes Nugget writes after you stop recording could be stamped with a time past the end of the recording, especially if you had paused.',
      },
      {
        kind: 'fixed',
        text: 'Merging recordings put Nugget\u2019s notes from the later parts at wildly wrong timestamps.',
      },
    ],
  },
  {
    version: '5.27.0',
    date: '2026-09-01',
    title: 'A pass over Nugget',
    changes: [
      {
        kind: 'added',
        text: 'Choose how much Nugget writes \u2014 terse, normal, or detailed \u2014 in Settings \u2192 Study. Previously the only choice was on or off.',
      },
      {
        kind: 'improved',
        text: 'The notes panel is taller and scrolls to keep up with new notes, unless you have scrolled back to re-read something.',
      },
      {
        kind: 'improved',
        text: 'Generating full notes now uses what Nugget captured live as an outline, instead of starting over from the transcript.',
      },
      {
        kind: 'improved',
        text: 'Nugget remembers what it already wrote for the whole lecture, not just the last twelve minutes, so it repeats itself less.',
      },
      {
        kind: 'fixed',
        text: 'Nugget note timestamps in the exam session viewer showed 0:00 for every note.',
      },
      {
        kind: 'improved',
        text: 'Chatting with Nugget about a long lecture is faster and cheaper \u2014 the transcript is no longer re-sent from scratch on every message.',
      },
    ],
  },
  {
    version: '5.26.0',
    date: '2026-08-31',
    title: 'Nugget catches more, and tells you when it can\u2019t',
    changes: [
      {
        kind: 'fixed',
        text: 'Nugget now reads everything said since its last note. It used to look at a fixed-size window, which quietly skipped part of faster-paced lectures.',
      },
      {
        kind: 'added',
        text: 'Dismiss a note Nugget got wrong. It leaves your notes, stops steering later ones, and is left out of what Nugget sees in chat \u2014 with an undo if you miss.',
      },
      {
        kind: 'fixed',
        text: 'If Nugget stops being able to generate notes, it now says so instead of showing \u201cListening\u2026\u201d for the rest of the lecture.',
      },
    ],
  },
  {
    version: '5.25.0',
    date: '2026-08-31',
    title: 'Recording notice reads for everyone',
    changes: [
      {
        kind: 'improved',
        text: 'The recording consent notice no longer singles out one state. It now points you to the recording laws that apply where you actually are.',
      },
    ],
  },
  {
    version: '5.24.0',
    date: '2026-08-31',
    title: 'ScribeCat is open to everyone',
    changes: [
      {
        kind: 'improved',
        text: 'Sign-up is no longer limited to @udel.edu addresses — anyone can make an account with any email.',
      },
      {
        kind: 'improved',
        text: 'Updated the Terms of Service to match. You will be asked to accept the new version once.',
      },
    ],
  },
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
