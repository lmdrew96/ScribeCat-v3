import type { CatVariant } from '@/components/study-quest/cat-sprites';

/** Every known variant — party brings the whole crew. */
const VARIANTS: readonly CatVariant[] = [
  'bengal',
  'black',
  'demon',
  'egypt',
  'grey',
  'siamese',
  'tricolor',
  'vampire',
  'white',
  'wizard',
  'xmas',
];

/**
 * Party-vibe animations only — skip sleep/hurt/attack which read as the wrong
 * mood. Sprite strip width varies per animation but since we always show
 * frame 0 at a fixed container size, frame count doesn't matter here.
 */
const PARTY_ANIMATIONS = ['idle', 'idle2', 'jump', 'run', 'sitting'] as const;

const CAT_COUNT = 200;
const SPAWN_INTERVAL_MS = 50;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createFallingCat(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'falling-cat';

  const variant = pick(VARIANTS);
  const animation = pick(PARTY_ANIMATIONS);
  el.style.backgroundImage = `url(/cats/${variant}/${animation}.png)`;

  const left = Math.random() * 100;
  // Random initial tumble; the keyframe unwinds to 0° so they land upright.
  const rotation = Math.floor(Math.random() * 720) - 360;
  const duration = 3 + Math.random() * 2;

  el.style.left = `${left}%`;
  el.style.setProperty('--rotation', `${rotation}deg`);
  el.style.animationDuration = `${duration}s`;

  el.addEventListener(
    'animationend',
    () => {
      el.remove();
    },
    { once: true },
  );

  return el;
}

/**
 * Spawns 200 falling cat sprites, staggered every 50ms, that clean themselves
 * up after their fall animation ends. Each cat picks a random variant + random
 * party-vibe animation and tumbles down to an upright 0° landing.
 */
export function triggerCatParty(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < CAT_COUNT; i++) {
    window.setTimeout(() => {
      document.body.appendChild(createFallingCat());
    }, i * SPAWN_INTERVAL_MS);
  }
}
