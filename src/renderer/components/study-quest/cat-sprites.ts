/**
 * CSS Pixel Art sprites for the StudyQuest cat companion.
 *
 * Each sprite is an array of [x, y, colorKey] tuples on a 16x16 grid.
 * Colors reference CSS custom properties for theme-awareness.
 *
 * Color keys:
 *   body   = var(--primary)           — main fur color
 *   dark   = var(--accent)            — eyes, outlines
 *   nose   = var(--destructive)       — nose
 *   cheek  = blended primary/pink     — blush marks
 *   light  = var(--foreground)        — eye highlights, sparkles
 */

type Pixel = [number, number, string];

export type CatMood = 'idle' | 'happy' | 'studying' | 'sleepy' | 'excited';

// Color mapping: key -> CSS value
export const COLOR_MAP: Record<string, string> = {
  body: 'var(--primary)',
  dark: 'var(--accent)',
  nose: 'var(--destructive)',
  cheek: 'color-mix(in srgb, var(--destructive) 40%, var(--primary))',
  light: 'var(--foreground)',
  bodyDark: 'color-mix(in srgb, var(--primary) 75%, var(--accent))',
  zzz: 'var(--muted-foreground)',
  sparkle: 'var(--primary)',
};

/** Convert pixel array to a CSS box-shadow string. */
export function pixelsToBoxShadow(pixels: Pixel[], scale: number): string {
  return pixels
    .map(([x, y, colorKey]) => {
      const color = COLOR_MAP[colorKey] ?? 'var(--foreground)';
      return `${x * scale}px ${y * scale}px 0 ${color}`;
    })
    .join(', ');
}

// ─── Sprite Definitions (16x16 grid) ────────────────────────

// Helper to build symmetric ears + head outline
function baseHead(): Pixel[] {
  return [
    // Left ear
    [3, 0, 'body'],
    [4, 0, 'body'],
    [2, 1, 'body'],
    [3, 1, 'body'],
    [4, 1, 'body'],
    [2, 2, 'body'],
    [3, 2, 'body'],
    [4, 2, 'body'],
    // Right ear
    [11, 0, 'body'],
    [12, 0, 'body'],
    [11, 1, 'body'],
    [12, 1, 'body'],
    [13, 1, 'body'],
    [11, 2, 'body'],
    [12, 2, 'body'],
    [13, 2, 'body'],
    // Head fill rows 3-9
    [3, 3, 'body'],
    [4, 3, 'body'],
    [5, 3, 'body'],
    [6, 3, 'body'],
    [7, 3, 'body'],
    [8, 3, 'body'],
    [9, 3, 'body'],
    [10, 3, 'body'],
    [11, 3, 'body'],
    [12, 3, 'body'],
    [2, 4, 'body'],
    [3, 4, 'body'],
    [4, 4, 'body'],
    [5, 4, 'body'],
    [6, 4, 'body'],
    [7, 4, 'body'],
    [8, 4, 'body'],
    [9, 4, 'body'],
    [10, 4, 'body'],
    [11, 4, 'body'],
    [12, 4, 'body'],
    [13, 4, 'body'],
    // Row 5 (eye row top)
    [2, 5, 'body'],
    [3, 5, 'body'],
    [6, 5, 'body'],
    [7, 5, 'body'],
    [8, 5, 'body'],
    [9, 5, 'body'],
    [12, 5, 'body'],
    [13, 5, 'body'],
    // Row 6 (eye row bottom)
    [2, 6, 'body'],
    [3, 6, 'body'],
    [6, 6, 'body'],
    [7, 6, 'body'],
    [8, 6, 'body'],
    [9, 6, 'body'],
    [12, 6, 'body'],
    [13, 6, 'body'],
    // Row 7 (nose row)
    [3, 7, 'body'],
    [4, 7, 'body'],
    [5, 7, 'body'],
    [6, 7, 'body'],
    [8, 7, 'body'],
    [9, 7, 'body'],
    [10, 7, 'body'],
    [11, 7, 'body'],
    [12, 7, 'body'],
    // Row 8 (cheek row)
    [3, 8, 'body'],
    [5, 8, 'body'],
    [6, 8, 'body'],
    [7, 8, 'body'],
    [8, 8, 'body'],
    [9, 8, 'body'],
    [10, 8, 'body'],
    [12, 8, 'body'],
    // Row 9 (mouth/chin)
    [4, 9, 'body'],
    [5, 9, 'body'],
    [6, 9, 'body'],
    [7, 9, 'body'],
    [8, 9, 'body'],
    [9, 9, 'body'],
    [10, 9, 'body'],
    [11, 9, 'body'],
  ];
}

