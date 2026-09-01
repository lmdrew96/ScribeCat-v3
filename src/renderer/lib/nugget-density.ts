/**
 * How talkative Nugget's Notes should be.
 *
 * Cadence used to be hardcoded, so the only remedy for "too chatty" or "missed
 * a lot" was the same kill switch. Lecture styles differ enormously — a dense
 * STEM lecture and a slow seminar want very different capture rates — and so do
 * students.
 *
 * `normal` reproduces the previous hardcoded behaviour exactly, so users who
 * never touch the setting see no change.
 */

export type NuggetNoteDensity = 'terse' | 'normal' | 'detailed';

export const NUGGET_DENSITY_VALUES: NuggetNoteDensity[] = ['terse', 'normal', 'detailed'];

export const DEFAULT_NUGGET_DENSITY: NuggetNoteDensity = 'normal';

export interface NuggetDensityPreset {
  /** Minimum gap between generations. */
  noteIntervalMs: number;
  /** Minimum words spoken before a generation is worth making. */
  minWordsForNotes: number;
  /** Most notes one generation may produce — drives both the prompt and its cap. */
  maxNotesPerCycle: number;
  label: string;
  description: string;
}

export const NUGGET_DENSITY_PRESETS: Record<NuggetNoteDensity, NuggetDensityPreset> = {
  terse: {
    noteIntervalMs: 150_000,
    minWordsForNotes: 100,
    maxNotesPerCycle: 1,
    label: 'Terse',
    description: 'Only the big moments. Fewer, further apart.',
  },
  normal: {
    noteIntervalMs: 90_000,
    minWordsForNotes: 60,
    maxNotesPerCycle: 2,
    label: 'Normal',
    description: 'A steady running summary. The default.',
  },
  detailed: {
    noteIntervalMs: 60_000,
    minWordsForNotes: 40,
    maxNotesPerCycle: 3,
    label: 'Detailed',
    description: 'Catches more, checks in more often.',
  },
};

/** Narrows a stored value, falling back to the default for anything unrecognised. */
export function resolveNuggetDensity(value: string | undefined | null): NuggetNoteDensity {
  return NUGGET_DENSITY_VALUES.includes(value as NuggetNoteDensity)
    ? (value as NuggetNoteDensity)
    : DEFAULT_NUGGET_DENSITY;
}

export function getNuggetDensityPreset(value: string | undefined | null): NuggetDensityPreset {
  return NUGGET_DENSITY_PRESETS[resolveNuggetDensity(value)];
}
