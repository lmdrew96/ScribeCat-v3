import { CHANGELOG, LATEST_VERSION, compareVersions, entriesSince } from '@/lib/changelog';
import { useCallback, useEffect, useState } from 'react';

export const CHANGELOG_SEEN_KEY = 'scribecat-changelog-seen-version';
export const CHANGELOG_SEEN_EVENT = 'scribecat:changelog-seen';

function readSeenVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CHANGELOG_SEEN_KEY);
  } catch {
    // Private browsing / blocked storage — treat as "nothing seen yet".
    return null;
  }
}

/**
 * The version the user last read about, straight from storage.
 *
 * Exposed for callers that need a snapshot *before* marking the changelog seen —
 * the What's New tab uses it to keep its "previously read" divider anchored
 * while the user is still reading.
 */
export function readChangelogSeenVersion(): string | null {
  return readSeenVersion();
}

interface UseChangelogResult {
  /** Whether releases have shipped since the user last opened What's New. */
  hasUnseen: boolean;
  /** How many releases they haven't read. */
  unseenCount: number;
  /** Marks the current release as read, clearing the badge. */
  markSeen: () => void;
}

/**
 * Tracks which release the user has already read about.
 *
 * The seen-version is stored per browser rather than per account: the badge is
 * a small "go look at this" nudge, not something worth a round-trip to Convex.
 *
 * A user with no stored version is treated as caught up — see `entriesSince`.
 * We still write the current version on first read so the *next* release
 * badges correctly.
 */
export function useChangelog(): UseChangelogResult {
  const [seenVersion, setSeenVersion] = useState<string | null>(readSeenVersion);

  useEffect(() => {
    function refresh() {
      setSeenVersion(readSeenVersion());
    }
    // The native `storage` event only fires in *other* tabs, so we pair it with
    // a custom event for same-tab updates.
    window.addEventListener(CHANGELOG_SEEN_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHANGELOG_SEEN_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Seed first-time visitors so they start caught up instead of being shown a
  // badge for every release that predates them.
  useEffect(() => {
    if (seenVersion !== null) return;
    markChangelogSeen();
  }, [seenVersion]);

  const markSeen = useCallback(() => {
    markChangelogSeen();
  }, []);

  const unseenCount = entriesSince(seenVersion).length;

  return { hasUnseen: unseenCount > 0, unseenCount, markSeen };
}

/** Records the current release as read and notifies listeners in this tab. */
export function markChangelogSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readSeenVersion();
    if (current && compareVersions(current, LATEST_VERSION) >= 0) return;
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, LATEST_VERSION);
  } catch {
    // Storage unavailable — the badge just won't persist. Not worth surfacing.
    return;
  }
  window.dispatchEvent(new Event(CHANGELOG_SEEN_EVENT));
}

/** The newest entry, for the "what's new in this version" link on the About tab. */
export const latestEntry = CHANGELOG[0];
