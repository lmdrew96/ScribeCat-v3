import {
  CHANGELOG,
  type ChangeKind,
  type ChangelogEntry,
  compareVersions,
  formatEntryDate,
} from '@/lib/changelog';
import { cn } from '@/lib/utils';
import { Plus, Sparkles, Wrench, Zap } from 'lucide-react';
import { Fragment } from 'react';

const KIND_META: Record<ChangeKind, { label: string; icon: typeof Plus }> = {
  added: { label: 'New', icon: Plus },
  improved: { label: 'Better', icon: Zap },
  fixed: { label: 'Fixed', icon: Wrench },
};

function ChangeRow({ kind, text }: { kind: ChangeKind; text: string }) {
  const { label, icon: Icon } = KIND_META[kind];
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 shrink-0 items-center gap-1 rounded-full border border-[var(--glass-border)] px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
      <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
    </li>
  );
}

function EntryCard({ entry, isCurrent }: { entry: ChangelogEntry; isCurrent: boolean }) {
  return (
    <li
      className={cn(
        'rounded-lg border p-4',
        isCurrent
          ? 'border-[var(--glass-border-strong)] bg-[var(--glass-bg)] shadow-[0_0_12px_var(--glass-glow)]'
          : 'border-[var(--glass-border)] glass-light',
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="text-sm font-semibold text-foreground">{entry.title}</h4>
        {isCurrent && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            Current
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          v{entry.label ?? entry.version} &middot; {formatEntryDate(entry.date)}
        </span>
      </div>
      <ul className="space-y-2">
        {entry.changes.map((change) => (
          <ChangeRow key={change.text} kind={change.kind} text={change.text} />
        ))}
      </ul>
    </li>
  );
}

interface WhatsNewTabProps {
  /** The version the user had read before opening this tab, for the "new since" divider. */
  previouslySeenVersion: string | null;
}

export function WhatsNewTab({ previouslySeenVersion }: WhatsNewTabProps) {
  // Index of the first entry the user has already read. Everything above it is
  // new to them, and gets a divider so they know where to stop reading.
  const firstSeenIndex = previouslySeenVersion
    ? CHANGELOG.findIndex((entry) => compareVersions(entry.version, previouslySeenVersion) <= 0)
    : 0;
  const hasUnseenDivider = firstSeenIndex > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-accent" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">What's New</h3>
          <p className="text-sm text-muted-foreground">
            Everything that's changed in ScribeCat, newest first.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {CHANGELOG.map((entry, index) => (
          // Fragment (not a wrapper element) so every child of the <ul> stays an <li>.
          <Fragment key={entry.version}>
            {hasUnseenDivider && index === firstSeenIndex && (
              <li className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-[var(--glass-border)]" aria-hidden="true" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Previously read
                </span>
                <span className="h-px flex-1 bg-[var(--glass-border)]" aria-hidden="true" />
              </li>
            )}
            <EntryCard entry={entry} isCurrent={index === 0} />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
