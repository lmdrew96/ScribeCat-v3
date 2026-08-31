import { describe, expect, it } from 'vitest';
import {
  createRecordingClock,
  elapsedMs,
  elapsedSeconds,
  pauseClock,
  resumeClock,
  startClock,
} from '../src/renderer/lib/recording-clock';

// A realistic epoch timestamp — the original bug only showed up at this
// magnitude, because it subtracted a full epoch timestamp from the elapsed
// time and produced a huge negative number.
const T0 = 1_772_000_000_000;

describe('recording clock', () => {
  it('reports zero before recording starts', () => {
    expect(elapsedMs(createRecordingClock(), T0)).toBe(0);
  });

  it('counts wall-clock time while running', () => {
    const clock = startClock(T0);
    expect(elapsedSeconds(clock, T0 + 5_000)).toBe(5);
    expect(elapsedSeconds(clock, T0 + 90_000)).toBe(90);
  });

  it('stays accurate across a long gap when the tick is throttled', () => {
    // Safari throttles timers to a crawl for an occluded window. Because the
    // clock is timestamp-derived, the first tick after returning reads the
    // true elapsed value rather than however many ticks were delivered.
    const clock = startClock(T0);
    expect(elapsedSeconds(clock, T0 + 20 * 60_000)).toBe(1200);
  });

  it('freezes while paused', () => {
    const clock = pauseClock(startClock(T0), T0 + 60_000);
    expect(elapsedSeconds(clock, T0 + 60_000)).toBe(60);
    // Five more minutes pass while paused — the display must not advance.
    expect(elapsedSeconds(clock, T0 + 360_000)).toBe(60);
  });

  it('never reports a negative time after a pause (regression: issue #4)', () => {
    // The original code stored an absolute timestamp in the same field it
    // subtracted as "accumulated paused ms", so elapsed became roughly
    // -startedAt — rendered as a wildly negative timer.
    const clock = pauseClock(startClock(T0), T0 + 60_000);
    expect(elapsedMs(clock, T0 + 60_000)).toBeGreaterThanOrEqual(0);
    expect(elapsedMs(clock, T0 + 120_000)).toBeGreaterThanOrEqual(0);
  });

  it('excludes paused time after resuming', () => {
    let clock = startClock(T0);
    clock = pauseClock(clock, T0 + 60_000); // 60s recorded
    clock = resumeClock(clock, T0 + 300_000); // paused for 4 minutes
    expect(elapsedSeconds(clock, T0 + 300_000)).toBe(60);
    expect(elapsedSeconds(clock, T0 + 330_000)).toBe(90);
  });

  it('accumulates across repeated pause/resume cycles', () => {
    let clock = startClock(T0);
    clock = pauseClock(clock, T0 + 10_000);
    clock = resumeClock(clock, T0 + 20_000); // 10s paused
    clock = pauseClock(clock, T0 + 30_000); // 20s recorded
    clock = resumeClock(clock, T0 + 45_000); // 15s more paused (25s total)
    expect(elapsedSeconds(clock, T0 + 45_000)).toBe(20);
    expect(elapsedSeconds(clock, T0 + 65_000)).toBe(40);
  });

  it('ignores a redundant pause or resume', () => {
    let clock = pauseClock(startClock(T0), T0 + 10_000);
    clock = pauseClock(clock, T0 + 20_000); // already paused — no-op
    expect(elapsedSeconds(clock, T0 + 30_000)).toBe(10);

    clock = resumeClock(clock, T0 + 30_000); // 20s paused
    const afterResume = resumeClock(clock, T0 + 40_000); // not paused — no-op
    expect(afterResume).toEqual(clock);
    expect(elapsedSeconds(afterResume, T0 + 40_000)).toBe(20);
  });

  it('resets to zero for the next recording', () => {
    const clock = createRecordingClock();
    expect(elapsedSeconds(clock, T0 + 999_999)).toBe(0);
  });
});
