/**
 * Web Audio API notification sound generator.
 * All tones are synthesized — no audio files required.
 * AudioContext is created lazily on first use (browser requires prior user gesture).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gain = 0.18,
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Smooth attack + decay envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/** Short soft ping — for new messages. */
export function playMessageSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playTone(ctx, 660, now, 0.18);
}

/** Two-note ascending chime — for friend requests. */
export function playFriendRequestSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  // C5 (523 Hz) → E5 (659 Hz)
  playTone(ctx, 523, now, 0.15);
  playTone(ctx, 659, now + 0.14, 0.2);
}

/** Ascending three-note arpeggio — for cat level-up. */
export function playLevelUpSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  // C5 → E5 → G5
  playTone(ctx, 523, now, 0.12);
  playTone(ctx, 659, now + 0.12, 0.12);
  playTone(ctx, 784, now + 0.24, 0.22, 0.22);
}

/** Preview all three sounds in sequence (for settings). */
export function previewAllSounds(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Message ping
  playTone(ctx, 660, now, 0.18);

  // Friend request chime
  playTone(ctx, 523, now + 0.5, 0.15);
  playTone(ctx, 659, now + 0.64, 0.2);

  // Level-up arpeggio
  playTone(ctx, 523, now + 1.1, 0.12);
  playTone(ctx, 659, now + 1.22, 0.12);
  playTone(ctx, 784, now + 1.34, 0.22, 0.22);
}
