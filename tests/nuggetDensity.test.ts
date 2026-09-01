import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NUGGET_DENSITY,
  NUGGET_DENSITY_PRESETS,
  NUGGET_DENSITY_VALUES,
  getNuggetDensityPreset,
  resolveNuggetDensity,
} from '../src/renderer/lib/nugget-density';

describe('resolveNuggetDensity', () => {
  it('accepts every known density', () => {
    for (const density of NUGGET_DENSITY_VALUES) {
      expect(resolveNuggetDensity(density)).toBe(density);
    }
  });

  it('falls back to the default for absent or unrecognised values', () => {
    // Rows predating the setting have no value, and a bad one must not break recording.
    for (const value of [undefined, null, '', 'chatty']) {
      expect(resolveNuggetDensity(value)).toBe(DEFAULT_NUGGET_DENSITY);
    }
  });
});

describe('NUGGET_DENSITY_PRESETS', () => {
  it('normal reproduces the previously hardcoded behaviour', () => {
    // Existing users must see no change until they touch the setting.
    expect(NUGGET_DENSITY_PRESETS.normal).toMatchObject({
      noteIntervalMs: 90000,
      minWordsForNotes: 60,
      maxNotesPerCycle: 2,
    });
  });

  it('orders terse -> normal -> detailed from least to most talkative', () => {
    const [terse, normal, detailed] = NUGGET_DENSITY_VALUES.map((d) => NUGGET_DENSITY_PRESETS[d]);
    expect(terse.noteIntervalMs).toBeGreaterThan(normal.noteIntervalMs);
    expect(normal.noteIntervalMs).toBeGreaterThan(detailed.noteIntervalMs);
    expect(terse.minWordsForNotes).toBeGreaterThan(detailed.minWordsForNotes);
    expect(terse.maxNotesPerCycle).toBeLessThan(detailed.maxNotesPerCycle);
  });

  it('gives every level a label and description for the settings UI', () => {
    for (const density of NUGGET_DENSITY_VALUES) {
      expect(NUGGET_DENSITY_PRESETS[density].label.length).toBeGreaterThan(0);
      expect(NUGGET_DENSITY_PRESETS[density].description.length).toBeGreaterThan(0);
    }
  });
});

describe('getNuggetDensityPreset', () => {
  it('resolves through to a preset', () => {
    expect(getNuggetDensityPreset('terse').maxNotesPerCycle).toBe(1);
    expect(getNuggetDensityPreset('nonsense')).toBe(NUGGET_DENSITY_PRESETS[DEFAULT_NUGGET_DENSITY]);
  });
});