function baseEyes(): Pixel[] {
  return [
    // Left eye (2x2)
    [4, 5, 'dark'],
    [5, 5, 'dark'],
    [4, 6, 'dark'],
    [5, 6, 'dark'],
    // Right eye (2x2)
    [10, 5, 'dark'],
    [11, 5, 'dark'],
    [10, 6, 'dark'],
    [11, 6, 'dark'],
    // Eye highlights
    [4, 5, 'light'],
    [10, 5, 'light'],
  ];
}

function baseFace(): Pixel[] {
  return [
    // Nose
    [7, 7, 'nose'],
    // Cheeks
    [4, 8, 'cheek'],
    [11, 8, 'cheek'],
  ];
}

function baseBody(): Pixel[] {
  return [
    // Body rows 10-14
    [5, 10, 'bodyDark'],
    [6, 10, 'bodyDark'],
    [7, 10, 'bodyDark'],
    [8, 10, 'bodyDark'],
    [9, 10, 'bodyDark'],
    [10, 10, 'bodyDark'],
    [4, 11, 'bodyDark'],
    [5, 11, 'bodyDark'],
    [6, 11, 'bodyDark'],
    [7, 11, 'bodyDark'],
    [8, 11, 'bodyDark'],
    [9, 11, 'bodyDark'],
    [10, 11, 'bodyDark'],
    [11, 11, 'bodyDark'],
    [4, 12, 'bodyDark'],
    [5, 12, 'bodyDark'],
    [6, 12, 'bodyDark'],
    [7, 12, 'bodyDark'],
    [8, 12, 'bodyDark'],
    [9, 12, 'bodyDark'],
    [10, 12, 'bodyDark'],
    [11, 12, 'bodyDark'],
    [4, 13, 'bodyDark'],
    [5, 13, 'bodyDark'],
    [6, 13, 'bodyDark'],
    [7, 13, 'bodyDark'],
    [8, 13, 'bodyDark'],
    [9, 13, 'bodyDark'],
    [10, 13, 'bodyDark'],
    [11, 13, 'bodyDark'],
    // Paws
    [3, 14, 'body'],
    [4, 14, 'body'],
    [5, 14, 'body'],
    [10, 14, 'body'],
    [11, 14, 'body'],
    [12, 14, 'body'],
    // Tail
    [12, 13, 'body'],
    [13, 13, 'body'],
    [13, 12, 'body'],
    [14, 12, 'body'],
  ];
}

function fullCat(): Pixel[] {
  return [...baseHead(), ...baseEyes(), ...baseFace(), ...baseBody()];
}

// ─── Idle: gentle breathing (frame 2 = slight squish) ────────

const IDLE_FRAME_1: Pixel[] = fullCat();

