import { describe, expect, it } from 'vitest';
import { formatRecordingTime } from '../src/renderer/lib/format-time';

describe('formatRecordingTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatRecordingTime(0)).toBe('0:00');
    expect(formatRecordingTime(7)).toBe('0:07');
    expect(formatRecordingTime(60)).toBe('1:00');
    expect(formatRecordingTime(184)).toBe('3:04');
    expect(formatRecordingTime(3661)).toBe('61:01');
  });

  it('floors fractional seconds rather than rounding up', () => {
    expect(formatRecordingTime(59.9)).toBe('0:59');
  });

  it('treats a note timestamp as seconds, not milliseconds', () => {
    // The regression: exam-session-viewer passed recordingTime / 1000, so a
    // note five minutes in rendered as 0:00. recordingTime is seconds.
    expect(formatRecordingTime(300)).toBe('5:00');
    expect(formatRecordingTime(300 / 1000)).toBe('0:00');
  });

  it('degrades to 0:00 on negative or non-finite input', () => {
    expect(formatRecordingTime(-5)).toBe('0:00');
    expect(formatRecordingTime(Number.NaN)).toBe('0:00');
    // Audio duration reads as Infinity before metadata loads on some browsers.
    expect(formatRecordingTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});
