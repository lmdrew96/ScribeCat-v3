/**
 * Sprite sheet configuration for the StudyQuest cat companion.
 *
 * All sprites are 32x32 pixel art frames in horizontal strip PNGs.
 * Stored in public/cats/{variant}/{animation}.png
 *
 * 11 cat variants, 8 animations each.
 */

export type CatMood = 'idle' | 'happy' | 'studying' | 'sleepy' | 'excited';

export type CatVariant =
  | 'bengal'
  | 'black'
  | 'demon'
  | 'egypt'
  | 'grey'
  | 'siamese'
  | 'tricolor'
  | 'vampire'
  | 'white'
  | 'wizard'
  | 'xmas';

export const CAT_VARIANTS: { id: CatVariant; label: string }[] = [
  { id: 'grey', label: 'Grey' },
  { id: 'bengal', label: 'Bengal' },
  { id: 'black', label: 'Black' },
  { id: 'siamese', label: 'Siamese' },
  { id: 'tricolor', label: 'Tricolor' },
  { id: 'white', label: 'White' },
  { id: 'egypt', label: 'Egyptian' },
  { id: 'demon', label: 'Demon' },
  { id: 'vampire', label: 'Vampire' },
  { id: 'wizard', label: 'Wizard' },
  { id: 'xmas', label: 'Holiday' },
];

/** Sprite animation type — maps to a PNG file per variant */
type SpriteAnimation = 'idle' | 'idle2' | 'sleep' | 'sitting' | 'run' | 'jump' | 'attack' | 'hurt';

interface SpriteConfig {
  frameCount: number;
  /** Milliseconds per frame */
  frameDuration: number;
  /** Native frame size in px (all are 32 except wizard attack/jump at 64) */
  frameSize: number;
}

/** Frame counts and timing for each animation type */
export const SPRITE_CONFIG: Record<SpriteAnimation, SpriteConfig> = {
  idle: { frameCount: 7, frameDuration: 150, frameSize: 32 },
  idle2: { frameCount: 14, frameDuration: 100, frameSize: 32 },
  sleep: { frameCount: 3, frameDuration: 600, frameSize: 32 },
  sitting: { frameCount: 3, frameDuration: 500, frameSize: 32 },
  run: { frameCount: 7, frameDuration: 100, frameSize: 32 },
  jump: { frameCount: 13, frameDuration: 80, frameSize: 32 },
  attack: { frameCount: 9, frameDuration: 100, frameSize: 32 },
  hurt: { frameCount: 7, frameDuration: 120, frameSize: 32 },
};

/** Map each mood to its sprite animation */
export const MOOD_TO_SPRITE: Record<CatMood, SpriteAnimation> = {
  idle: 'idle',
  happy: 'idle2',
  studying: 'sitting',
  sleepy: 'sleep',
  excited: 'run',
};

/** Get the sprite sheet URL for a variant + animation */
export function getSpriteUrl(variant: CatVariant, animation: SpriteAnimation): string {
  return `/cats/${variant}/${animation}.png`;
}

/** Get the sprite config for a mood */
export function getMoodConfig(mood: CatMood): SpriteConfig {
  return SPRITE_CONFIG[MOOD_TO_SPRITE[mood]];
}