const IDLE_FRAME_2: Pixel[] = [
  ...baseHead(),
  ...baseEyes(),
  ...baseFace(),
  // Body shifted down 1 row for "breathing" effect
  [5, 11, 'bodyDark'],
  [6, 11, 'bodyDark'],
  [7, 11, 'bodyDark'],
  [8, 11, 'bodyDark'],
  [9, 11, 'bodyDark'],
  [10, 11, 'bodyDark'],
  [4, 12, 'bodyDark'],
  [5, 12, 'bodyDark'],
  [6, 12, 'bodyDark'],
  [7, 12, 'bodyDark'],
  [8, 12, 'bodyDark'],
  [9, 12, 'bodyDark'],
  [10, 12, 'bodyDark'],
  [11, 12, 'bodyDark'],
  [4, 13, 'bodyDark'],
  [5, 13, 'bodyDark'],
  [6, 13, 'bodyDark'],
  [7, 13, 'bodyDark'],
  [8, 13, 'bodyDark'],
  [9, 13, 'bodyDark'],
  [10, 13, 'bodyDark'],
  [11, 13, 'bodyDark'],
  [4, 14, 'bodyDark'],
  [5, 14, 'bodyDark'],
  [6, 14, 'bodyDark'],
  [7, 14, 'bodyDark'],
  [8, 14, 'bodyDark'],
  [9, 14, 'bodyDark'],
  [10, 14, 'bodyDark'],
  [11, 14, 'bodyDark'],
  // Paws
  [3, 15, 'body'],
  [4, 15, 'body'],
  [5, 15, 'body'],
  [10, 15, 'body'],
  [11, 15, 'body'],
  [12, 15, 'body'],
  // Tail
  [12, 14, 'body'],
  [13, 14, 'body'],
  [13, 13, 'body'],
  [14, 13, 'body'],
];

// ─── Happy: ^_^ eyes ────────────────────────────────────────

function happyEyes(): Pixel[] {
  return [
    // Left eye (upward curve ^)
    [4, 6, 'dark'],
    [5, 5, 'dark'],
    [5, 6, 'dark'],
    // Right eye (upward curve ^)
    [10, 6, 'dark'],
    [10, 5, 'dark'],
    [11, 6, 'dark'],
  ];
}

const HAPPY_FRAME_1: Pixel[] = [...baseHead(), ...happyEyes(), ...baseFace(), ...baseBody()];

const HAPPY_FRAME_2: Pixel[] = [
  ...baseHead(),
  ...happyEyes(),
  // Wider smile cheeks
  [7, 7, 'nose'],
  [3, 8, 'cheek'],
  [4, 8, 'cheek'],
  [11, 8, 'cheek'],
  [12, 8, 'cheek'],
  [3, 8, 'body'],
  [5, 8, 'body'],
  [6, 8, 'body'],
  [7, 8, 'body'],
  [8, 8, 'body'],
  [9, 8, 'body'],
  [10, 8, 'body'],
  [12, 8, 'body'],
  [4, 9, 'body'],
  [5, 9, 'body'],
  [6, 9, 'body'],
  [7, 9, 'body'],
  [8, 9, 'body'],
  [9, 9, 'body'],
  [10, 9, 'body'],
  [11, 9, 'body'],
  ...baseBody(),
];

// ─── Studying: glasses pixels + focused look ─────────────────

function studyingEyes(): Pixel[] {
  return [
    // Eyes (focused, slightly narrowed)
    [4, 5, 'dark'],
    [5, 5, 'dark'],
    [4, 6, 'dark'],
    [5, 6, 'dark'],
    [10, 5, 'dark'],
    [11, 5, 'dark'],
    [10, 6, 'dark'],
    [11, 6, 'dark'],
    // Eye highlights
    [4, 5, 'light'],
    [10, 5, 'light'],
    // Glasses frames
    [3, 5, 'dark'],
    [6, 5, 'dark'],
    [3, 6, 'dark'],
    [6, 6, 'dark'],
    [9, 5, 'dark'],
    [12, 5, 'dark'],
    [9, 6, 'dark'],
    [12, 6, 'dark'],
    // Bridge
    [7, 5, 'dark'],
    [8, 5, 'dark'],
  ];
}

const STUDYING_FRAME_1: Pixel[] = [...baseHead(), ...studyingEyes(), ...baseFace(), ...baseBody()];

