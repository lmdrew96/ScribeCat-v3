import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import {
  CHANGELOG,
  LATEST_VERSION,
  compareVersions,
  entriesSince,
  formatEntryDate,
} from '../src/renderer/lib/changelog';

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('5.0.0', '4.31.0')).toBeGreaterThan(0);
    expect(compareVersions('5.2.0', '5.10.0')).toBeLessThan(0);
    expect(compareVersions('5.20.1', '5.20.0')).toBeGreaterThan(0);
  });

  it('treats identical versions as equal', () => {
    expect(compareVersions('5.22.0', '5.22.0')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('5.1', '5.1.0')).toBe(0);
    expect(compareVersions('5.1', '5.1.1')).toBeLessThan(0);
  });
});

describe('entriesSince', () => {
  it('returns nothing for a user who has never opened the changelog', () => {
    expect(entriesSince(null)).toEqual([]);
  });

  it('returns nothing when the user is already on the latest version', () => {
    expect(entriesSince(LATEST_VERSION)).toEqual([]);
  });

  it('returns only entries newer than the seen version', () => {
    const seen = CHANGELOG[2].version;
    const unseen = entriesSince(seen);
    expect(unseen).toHaveLength(2);
    expect(unseen.every((entry) => compareVersions(entry.version, seen) > 0)).toBe(true);
  });

  it('returns the whole log for a version older than every entry', () => {
    expect(entriesSince('0.0.1')).toHaveLength(CHANGELOG.length);
  });
});

describe('CHANGELOG data', () => {
  it('is sorted newest-first with no duplicate versions', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0);
    }
  });

  it('matches the shipped package version', () => {
    // Guards against bumping package.json without writing a changelog entry —
    // the badge keys off LATEST_VERSION, so a drift here silently breaks it.
    expect(LATEST_VERSION).toBe(packageJson.version);
  });

  it('gives every entry a title and at least one change', () => {
    for (const entry of CHANGELOG) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.changes.length).toBeGreaterThan(0);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('has unique change text within each entry, so React keys stay stable', () => {
    for (const entry of CHANGELOG) {
      const texts = entry.changes.map((change) => change.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});

describe('formatEntryDate', () => {
  it('renders the ISO date without shifting a day across timezones', () => {
    expect(formatEntryDate('2026-08-31')).toContain('31');
    expect(formatEntryDate('2026-01-01')).toContain('1');
    expect(formatEntryDate('2026-01-01')).toContain('2026');
  });
});
