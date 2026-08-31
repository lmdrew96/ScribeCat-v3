/**
 * Wall-clock bookkeeping for the recording timer.
 *
 * Kept pure and separate from the recorder hook for two reasons: the elapsed
 * time must be derived from timestamps rather than counted ticks (browsers
 * throttle timers hard for hidden/occluded windows, so a counter drifts), and
 * the pause accounting is exactly the kind of arithmetic that deserves tests.
 *
 * All values are epoch milliseconds; `now` is always passed in so callers can
 * test without faking the clock.
 */
export interface RecordingClock {
  /** When recording began. 0 means "not started". */
  startedAt: number;
  /** When the in-effect pause began, or null while running. */
  pauseStartedAt: number | null;
  /** Total milliseconds spent paused across all completed pauses. */
  totalPausedMs: number;
}

export function createRecordingClock(): RecordingClock {
  return { startedAt: 0, pauseStartedAt: null, totalPausedMs: 0 };
}

export function startClock(now: number): RecordingClock {
  return { startedAt: now, pauseStartedAt: null, totalPausedMs: 0 };
}

/** Freeze the clock. A pause already in effect is left as-is. */
export function pauseClock(clock: RecordingClock, now: number): RecordingClock {
  if (clock.pauseStartedAt !== null) return clock;
  return { ...clock, pauseStartedAt: now };
}

/** Bank the duration of the pause being ended and let the clock run again. */
export function resumeClock(clock: RecordingClock, now: number): RecordingClock {
  if (clock.pauseStartedAt === null) return clock;
  return {
    ...clock,
    pauseStartedAt: null,
    totalPausedMs: clock.totalPausedMs + Math.max(0, now - clock.pauseStartedAt),
  };
}

/**
 * Elapsed recording time, excluding paused spans. While paused, the clock
 * reads from the moment the pause began, so the display holds steady.
 */
export function elapsedMs(clock: RecordingClock, now: number): number {
  if (!clock.startedAt) return 0;
  const at = clock.pauseStartedAt ?? now;
  return Math.max(0, at - clock.startedAt - clock.totalPausedMs);
}

export function elapsedSeconds(clock: RecordingClock, now: number): number {
  return Math.floor(elapsedMs(clock, now) / 1000);
}