const STUDYING_FRAME_2: Pixel[] = [
  ...baseHead(),
  ...studyingEyes(),
  ...baseFace(),
  // Body with slight lean (shift 1px right for some rows)
  [6, 10, 'bodyDark'],
  [7, 10, 'bodyDark'],
  [8, 10, 'bodyDark'],
  [9, 10, 'bodyDark'],
  [10, 10, 'bodyDark'],
  [11, 10, 'bodyDark'],
  [5, 11, 'bodyDark'],
  [6, 11, 'bodyDark'],
  [7, 11, 'bodyDark'],
  [8, 11, 'bodyDark'],
  [9, 11, 'bodyDark'],
  [10, 11, 'bodyDark'],
  [11, 11, 'bodyDark'],
  [12, 11, 'bodyDark'],
  [5, 12, 'bodyDark'],
  [6, 12, 'bodyDark'],
  [7, 12, 'bodyDark'],
  [8, 12, 'bodyDark'],
  [9, 12, 'bodyDark'],
  [10, 12, 'bodyDark'],
  [11, 12, 'bodyDark'],
  [12, 12, 'bodyDark'],
  [5, 13, 'bodyDark'],
  [6, 13, 'bodyDark'],
  [7, 13, 'bodyDark'],
  [8, 13, 'bodyDark'],
  [9, 13, 'bodyDark'],
  [10, 13, 'bodyDark'],
  [11, 13, 'bodyDark'],
  [12, 13, 'bodyDark'],
  // Paws
  [4, 14, 'body'],
  [5, 14, 'body'],
  [6, 14, 'body'],
  [11, 14, 'body'],
  [12, 14, 'body'],
  [13, 14, 'body'],
  // Tail
  [13, 13, 'body'],
  [14, 13, 'body'],
  [14, 12, 'body'],
  [15, 12, 'body'],
];

// ─── Sleepy: half-closed eyes + zzz ─────────────────────────

function sleepyEyes(): Pixel[] {
  return [
    // Left eye (horizontal line = half-closed)
    [4, 6, 'dark'],
    [5, 6, 'dark'],
    // Right eye (horizontal line = half-closed)
    [10, 6, 'dark'],
    [11, 6, 'dark'],
  ];
}

const SLEEPY_FRAME_1: Pixel[] = [...baseHead(), ...sleepyEyes(), ...baseFace(), ...baseBody()];

const SLEEPY_FRAME_2: Pixel[] = [
  ...baseHead(),
  ...sleepyEyes(),
  ...baseFace(),
  ...baseBody(),
  // Zzz floating above
  [13, 1, 'zzz'],
  [14, 0, 'zzz'],
  [15, 0, 'zzz'],
  [14, 1, 'zzz'],
];

// ─── Excited: sparkles + jump ────────────────────────────────

const EXCITED_FRAME_1: Pixel[] = [
  // Shift entire cat up 1px for jump effect
  ...baseHead().map(([x, y, c]) => [x, y - 1, c] as Pixel),
  ...happyEyes().map(([x, y, c]) => [x, y - 1, c] as Pixel),
  ...baseFace().map(([x, y, c]) => [x, y - 1, c] as Pixel),
  ...baseBody().map(([x, y, c]) => [x, y - 1, c] as Pixel),
  // Sparkles around head
  [0, 2, 'sparkle'],
  [1, 3, 'sparkle'],
  [14, 2, 'sparkle'],
  [15, 3, 'sparkle'],
];

const EXCITED_FRAME_2: Pixel[] = [
  ...baseHead(),
  ...happyEyes(),
  ...baseFace(),
  ...baseBody(),
  // Different sparkle positions
  [1, 1, 'sparkle'],
  [0, 4, 'sparkle'],
  [15, 1, 'sparkle'],
  [14, 4, 'sparkle'],
];

// ─── Export sprite frames by mood ────────────────────────────

export const CAT_SPRITES: Record<CatMood, [Pixel[], Pixel[]]> = {
  idle: [IDLE_FRAME_1, IDLE_FRAME_2],
  happy: [HAPPY_FRAME_1, HAPPY_FRAME_2],
  studying: [STUDYING_FRAME_1, STUDYING_FRAME_2],
  sleepy: [SLEEPY_FRAME_1, SLEEPY_FRAME_2],
  excited: [EXCITED_FRAME_1, EXCITED_FRAME_2],
};

/** Animation frame duration (ms) per mood */
export const MOOD_FRAME_DURATION: Record<CatMood, number> = {
  idle: 3000,
  happy: 1500,
  studying: 4000,
  sleepy: 5000,
  excited: 500,
};
