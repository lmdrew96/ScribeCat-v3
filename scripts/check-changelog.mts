/**
 * Fails if a shipped version isn't covered by a What's New entry.
 *
 * tests/changelog.test.ts can't catch a *skipped* release — a gap looks the
 * same as a deliberately grouped run. This reads the versions that actually
 * shipped from git history (commit subjects start `vX.Y.Z:`), plus the version
 * in package.json, and checks each one is either an entry's `version` or
 * inside an entry's `label` range (e.g. '5.32.2 – 5.32.5').
 *
 * Enforced from 5.28.0, when entries started carrying `label` ranges. Before
 * that, patch releases were folded silently into the next minor's entry, so
 * ~70 older patch versions have no range that names them — rewriting those
 * shipped entries to satisfy a new rule isn't worth it.
 *
 * Run: node scripts/check-changelog.mts   (also runs on pre-push)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CHANGELOG, compareVersions } from '../src/renderer/lib/changelog.ts';

const VERSION_SUBJECT = /^v(\d+\.\d+\.\d+):/;

/** An entry's covered range: its label's two ends, or just its own version. */
const rangeOf = (entry: { version: string; label?: string }): [string, string] => {
  const bounds = entry.label?.split(/\s*[–-]\s*/).map((part) => part.trim());
  if (bounds?.length === 2) return [bounds[0], bounds[1]];
  return [entry.version, entry.version];
};

const ENFORCED_FROM = '5.28.0';
const ranges = CHANGELOG.map(rangeOf);

const subjects = execSync('git log --format=%s', { encoding: 'utf-8' }).split('\n');
const shipped = new Set(
  subjects.map((subject) => VERSION_SUBJECT.exec(subject)?.[1]).filter((v): v is string => !!v),
);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as {
  version: string;
};
shipped.add(pkg.version);

const uncovered = [...shipped]
  .filter((version) => compareVersions(version, ENFORCED_FROM) >= 0)
  .filter(
    (version) =>
      !ranges.some(
        ([low, high]) => compareVersions(version, low) >= 0 && compareVersions(version, high) <= 0,
      ),
  )
  .sort(compareVersions);

if (uncovered.length > 0) {
  console.error(
    `✖ No What's New entry covers: ${uncovered.join(', ')}\n  Add an entry in src/renderer/lib/changelog.ts, or widen the newest entry's \`label\` range.`,
  );
  process.exit(1);
}

console.log(`✓ Every version shipped since ${ENFORCED_FROM} has a What's New entry.`);
